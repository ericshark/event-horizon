import {
  AdditiveBlending,
  BackSide,
  NoColorSpace,
  LineSegments,
  WebGLRenderTarget,
  AmbientLight,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Matrix3,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
  BoxGeometry,
} from 'three';
import { fragmentShader, vertexShader } from './blackhole.glsl';
import { smooth } from './science';
import { CHECKPOINTS } from './journey';
import { SPACING, type FlightState } from './flight';

const assets = new Map<string, Texture>();
export class JourneyRenderer {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(36, 1, 0.01, 500);
  private object = new Group();
  private sky: Points;
  private sun!: DirectionalLight;
  private body?: Mesh;
  private clouds?: Mesh;
  private holeScene = new Scene();
  private holeCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private hole: ShaderMaterial;
  private nodes = new Map<
    number,
    { group: Group; body?: Mesh; clouds?: Mesh; field?: Points; proxy: Points }
  >();
  private warpField!: LineSegments;
  private warpMaterial!: ShaderMaterial;
  private background!: Mesh;
  private holeTarget!: WebGLRenderTarget;
  private overlayScene = new Scene();
  private overlayMaterial!: MeshBasicMaterial;
  diagnostics = {
    loaded: [] as number[],
    warp: 0,
    camera: [0, 0, 0] as number[],
    yaw: 0,
    nodeIds: {} as Record<number, string>,
    target: { x: 0, y: 0, visible: false },
  };
  private scale = 0.85;
  private last = 0;
  private slow = 0;
  private loader = new TextureLoader();
  private field?: Points;
  frames = 0;
  textureFailures = 0;
  private constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.renderer = new WebGLRenderer({
      canvas,
      context: gl,
      antialias: true,
      alpha: false,
    });
    this.renderer.setClearColor('#020609');
    this.scene.add(new AmbientLight('#adc5df', 0.1));
    const sun = (this.sun = new DirectionalLight('#fff2df', 2.5));
    sun.position.set(-4, 2, 5);
    this.scene.add(sun, sun.target);

    const g = new BufferGeometry(),
      pts = [];
    let seed = 1123;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 1700; i++) {
      const y = random() * 2 - 1,
        a = random() * Math.PI * 2,
        r = 70 + random() * 80;
      pts.push(
        Math.cos(a) * Math.sqrt(1 - y * y) * r,
        y * r,
        Math.sin(a) * Math.sqrt(1 - y * y) * r,
      );
    }
    g.setAttribute('position', new Float32BufferAttribute(pts, 3));
    this.sky = new Points(
      g,
      new PointsMaterial({
        color: '#a6c0d4',
        size: 0.075,
        transparent: true,
        opacity: 0.8,
      }),
    );
    this.scene.add(this.sky);
    this.background = new Mesh(
      new SphereGeometry(180, 64, 32),
      new MeshBasicMaterial({
        map: this.loadTexture('stars'),
        side: BackSide,
        color: '#243141',
        depthWrite: false,
      }),
    );
    this.scene.add(this.background);
    const lines = [],
      ends = [];
    let ws = 331;
    const wr = () => {
      ws = (ws * 16807) % 2147483647;
      return ws / 2147483647;
    };
    for (let i = 0; i < 850; i++) {
      const x = (wr() - 0.5) * 150,
        y = (wr() - 0.5) * 110,
        z = wr() * 500;
      for (let end = 0; end < 2; end++) {
        lines.push(x, y, z);
        ends.push(end);
      }
    }
    const wg = new BufferGeometry();
    wg.setAttribute('position', new Float32BufferAttribute(lines, 3));
    wg.setAttribute('aEnd', new Float32BufferAttribute(ends, 1));
    this.warpMaterial = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uWarp: { value: 0 },
        uTravel: { value: 0 },
        uDirection: { value: 1 },
      },
      vertexShader: `attribute float aEnd;uniform float uWarp;uniform float uTravel;uniform float uDirection;varying float alpha;void main(){float z=mod(position.z-uTravel*240.,500.)+3.;vec3 p=vec3(position.xy,z+aEnd*uWarp*65.*uDirection);alpha=(1.-aEnd*.6)*uWarp;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: `varying float alpha;void main(){gl_FragColor=vec4(.65,.82,1.,alpha*.7);}`,
    });
    this.warpField = new LineSegments(wg, this.warpMaterial);
    this.warpField.frustumCulled = false;
    this.warpField.renderOrder = 10;
    this.scene.add(this.warpField);
    this.holeTarget = new WebGLRenderTarget(1, 1, { depthBuffer: false });
    this.overlayMaterial = new MeshBasicMaterial({
      map: this.holeTarget.texture,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    this.overlayScene.add(
      new Mesh(new PlaneGeometry(2, 2), this.overlayMaterial),
    );
    this.hole = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uResolution: { value: new Vector2() },
        uTime: { value: 0 },
        uCamPos: { value: new Vector3() },
        uCamBasis: { value: new Matrix3() },
        uTanHalfFov: { value: 0.4 },
        uTitle: { value: null },
        uTitleSize: { value: new Vector2(1, 1) },
        uTitleOpacity: { value: 0 },
        uLensPos: { value: new Vector3() },
        uLensMass: { value: 0 },
        uWhiteout: { value: 0 },
        uInvert: { value: 0 },
        uStepScale: { value: 1 },
      },
    });
    this.holeScene.add(new Mesh(new PlaneGeometry(2, 2), this.hole));
    this.loadTexture('earth');
    this.loadTexture('night', 'png');
    this.loadTexture('clouds', 'png');
    this.resize();
  }
  static create(canvas: HTMLCanvasElement) {
    try {
      const gl = canvas.getContext('webgl2', {
        antialias: true,
        powerPreference: 'high-performance',
      });
      return gl ? new JourneyRenderer(canvas, gl) : null;
    } catch {
      return null;
    }
  }
  private loadTexture(name: string, ext = 'jpg') {
    if (assets.has(name)) return assets.get(name)!;
    const texture = this.loader.load(
      `/textures/${name}.${ext}`,
      () => {
        document.documentElement.dataset.textures = 'ready';
      },
      undefined,
      () => {
        this.textureFailures++;
        document.documentElement.dataset.textureFallback = 'true';
        const fallback = document.createElement('canvas');
        fallback.width = 4;
        fallback.height = 2;
        const ctx = fallback.getContext('2d')!;
        ctx.fillStyle =
          name === 'earth'
            ? '#27618e'
            : name === 'night'
              ? '#000000'
              : '#b1b9bb';
        ctx.fillRect(0, 0, 4, 2);
        (texture.source as { data: unknown }).data = fallback;
        texture.needsUpdate = true;
      },
    );
    texture.colorSpace =
      name === 'earth-normal' ? NoColorSpace : SRGBColorSpace;
    assets.set(name, texture);
    return texture;
  }
  private clear() {
    this.object.traverse((child) => {
      if (child instanceof Mesh || child instanceof Points) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((m) => m.dispose());
      }
    });
    this.object.clear();
    this.body = undefined;
    this.clouds = undefined;
    this.field = undefined;
  }
  private setCheckpoint(index: number) {
    if (this.nodes.has(index)) return;
    this.object = new Group();
    this.body = undefined;
    this.clouds = undefined;
    this.field = undefined;
    this.scene.add(this.object);
    const p = CHECKPOINTS[index];
    if (p.kind === 'planet' || p.kind === 'star') {
      const mat = new MeshStandardMaterial({
        color: p.texture ? '#ffffff' : p.color,
        roughness: 0.95,
        map: p.texture ? this.loadTexture(p.texture) : null,
      });
      if (p.kind === 'star') {
        mat.emissive = new Color(p.color);
        mat.emissiveIntensity = 1.4;
      }
      this.body = new Mesh(new SphereGeometry(1, 80, 48), mat);
      if (p.id === 'earth') {
        const earth = new ShaderMaterial({
          uniforms: {
            day: { value: this.loadTexture('earth') },
            night: { value: this.loadTexture('night', 'png') },
            normalMap: { value: this.loadTexture('earth-normal') },
            oceanMap: { value: this.loadTexture('earth-specular') },
            time: { value: 0 },
            clouds: { value: this.loadTexture('clouds', 'png') },
          },
          vertexShader: `varying vec2 vUv;varying vec3 n;varying vec3 eye;varying vec3 tangent;void main(){float phi=uv.x*6.2831853;tangent=normalize(mat3(modelMatrix)*vec3(sin(phi),0.,cos(phi)));vUv=uv;n=normalize(mat3(modelMatrix)*normal);eye=cameraPosition-(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
          fragmentShader: `uniform sampler2D day;uniform sampler2D night;uniform sampler2D clouds;uniform sampler2D normalMap;uniform sampler2D oceanMap;uniform float time;varying vec2 vUv;varying vec3 n;varying vec3 eye;varying vec3 tangent;void main(){vec3 N=normalize(n),T=normalize(tangent),B=normalize(cross(N,T));vec3 detail=texture2D(normalMap,vUv).rgb*2.-1.;N=normalize(T*detail.x*.3+B*detail.y*.3+N*detail.z);vec3 L=normalize(vec3(-4.,2.,5.));float d=dot(N,L);vec3 surface=texture2D(day,vUv).rgb;float ocean=texture2D(oceanMap,vUv).r;float cloud=texture2D(clouds,vUv+vec2(time*(1./140.-1./120.),0.)).a;vec3 c=surface*(.018+max(d,0.)*1.12)*(1.-cloud*.12);float spec=pow(max(dot(reflect(-L,N),normalize(eye)),0.),60.);c+=vec3(.7,.85,1.)*spec*ocean*.32;c+=texture2D(night,vUv).rgb*(1.-smoothstep(-.15,.12,d))*.7;float rim=pow(1.-max(dot(N,normalize(eye)),0.),3.);c+=vec3(.03,.22,.4)*rim*max(d+.4,0.);gl_FragColor=vec4(c,1.);}`,
        });
        mat.dispose();
        this.body.material = earth;
        const cloudMat = new MeshStandardMaterial({
          map: this.loadTexture('clouds', 'png'),
          transparent: true,
          opacity: 0.58,
          depthWrite: false,
        });
        this.clouds = new Mesh(new SphereGeometry(1.012, 64, 40), cloudMat);
        this.object.add(this.clouds);
        this.object.rotation.z = (23.44 * Math.PI) / 180;
      } else
        this.object.rotation.z =
          ((p.id === 'uranus' ? 97.77 : p.id === 'saturn' ? 26.73 : 3) *
            Math.PI) /
          180;
      this.object.add(this.body);
      if (p.id === 'earth' || p.kind === 'star') {
        const atmosphere = new Mesh(
          new SphereGeometry(p.kind === 'star' ? 1.12 : 1.025, 64, 32),
          new ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
            side: DoubleSide,
            uniforms: {
              tint: {
                value: new Color(p.kind === 'star' ? p.color : '#5bafff'),
              },
            },
            vertexShader: `varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
            fragmentShader: `uniform vec3 tint;varying vec3 n;varying vec3 v;void main(){float f=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(tint,f*.4);}`,
          }),
        );
        this.object.add(atmosphere);
      }
      if (p.id === 'saturn') {
        const ring = new Mesh(
          new RingGeometry(1.25, 2.25, 160),
          new ShaderMaterial({
            side: DoubleSide,
            transparent: true,
            depthWrite: false,
            vertexShader: `varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
            fragmentShader: `varying vec3 p;void main(){float r=length(p.xy);float bands=.55+.15*sin(r*160.)+.1*sin(r*345.);float gap=1.-smoothstep(.015,.03,abs(r-1.8));float a=bands*(1.-gap*.9);vec3 L=normalize(vec3(-.4,.7,1.));float b=dot(p,L);float shadow=step(0.,b*b-dot(p,p)+1.)*step(b,0.);bands*=1.-shadow*.7;gl_FragColor=vec4(vec3(.75,.66,.49)*(.8+.2*sin(r*40.))*(1.-shadow*.7),a);}`,
          }),
        );
        ring.rotation.x = -Math.PI * 0.38;
        this.object.add(ring);
      }
    } else if (p.kind === 'probe') {
      this.object.rotation.set(0.3, -0.4, 0.1);
      const dish = new Mesh(
        new ConeGeometry(0.95, 0.32, 64, 1, true),
        new MeshStandardMaterial({
          color: '#e3e0d1',
          side: DoubleSide,
          metalness: 0.6,
          roughness: 0.4,
        }),
      );
      dish.rotation.x = Math.PI / 2;
      this.object.add(dish);
      const core = new Mesh(
        new BoxGeometry(0.5, 0.35, 0.45),
        new MeshStandardMaterial({
          color: '#b49b4b',
          metalness: 0.8,
          roughness: 0.5,
        }),
      );
      core.position.z = -0.35;
      this.object.add(core);
      for (const [angle, length] of [
        [0, 3.5],
        [2.1, 2.2],
        [4.2, 2.2],
      ]) {
        const boom = new Mesh(
          new CylinderGeometry(0.012, 0.012, length, 8),
          new MeshStandardMaterial({ color: '#c9c8ba' }),
        );
        boom.rotation.z = angle;
        boom.position.set(
          (Math.sin(-angle) * length) / 2,
          (-Math.cos(angle) * length) / 2,
          -0.2,
        );
        this.object.add(boom);
      }
    } else if (p.kind === 'field') {
      const points = [],
        n = p.id === 'oort' ? 420 : 650;
      let seed = 77;
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (let i = 0; i < n; i++) {
        const a = random() * Math.PI * 2,
          r = 1.3 + random() * 1.4,
          y = random() * 2 - 1;
        points.push(
          Math.cos(a) * r,
          p.id === 'oort' ? y * r : y * 0.13,
          Math.sin(a) * r,
        );
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(points, 3));
      this.field = new Points(
        g,
        new PointsMaterial({
          color: p.color,
          size: p.id === 'oort' ? 0.018 : 0.027,
          transparent: true,
          opacity: 0.7,
        }),
      );
      this.object.add(this.field);
      if (p.id === 'heliopause') {
        const shell = new Mesh(
          new SphereGeometry(2.3, 48, 32),
          new MeshBasicMaterial({
            color: p.color,
            wireframe: true,
            transparent: true,
            opacity: 0.08,
          }),
        );
        this.object.add(shell);
      }
    }
    if (p.kind === 'blackhole') {
      const orb = new Mesh(
        new SphereGeometry(1, 32, 20),
        new MeshBasicMaterial({ color: '#030307' }),
      );
      this.object.add(orb);
      const ring = new Mesh(
        new RingGeometry(1.2, 2.1, 64),
        new MeshBasicMaterial({
          color: '#f9c181',
          side: DoubleSide,
          transparent: true,
          opacity: 0.65,
        }),
      );
      ring.rotation.x = 1.2;
      this.object.add(ring);
    }
    const proxyG = new BufferGeometry();
    proxyG.setAttribute('position', new Float32BufferAttribute([0, 0, 0], 3));
    const proxy = new Points(
      proxyG,
      new PointsMaterial({
        color: p.color,
        size: 3,
        sizeAttenuation: false,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      }),
    );
    proxy.frustumCulled = false;
    this.scene.add(proxy);
    this.object.traverse((child) => {
      if (child instanceof Mesh || child instanceof Points) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        for (const m of materials) {
          m.userData.baseOpacity = m.opacity;
          m.transparent = true;
          if (m instanceof ShaderMaterial) {
            m.uniforms.uVisibility = { value: 1 };
            m.fragmentShader =
              'uniform float uVisibility;\n' + m.fragmentShader;
            const at = m.fragmentShader.lastIndexOf('}');
            m.fragmentShader =
              m.fragmentShader.slice(0, at) +
              'gl_FragColor.a *= uVisibility;' +
              m.fragmentShader.slice(at);
          }
        }
      }
    });
    this.nodes.set(index, {
      group: this.object,
      body: this.body,
      clouds: this.clouds,
      field: this.field,
      proxy,
    });
    for (const next of CHECKPOINTS.slice(index + 1, index + 3))
      if (next.texture) this.loadTexture(next.texture);
  }
  resize() {
    const width = innerWidth,
      height = innerHeight;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75) * this.scale);
    this.renderer.setSize(width, height, false);
    this.holeTarget.setSize(
      Math.round(width * Math.min(devicePixelRatio, 1.75) * this.scale),
      Math.round(height * Math.min(devicePixelRatio, 1.75) * this.scale),
    );
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.hole.uniforms.uResolution.value.copy(
      this.renderer.getDrawingBufferSize(new Vector2()),
    );
  }
  render(s: FlightState, time: number) {
    const mobile = innerWidth < 760;
    const leg = Math.min(16, Math.floor(s.position));
    for (let i = Math.max(0, leg - 1); i <= Math.min(16, leg + 2); i++)
      this.setCheckpoint(i);
    for (const [i, node] of this.nodes) {
      if (i < leg - 1 || i > leg + 2) {
        this.object = node.group;
        this.clear();
        this.scene.remove(node.group, node.proxy);
        node.proxy.geometry.dispose();
        (node.proxy.material as PointsMaterial).dispose();
        this.nodes.delete(i);
      }
    }
    this.camera.fov = 36 + 24 * smooth(s.position / 0.15);
    if (mobile) this.camera.fov = 75;
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(s.cameraX, 0, s.cameraZ);
    this.camera.lookAt(s.cameraX, 0, s.cameraZ - 10);
    this.camera.rotation.y = -s.yaw;
    this.camera.setViewOffset(
      innerWidth,
      innerHeight,
      mobile ? 0 : -innerWidth * 0.1,
      mobile ? innerHeight * 0.23 : 0,
      innerWidth,
      innerHeight,
    );
    this.sky.position.copy(this.camera.position);
    this.background.position.copy(this.camera.position);
    this.background.rotation.y = 0.4 + time * 0.00004;
    const handoff = smooth((s.position - 15.6) / 0.4);
    (this.sky.material as PointsMaterial).opacity = 0.45 * (1 - handoff);
    this.background.visible = s.position < 16;
    for (const [i, node] of this.nodes) {
      node.group.position.set(0, 0, i * SPACING);
      node.proxy.position.copy(node.group.position);
      const dz = Math.abs(i * SPACING - s.cameraZ),
        fade = 1 - smooth((dz - 45) / 45);
      node.group.visible = fade > 0.001 && s.position < 16;
      node.proxy.visible = fade < 0.999 && s.position < 16;
      (node.proxy.material as PointsMaterial).opacity =
        (1 - fade) * (1 - handoff);
      node.group.traverse((child) => {
        if (child instanceof Mesh || child instanceof Points) {
          for (const m of Array.isArray(child.material)
            ? child.material
            : [child.material]) {
            m.opacity = m.userData.baseOpacity * fade;
            if (m instanceof ShaderMaterial)
              m.uniforms.uVisibility.value = fade;
          }
        }
      });
      if (node.body) {
        node.body.rotation.y = (time * Math.PI * 2) / 120;
        if (
          node.body.material instanceof ShaderMaterial &&
          node.body.material.uniforms.time
        )
          node.body.material.uniforms.time.value = time;
      }
      if (node.clouds) node.clouds.rotation.y = (time * Math.PI * 2) / 140;
      if (node.field) node.field.rotation.y = time * 0.008;
    }
    this.warpField.position.copy(this.camera.position);
    this.warpField.visible = s.position > 0.1 && s.position < 16;
    this.warpMaterial.uniforms.uWarp.value = s.warp;
    this.warpMaterial.uniforms.uTravel.value = s.position;
    this.warpMaterial.uniforms.uDirection.value = s.direction;
    this.sun.position.set(
      -4,
      3,
      s.position < 0.15 ? s.cameraZ + 10 : s.cameraZ - 10,
    );
    this.sun.target.position.set(0, 0, leg * SPACING);
    const target = new Vector3(0, 0, s.next * SPACING).project(this.camera);
    this.diagnostics = {
      loaded: [...this.nodes.keys()],
      warp: s.warp,
      camera: this.camera.position.toArray(),
      yaw: s.yaw,
      nodeIds: Object.fromEntries(
        [...this.nodes].map(([i, n]) => [i, n.group.uuid]),
      ),
      target: {
        x: (target.x + 1) / 2,
        y: (1 - target.y) / 2,
        visible:
          target.z > -1 &&
          target.z < 1 &&
          Math.abs(target.x) < 0.9 &&
          Math.abs(target.y) < 0.9,
      },
    };
    if (s.position < 16) {
      this.renderer.setClearColor('#020609');
      this.renderer.render(this.scene, this.camera);
    }
    if (s.position > 15.6) {
      const r = Math.max(1.001, s.bhRadius),
        elev = 0.085;
      const pos = new Vector3(0, Math.sin(elev) * r, Math.cos(elev) * r),
        f = pos.clone().negate().normalize(),
        right = new Vector3().crossVectors(f, new Vector3(0, 1, 0)).normalize(),
        up = new Vector3().crossVectors(right, f);
      const u = this.hole.uniforms;
      u.uTime.value = time;
      u.uCamPos.value.copy(pos);
      u.uCamBasis.value.set(
        right.x,
        up.x,
        f.x,
        right.y,
        up.y,
        f.y,
        right.z,
        up.z,
        f.z,
      );
      u.uTanHalfFov.value = mobile ? 0.8 : 0.5;
      u.uStepScale.value = r < 4 ? 0.7 : 1;
      if (s.bhRadius <= 1 && s.position >= 19) {
        this.renderer.setClearColor('#010204');
        this.renderer.clear();
      } else if (s.position >= 16)
        this.renderer.render(this.holeScene, this.holeCamera);
      else {
        this.renderer.setRenderTarget(this.holeTarget);
        this.renderer.render(this.holeScene, this.holeCamera);
        this.renderer.setRenderTarget(null);
        this.overlayMaterial.opacity = handoff;
        this.renderer.autoClear = false;
        this.renderer.render(this.overlayScene, this.holeCamera);
        this.renderer.autoClear = true;
      }
    }
    this.frames++;
    const now = performance.now(),
      dt = this.last ? now - this.last : 16;
    this.last = now;
    if (dt > 50) this.slow++;
    else this.slow = Math.max(0, this.slow - 1);
    if (this.slow > 8 && this.scale > 0.35) {
      this.scale = Math.max(0.35, this.scale - 0.15);
      this.slow = 0;
      this.resize();
    }
  }
  resetTiming() {
    this.last = 0;
    this.slow = 0;
  }
  dispose() {
    for (const n of this.nodes.values()) {
      this.object = n.group;
      this.clear();
      n.proxy.geometry.dispose();
      (n.proxy.material as PointsMaterial).dispose();
    }
    this.nodes.clear();
    this.warpField.geometry.dispose();
    this.warpMaterial.dispose();
    this.background.geometry.dispose();
    (this.background.material as MeshBasicMaterial).dispose();
    this.holeTarget.dispose();
    this.overlayMaterial.dispose();
    this.sky.geometry.dispose();
    (this.sky.material as PointsMaterial).dispose();
    this.hole.dispose();
    assets.forEach((t) => t.dispose());
    assets.clear();
    this.renderer.dispose();
  }
}
