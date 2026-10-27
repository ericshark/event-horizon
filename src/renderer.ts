import {
  CanvasTexture,
  LinearFilter,
  Matrix3,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { fragmentShader, vertexShader } from './blackhole.glsl';
import type { CameraState } from './camera';

const MIN_SCALE = 0.2;
const MAX_SCALE = 1;

export interface FrameInput {
  time: number;
  camera: CameraState;
  lensPosition: Vector3;
  lensMass: number;
  titleOpacity: number;
  whiteout: number;
  invert: number;
}

export class BlackHoleRenderer {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material: ShaderMaterial;
  private titleTexture: CanvasTexture | null = null;
  // Render resolution scale, adjusted by a frame-time governor. Starting low
  // gets a first frame on screen quickly; capable GPUs climb to full scale.
  private scale = 0.4;
  private frameTimes: number[] = [];
  private lastFrame = 0;
  readonly canvas: HTMLCanvasElement;
  frames = 0;

  private constructor(canvas: HTMLCanvasElement, renderer: WebGLRenderer) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uResolution: { value: new Vector2(1, 1) },
        uTime: { value: 0 },
        uCamPos: { value: new Vector3() },
        uCamBasis: { value: new Matrix3() },
        uTanHalfFov: { value: 0.35 },
        uTitle: { value: null },
        uTitleSize: { value: new Vector2(30, 7.5) },
        uTitleOpacity: { value: 1 },
        uLensPos: { value: new Vector3() },
        uLensMass: { value: 0 },
        uWhiteout: { value: 0 },
        uInvert: { value: 0 },
        uStepScale: { value: 1 },
      },
    });
    this.scene.add(new Mesh(new PlaneGeometry(2, 2), this.material));
    this.resize();
  }

  static create(canvas: HTMLCanvasElement): BlackHoleRenderer | null {
    try {
      // three.js requires WebGL2; context attributes must be chosen at creation.
      const context = canvas.getContext('webgl2', {
        antialias: false,
        alpha: false,
        depth: false,
        powerPreference: 'high-performance',
      });
      if (!context) return null;
      const renderer = new WebGLRenderer({ canvas, context });
      return new BlackHoleRenderer(canvas, renderer);
    } catch {
      return null;
    }
  }

  setTitle(source: HTMLCanvasElement, worldWidth: number) {
    this.titleTexture?.dispose();
    const texture = new CanvasTexture(source);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.generateMipmaps = false;
    this.titleTexture = texture;
    this.material.uniforms.uTitle.value = texture;
    this.material.uniforms.uTitleSize.value.set(
      worldWidth,
      (worldWidth * source.height) / source.width,
    );
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr * this.scale);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    const size = this.renderer.getDrawingBufferSize(new Vector2());
    this.material.uniforms.uResolution.value.copy(size);
  }

  render(frame: FrameInput) {
    const u = this.material.uniforms;
    u.uTime.value = frame.time;
    u.uCamPos.value.copy(frame.camera.position);
    u.uCamBasis.value.copy(frame.camera.basis);
    u.uTanHalfFov.value = frame.camera.tanHalfFov;
    u.uLensPos.value.copy(frame.lensPosition);
    u.uLensMass.value = frame.lensMass;
    u.uTitleOpacity.value = frame.titleOpacity;
    u.uWhiteout.value = frame.whiteout;
    u.uInvert.value = frame.invert;
    // Close to the horizon rays curve hard, so finer steps keep the ring crisp.
    u.uStepScale.value = frame.camera.distance < 4 ? 0.7 : 1;
    this.renderer.render(this.scene, this.camera);
    this.frames++;
    this.govern();
  }

  private govern() {
    const now = performance.now();
    const elapsed = this.lastFrame ? now - this.lastFrame : 0;
    this.lastFrame = now;
    // Software rasterizers and weak GPUs can take seconds per frame; bail out fast.
    if (elapsed > 90 && this.scale > MIN_SCALE) {
      this.scale = Math.max(MIN_SCALE, this.scale * 0.6);
      this.frameTimes = [];
      this.resize();
      return;
    }
    if (elapsed) this.frameTimes.push(elapsed);
    if (this.frameTimes.length < 20) return;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    this.frameTimes = [];
    let next = this.scale;
    if (median > 24) next = Math.max(MIN_SCALE, this.scale - 0.1);
    else if (median < 14) next = Math.min(MAX_SCALE, this.scale + 0.1);
    if (next !== this.scale) {
      this.scale = next;
      this.resize();
    }
  }

  /** Forget timing gathered while the tab was hidden or the loop was paused. */
  resetTiming() {
    this.lastFrame = 0;
    this.frameTimes = [];
  }

  dispose() {
    this.titleTexture?.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}
