import {
  AdditiveBlending,
  BackSide,
  NoColorSpace,
  LineSegments,
  AmbientLight,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  BoxGeometry,
} from 'three';
import { smooth } from './science';
import { CHECKPOINTS } from './journey';
import { SPACING, type FlightState } from './flight';
import { ASSETS, residentAssets, residentStops } from './assets';
import {
  RING_INNER,
  RING_OUTER,
  cloudShellMaterial,
  earthMaterial,
  ringMaterial,
  rimMaterial,
  saturnBodyMaterial,
  setRimUnlit,
  sunMaterial,
} from './planet-materials';

const assets = new Map<string, Texture>();
/** World-space directions towards the Sun for the Earth stop and every later stop. */
const SUN_FROM_FRONT = new Vector3(-4, 3, 5).normalize();
const SUN_FROM_BEHIND = new Vector3(-4, 3, -5).normalize();
export class JourneyRenderer {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(36, 1, 0.01, 500);
  private object = new Group();
  private sky: Points;
  private sun!: DirectionalLight;
  private body?: Mesh;
  private clouds?: Mesh;
  private ring?: Mesh;
  private scratch = new Matrix4();
  private nodes = new Map<
    number,
    {
      group: Group;
      body?: Mesh;
      clouds?: Mesh;
      ring?: Mesh;
      field?: Points;
      proxy: Points;
    }
  >();
  private warpField!: LineSegments;
  private warpMaterial!: ShaderMaterial;
  private background!: Mesh;
  diagnostics = {
    loaded: [] as number[],
    warp: 0,
    pending: 0,
    camera: [0, 0, 0] as number[],
    yaw: 0,
    nodeIds: {} as Record<number, string>,
    target: { x: 0, y: 0, visible: false },
  };
  private scale = 0.85;
  private last = 0;
  private spinTime = 0;
  private spinRate = 1;
  private slow = 0;
  private loader = new TextureLoader();
  private field?: Points;
  frames = 0;
  textureFailures = 0;
  /** Textures requested but not yet decoded; acceptance checks wait for zero. */
  pendingTextures = 0;
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
    this.loadTexture('earth');
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
  private loadTexture(name: string) {
    if (assets.has(name)) return assets.get(name)!;
    const spec = ASSETS[name];
    this.pendingTextures++;
    const texture = this.loader.load(
      `/textures/${name}.${spec.ext}`,
      () => {
        this.pendingTextures--;
        document.documentElement.dataset.textures = 'ready';
      },
      undefined,
      () => {
        this.pendingTextures--;
        // Reserved for load failures: a flat placeholder keeps the scene alive.
        this.textureFailures++;
        document.documentElement.dataset.textureFallback = 'true';
        const fallback = document.createElement('canvas');
        fallback.width = 4;
        fallback.height = 2;
        const ctx = fallback.getContext('2d')!;
        ctx.fillStyle = spec.fallback;
        ctx.fillRect(0, 0, 4, 2);
        (texture.source as { data: unknown }).data = fallback;
        texture.needsUpdate = true;
      },
    );
    texture.colorSpace = spec.linear ? NoColorSpace : SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    assets.set(name, texture);
    return texture;
  }
  /** Dispose textures no resident stop needs; shared ones survive. */
  private releaseUnusedTextures(leg: number) {
    const keep = residentAssets(leg);
    for (const [name, texture] of assets)
      if (!keep.has(name)) {
        texture.dispose();
        assets.delete(name);
      }
  }
  /** Adaptive-quality hook (EH-06): scales the render resolution without touching flight state. */
  setQuality(scale: number) {
    this.scale = Math.max(0.35, Math.min(1, scale));
    this.resize();
  }
  get quality() {
    return this.scale;
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
    this.ring = undefined;
    this.field = undefined;
  }
  private setCheckpoint(index: number) {
    if (this.nodes.has(index)) return;
    this.object = new Group();
    this.body = undefined;
    this.clouds = undefined;
    this.ring = undefined;
    this.field = undefined;
    this.scene.add(this.object);
    const p = CHECKPOINTS[index];
    if (p.kind === 'planet' || p.kind === 'star') {
      const tex = (name: string) => this.loadTexture(name);
      let mat: Material;
      if (p.id === 'earth') {
        mat = earthMaterial({
          day: tex('earth'),
          night: tex('night'),
          clouds: tex('clouds'),
          normal: tex('earth-normal'),
          ocean: tex('earth-specular'),
        });
      } else if (p.kind === 'star') {
        mat = sunMaterial(tex('sun'));
      } else if (p.id === 'saturn') {
        mat = saturnBodyMaterial(tex('saturn'), tex('saturn-rings'));
      } else {
        const map = p.texture ? tex(p.texture) : null;
        const rocky = ['moon', 'mercury', 'mars'].includes(p.id);
        mat = new MeshStandardMaterial({
          color: map ? '#ffffff' : p.color,
          roughness: rocky ? 0.97 : 1,
          map,
          // Imagery doubles as a height proxy so craters and ridges catch directional light.
          bumpMap: rocky ? map : null,
          bumpScale: rocky ? (p.id === 'mars' ? 3 : 6) : 0,
        });
      }
      this.body = new Mesh(new SphereGeometry(1, 128, 64), mat);
      this.body.rotation.y = (p.id.length * 1.7) % 6; // varies the initial longitude per world
      if (p.id === 'earth') {
        this.clouds = new Mesh(
          new SphereGeometry(1.012, 96, 48),
          cloudShellMaterial(tex('clouds')),
        );
        this.clouds.renderOrder = 2;
        this.object.add(this.clouds);
      }
      // Axial tilt (degrees). Saturn is additionally pitched towards the camera so the
      // ring plane is open rather than edge-on at the canonical viewpoint.
      const tilt: Record<string, number> = {
        earth: 23.44,
        moon: 6.68,
        mercury: 0.03,
        venus: 177.36,
        sun: 7.25,
        mars: 25.19,
        jupiter: 3.13,
        saturn: 26.73,
        uranus: 97.77,
        neptune: 28.32,
      };
      this.object.rotation.z = ((tilt[p.id] ?? 0) * Math.PI) / 180;
      if (p.id === 'saturn') this.object.rotation.x = 0.42;
      this.object.add(this.body);
      const rimSpec: Record<string, [string, number, number, boolean?]> = {
        earth: ['#5bafff', 3.2, 0.5],
        venus: ['#ffd9a0', 3, 0.42],
        mars: ['#d99a76', 4, 0.18],
        jupiter: ['#e8c9a0', 4, 0.2],
        saturn: ['#f0dcae', 4, 0.2],
        uranus: ['#bff3f5', 3.5, 0.3],
        neptune: ['#6f9bff', 3.5, 0.32],
        sun: [p.color, 3, 0.3, true],
      };
      const rim = rimSpec[p.id];
      if (rim) {
        const rimMat = rimMaterial(rim[0], rim[1], rim[2]);
        if (rim[3]) setRimUnlit(rimMat);
        this.object.add(
          new Mesh(
            new SphereGeometry(p.kind === 'star' ? 1.1 : 1.022, 64, 32),
            rimMat,
          ),
        );
      }
      if (p.id === 'saturn') {
        this.ring = new Mesh(
          new RingGeometry(RING_INNER, RING_OUTER, 256, 1),
          ringMaterial(tex('saturn-rings')),
        );
        this.ring.rotation.x = -Math.PI / 2;
        // Draw after the globe so the near ring crosses it and the far ring is occluded.
        this.ring.renderOrder = 3;
        this.object.add(this.ring);
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
      ring: this.ring,
      field: this.field,
      proxy,
    });
  }
  resize() {
    const width = innerWidth,
      height = innerHeight;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75) * this.scale);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  render(s: FlightState, time: number) {
    const mobile = innerWidth < 760;
    const originZ = s.now * SPACING;
    const leg = Math.min(CHECKPOINTS.length - 1, Math.floor(s.position));
    const resident = residentStops(leg);
    // Earth first: build the active stop, then adjacent stops (preloading their textures).
    for (const i of [...resident].sort(
      (a, b) => Math.abs(a - s.now) - Math.abs(b - s.now),
    ))
      this.setCheckpoint(i);
    let removed = false;
    for (const [i, node] of this.nodes) {
      if (!resident.includes(i)) {
        removed = true;
        this.object = node.group;
        this.clear();
        this.scene.remove(node.group, node.proxy);
        node.proxy.geometry.dispose();
        (node.proxy.material as PointsMaterial).dispose();
        this.nodes.delete(i);
      }
    }
    if (removed) this.releaseUnusedTextures(leg);
    this.camera.fov = s.cameraPose
      ? 40 + s.warp * 8
      : 36 + 24 * smooth(s.position / 0.15);
    if (mobile) this.camera.fov = s.cameraPose ? 100 : 75;
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(s.cameraX, 0, s.cameraZ - originZ);
    this.camera.lookAt(s.cameraX, 0, s.cameraZ - originZ - 10);
    this.camera.rotation.y = -s.yaw;
    if (s.cameraPose) {
      this.camera.position.fromArray(s.cameraPose.position);
      this.camera.position.z -= originZ;
      this.camera.quaternion.fromArray(s.cameraPose.rotation);
    }
    this.camera.setViewOffset(
      innerWidth,
      innerHeight,
      mobile ? 0 : -innerWidth * 0.1,
      mobile ? innerHeight * (s.cameraPose ? 0.24 : 0.23) : 0,
      innerWidth,
      innerHeight,
    );
    this.sky.position.copy(this.camera.position);
    this.background.position.copy(this.camera.position);
    this.background.rotation.y = 0.4 + time * 0.00004;
    const handoff = 0;
    (this.sky.material as PointsMaterial).opacity = 0.45 * (1 - handoff);
    this.background.visible = true;
    this.spinRate +=
      ((s.dragging ? 0 : 1) - this.spinRate) *
      (1 - Math.exp(-Math.max(0, time - this.spinTime) * 5));
    // The stop being approached takes over the light once it dominates the view.
    const litStop = s.cameraPose && s.legProgress > 0.5 ? s.next : s.now;
    const litZ = litStop * SPACING - originZ;
    this.sun.position.set(-4, 3, litZ + (litStop === 0 ? 5 : -5));
    this.sun.target.position.set(0, 0, litZ);
    // Departures stay lit by the departing stop's light until the handover.
    const warpScale = Math.min(1, 0.25 + 0.18 * s.leg);
    for (const [i, node] of this.nodes) {
      node.group.position.set(0, 0, i * SPACING - originZ);
      node.proxy.position.copy(node.group.position);
      const toSun = i === 0 ? SUN_FROM_FRONT : SUN_FROM_BEHIND;
      for (const child of node.group.children) {
        if (child instanceof Mesh && child.material instanceof ShaderMaterial) {
          const u = child.material.uniforms;
          if (u.uLight) u.uLight.value.copy(toSun);
          if (u.uCenter) {
            u.uCenter.value.copy(node.group.position);
            u.uRingNormal.value
              .set(0, 1, 0)
              .applyQuaternion(node.group.quaternion);
          }
        }
      }
      if (node.ring) {
        node.group.updateMatrixWorld(true);
        const inv = this.scratch.copy(node.ring.matrixWorld).invert();
        (node.ring.material as ShaderMaterial).uniforms.uLight.value
          .copy(toSun)
          .transformDirection(inv);
      }
      const dz = Math.abs(i * SPACING - s.cameraZ),
        fade = 1 - smooth((dz - 45) / 45);
      node.group.visible = fade > 0.001;
      node.proxy.visible = fade < 0.999;
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
        // Integrate local spin so releasing a drag cannot jump to a wall-clock angle.
        if (!s.dragging)
          node.body.rotation.y +=
            (Math.min(0.05, Math.max(0, time - this.spinTime)) *
              Math.PI *
              2 *
              this.spinRate) /
            120;
        if (
          node.body.material instanceof ShaderMaterial &&
          node.body.material.uniforms.time
        )
          node.body.material.uniforms.time.value = time;
      }
      if (node.clouds) node.clouds.rotation.y = (time * Math.PI * 2) / 140;
      if (node.field) node.field.rotation.y = time * 0.008;
    }
    this.spinTime = time;
    this.warpField.position.copy(this.camera.position);
    this.warpField.visible = s.position > 0.1;
    this.warpMaterial.uniforms.uWarp.value = s.warp * warpScale;
    this.warpMaterial.uniforms.uTravel.value = s.position;
    this.warpMaterial.uniforms.uDirection.value = s.direction;
    const target = new Vector3(0, 0, s.next * SPACING - originZ).project(
      this.camera,
    );
    this.diagnostics = {
      loaded: [...this.nodes.keys()],
      warp: s.warp,
      pending: this.pendingTextures,
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
    this.renderer.setClearColor('#020609');
    this.renderer.render(this.scene, this.camera);
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
    this.sky.geometry.dispose();
    (this.sky.material as PointsMaterial).dispose();
    assets.forEach((t) => t.dispose());
    assets.clear();
    this.renderer.dispose();
  }
}
