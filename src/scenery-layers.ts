/** GPU layers for the incidental interstellar scenery described by `scenery.ts`. */
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';
import type { Scenery } from './scenery';

interface LayerSpec {
  key: keyof Pick<Scenery, 'kuiper' | 'heliopause' | 'oort' | 'interstellar'>;
  count: number;
  spread: [number, number];
  depth: number;
  size: number;
  /** World units of drift per unit of journey position. */
  drift: number;
  opacity: number;
  colors: string[];
  seed: number;
}
/** Sparse by design: no layer is dense enough to read as an obstacle field. */
const SPECS: LayerSpec[] = [
  {
    key: 'kuiper',
    count: 140,
    spread: [48, 34],
    depth: 170,
    size: 0.09,
    drift: 110,
    opacity: 0.5,
    colors: ['#b9c6d6', '#9fb4c8', '#d4dbe3'],
    seed: 11,
  },
  {
    key: 'heliopause',
    count: 38,
    spread: [60, 40],
    depth: 190,
    size: 5.2,
    drift: 70,
    opacity: 0.075,
    colors: ['#7f9bff', '#a98bff', '#6fc3ff'],
    seed: 23,
  },
  {
    key: 'oort',
    count: 190,
    spread: [70, 48],
    depth: 220,
    size: 0.07,
    drift: 150,
    opacity: 0.55,
    colors: ['#dfe7f1', '#c8d3e6', '#f3e8d6'],
    seed: 37,
  },
  {
    key: 'interstellar',
    count: 620,
    spread: [85, 58],
    depth: 300,
    size: 0.12,
    drift: 260,
    opacity: 0.95,
    colors: ['#ffffff', '#cfe0ff', '#ffe2b8', '#ffb98a', '#ff9a7a'],
    seed: 53,
  },
];
const VERT = `attribute vec3 aColor;uniform float uTravel,uDrift,uDepth,uSize,uScale;varying vec3 vC;varying float vA;
void main(){float z=mod(position.z-uTravel*uDrift,uDepth)+2.;vec4 mv=modelViewMatrix*vec4(position.xy,z,1.);
vC=aColor;vA=smoothstep(2.,22.,z)*(1.-smoothstep(uDepth*.7,uDepth,z));
gl_PointSize=clamp(uSize*uScale/max(1.,-mv.z),1.,16.);gl_Position=projectionMatrix*mv;}`;
const FRAG = `varying vec3 vC;varying float vA;uniform float uOpacity;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.05,d);gl_FragColor=vec4(vC,a*vA*uOpacity);}`;

export class SceneryLayers {
  readonly group = new Group();
  private layers: {
    spec: LayerSpec;
    points: Points;
    material: ShaderMaterial;
  }[] = [];
  constructor() {
    for (const spec of SPECS) {
      let seed = spec.seed * 7919;
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      const position: number[] = [],
        color: number[] = [];
      for (let i = 0; i < spec.count; i++) {
        position.push(
          (random() - 0.5) * spec.spread[0] * 2,
          (random() - 0.5) * spec.spread[1] * 2,
          random() * spec.depth,
        );
        const hex = spec.colors[Math.floor(random() * spec.colors.length)],
          c = {
            r: parseInt(hex.slice(1, 3), 16) / 255,
            g: parseInt(hex.slice(3, 5), 16) / 255,
            b: parseInt(hex.slice(5, 7), 16) / 255,
          };
        const shade = 0.55 + 0.45 * random();
        color.push(c.r * shade, c.g * shade, c.b * shade);
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute(position, 3),
      );
      geometry.setAttribute('aColor', new Float32BufferAttribute(color, 3));
      const material = new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uTravel: { value: 0 },
          uDrift: { value: spec.drift },
          uDepth: { value: spec.depth },
          uSize: { value: spec.size },
          uScale: { value: 400 },
          uOpacity: { value: 0 },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
      });
      const points = new Points(geometry, material);
      points.frustumCulled = false;
      points.visible = false;
      points.renderOrder = 9;
      this.group.add(points);
      this.layers.push({ spec, points, material });
    }
  }
  /** `travel` is the journey position; `scale` converts world size to pixels. */
  update(at: Vector3, scenery: Scenery, travel: number, scale: number) {
    this.group.position.copy(at);
    // Interstellar stars thicken towards the galactic centre.
    const stars = scenery.interstellar * (0.45 + 0.55 * scenery.galactic);
    for (const { spec, points, material } of this.layers) {
      const weight = spec.key === 'interstellar' ? stars : scenery[spec.key];
      points.visible = weight > 0.002;
      material.uniforms.uOpacity.value = weight * spec.opacity;
      material.uniforms.uTravel.value = travel;
      material.uniforms.uScale.value = scale;
    }
  }
  /** Current layer weights, for diagnostics and tests. */
  get weights() {
    return Object.fromEntries(
      this.layers.map(({ spec, material }) => [
        spec.key,
        material.uniforms.uOpacity.value / spec.opacity,
      ]),
    );
  }
  dispose() {
    for (const { points, material } of this.layers) {
      points.geometry.dispose();
      material.dispose();
    }
  }
}
