import {
  AdditiveBlending,
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
import { CHECKPOINTS, type JourneyState } from './journey';

const assets = new Map<string, Texture>();
export class JourneyRenderer {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(36, 1, 0.01, 500);
  private object = new Group();
  private sky: Points;
  private body?: Mesh;
  private clouds?: Mesh;
  private holeScene = new Scene();
  private holeCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private hole: ShaderMaterial;
  private index = -1;
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
    this.scene.add(new AmbientLight('#adc5df', 0.18));
    const sun = new DirectionalLight('#fff2df', 3.5);
    sun.position.set(-4, 2, 5);
    this.scene.add(sun);
    this.scene.add(this.object);
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
    texture.colorSpace = SRGBColorSpace;
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
    this.index = index;
    this.clear();
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
            time: { value: 0 },
          },
          vertexShader: `varying vec2 vUv;varying vec3 n;varying vec3 eye;void main(){vUv=uv;n=normalize(mat3(modelMatrix)*normal);eye=cameraPosition-(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
          fragmentShader: `uniform sampler2D day;uniform sampler2D night;varying vec2 vUv;varying vec3 n;varying vec3 eye;void main(){vec3 N=normalize(n),L=normalize(vec3(-4.,2.,5.));float d=dot(N,L);vec3 c=texture2D(day,vUv).rgb*(.025+max(d,0.)*1.05);c+=texture2D(night,vUv).rgb*(1.-smoothstep(-.15,.12,d))*.7;float rim=pow(1.-max(dot(N,normalize(eye)),0.),3.);c+=vec3(.03,.22,.4)*rim*max(d+.4,0.);gl_FragColor=vec4(c,1.);}`,
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
          new SphereGeometry(p.kind === 'star' ? 1.12 : 1.035, 64, 32),
          new ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
            side: DoubleSide,
            uniforms: {
              tint: {
                value: new Color(p.kind === 'star' ? p.color : '#329eff'),
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
            fragmentShader: `varying vec3 p;void main(){float r=length(p.xy);float bands=.55+.15*sin(r*160.)+.1*sin(r*345.);float gap=1.-smoothstep(.015,.03,abs(r-1.8));float a=bands*(1.-gap*.9);gl_FragColor=vec4(vec3(.75,.66,.49)*(.8+.2*sin(r*40.)),a);}`,
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
    const next = CHECKPOINTS[index + 1];
    if (next?.texture) this.loadTexture(next.texture);
  }
  resize() {
    const width = innerWidth,
      height = innerHeight;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75) * this.scale);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.hole.uniforms.uResolution.value.copy(
      this.renderer.getDrawingBufferSize(new Vector2()),
    );
  }
  render(s: JourneyState, time: number) {
    if (this.index !== s.index) this.setCheckpoint(s.index);
    const p = CHECKPOINTS[s.index];
    const mobile = innerWidth < 760;
    if (p.kind === 'interior' || (s.index >= 19 && s.bhRadius <= 1)) {
      this.renderer.setClearColor('#010204');
      this.renderer.clear();
    } else if (p.kind === 'blackhole') {
      const r = Math.max(1.001, s.bhRadius);
      const az = time * 0.012,
        elev = 0.08;
      const pos = new Vector3(
          Math.sin(az) * Math.cos(elev) * r,
          Math.sin(elev) * r,
          Math.cos(az) * Math.cos(elev) * r,
        ),
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
      u.uTanHalfFov.value = mobile ? 0.7 : 0.5;
      u.uStepScale.value = r < 4 ? 0.7 : 1;
      this.renderer.render(this.holeScene, this.holeCamera);
    } else {
      this.renderer.setClearColor('#020609');
      const transit = s.transition;
      // Normalized local world: globe radius=1. Earth camera starts at (R+20,000)/R.
      const base = p.radius
        ? 1 + p.range / p.radius
        : p.kind === 'field'
          ? 7
          : 6;
      const arrival = s.index > 0 ? (1 - smooth(s.local / 0.15)) * 9 : 0;
      const z = base + transit * 9 + arrival;
      this.object.position.set(
        -Math.sin(transit * Math.PI) * 4,
        0,
        -transit * 8,
      );
      this.object.scale.setScalar(1);
      this.camera.position.set(0, 0, z);
      this.camera.fov = mobile ? 85 : 36;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(0, 0, 0);
      this.camera.setViewOffset(
        innerWidth,
        innerHeight,
        mobile ? 0 : -innerWidth * 0.05,
        mobile ? innerHeight * 0.23 : 0,
        innerWidth,
        innerHeight,
      );
      if (p.id === 'earth' && transit > 0) {
        const turn = smooth(s.transition);
        this.camera.rotation.y += Math.PI * turn;
      }
      if (this.body) this.body.rotation.y = (time * Math.PI * 2) / 120;
      if (this.clouds) this.clouds.rotation.y = (time * Math.PI * 2) / 140;
      if (this.field) this.field.rotation.y = time * 0.015;
      this.sky.rotation.y = time * 0.0008 + transit * 0.18;
      this.renderer.render(this.scene, this.camera);
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
    this.clear();
    this.sky.geometry.dispose();
    (this.sky.material as PointsMaterial).dispose();
    this.hole.dispose();
    assets.forEach((t) => t.dispose());
    assets.clear();
    this.renderer.dispose();
  }
}
