/**
 * How each stop is drawn: pure presentation data, independent of the scientific
 * model. Light directions are authored per world so phases vary along the tour
 * instead of every body sharing one three-quarter lighting. Earth is viewed from
 * +Z; every later stop is approached and viewed from −Z.
 */
import type { Vec } from './science';

export type Surface = 'earth' | 'rock' | 'cloud' | 'giant' | 'star';
export type Rgb = [number, number, number];

export interface Atmosphere {
  /** Rayleigh-like scattering per planet radius at the surface, linear RGB. */
  scatter: Rgb;
  /** Wavelength-independent haze/dust scattering per planet radius. */
  haze: number;
  /** Henyey–Greenstein asymmetry of the haze; dust and droplets scatter forward. */
  forward: number;
  /** Density scale height, in planet radii (exaggerated for legibility). */
  height: number;
  /** Shell radius, in planet radii. */
  top: number;
  /** Incident sunlight intensity for the scattering integral. */
  sun: number;
  /** Haze tint over the disc near the limb, linear RGB. */
  limb: Rgb;
  limbStrength: number;
}

export interface WorldLook {
  surface: Surface;
  /** Axial tilt in degrees. */
  tilt: number;
  /** Polar flattening, (equatorial − polar) / equatorial. */
  oblateness: number;
  /** World-space direction from the body towards its light. */
  light: Vec;
  /** Sunlight intensity on the surface (linear HDR). */
  sun: number;
  /** Faint fill on the night side, e.g. earthshine on the Moon. */
  ambient: Rgb;
  atmosphere?: Atmosphere;
  /** Tangent-space normal map asset derived from elevation data. */
  normalMap?: string;
  relief?: number;
  /** Relief derived from the colour image when no elevation data is available. */
  albedoRelief?: number;
  /** Slow differential drift of cloud bands, revolutions per second at the equator. */
  bandDrift?: number;
  /** Procedural fine detail for low-resolution imagery. */
  detail?: number;
  /** Emissive intensity for stars (linear HDR). */
  emission?: number;
  /** Corona tint for stars. */
  corona?: Rgb;
  /** Colour × brightness of the distant point of light before the disc resolves. */
  glint: Rgb;
}

const n = (x: number, y: number, z: number): Vec => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
};
const thin = (
  scatter: Rgb,
  limb: Rgb,
  extra: Partial<Atmosphere> = {},
): Atmosphere => ({
  scatter,
  haze: 0.3,
  forward: 0.7,
  height: 0.012,
  top: 1.05,
  sun: 5,
  limb,
  limbStrength: 0.2,
  ...extra,
});

export const WORLDS: Record<string, WorldLook> = {
  earth: {
    surface: 'earth',
    tilt: 23.44,
    oblateness: 0,
    light: n(-4, 3, 5),
    sun: 1.55,
    ambient: [0.002, 0.003, 0.005],
    atmosphere: {
      scatter: [1.66, 3.88, 9.5],
      haze: 1.2,
      forward: 0.76,
      height: 0.0085,
      top: 1.045,
      sun: 22,
      limb: [0.32, 0.55, 1],
      limbStrength: 0.55,
    },
    glint: [0.5, 0.75, 1.6],
  },
  moon: {
    surface: 'rock',
    tilt: 6.68,
    oblateness: 0,
    light: n(-0.85, 0.22, -0.48),
    sun: 1.7,
    // Earthshine: the night side is faintly lit by reflected Earth light.
    ambient: [0.0045, 0.0055, 0.0075],
    normalMap: 'moon-normal',
    relief: 1.15,
    glint: [1.1, 1.05, 1],
  },
  mercury: {
    surface: 'rock',
    tilt: 0.03,
    oblateness: 0,
    light: n(-0.9, 0.18, -0.4),
    sun: 2.1,
    ambient: [0.0008, 0.0008, 0.0009],
    albedoRelief: 0.9,
    glint: [1, 0.95, 0.88],
  },
  venus: {
    surface: 'cloud',
    tilt: 177.36,
    oblateness: 0,
    light: n(-0.62, 0.25, -0.74),
    sun: 1.5,
    ambient: [0.001, 0.0008, 0.0005],
    atmosphere: thin([1.6, 1.35, 0.85], [1, 0.88, 0.62], {
      haze: 3,
      forward: 0.6,
      height: 0.02,
      top: 1.07,
      sun: 5,
      limbStrength: 0.4,
    }),
    bandDrift: 1 / 900,
    glint: [2.4, 2.1, 1.6],
  },
  sun: {
    surface: 'star',
    tilt: 7.25,
    oblateness: 0,
    light: n(0, 0, -1),
    sun: 0,
    ambient: [0, 0, 0],
    emission: 2.4,
    corona: [1, 0.78, 0.5],
    glint: [10, 8, 5.5],
  },
  mars: {
    surface: 'rock',
    tilt: 25.19,
    oblateness: 0.0059,
    light: n(-0.6, 0.3, -0.74),
    sun: 1.75,
    ambient: [0.0012, 0.0008, 0.0006],
    normalMap: 'mars-normal',
    relief: 0.85,
    atmosphere: thin([0.9, 0.5, 0.3], [0.95, 0.62, 0.42], {
      haze: 1.4,
      forward: 0.65,
      height: 0.01,
      top: 1.035,
      sun: 9,
      limbStrength: 0.25,
    }),
    glint: [1.5, 0.8, 0.55],
  },
  jupiter: {
    surface: 'giant',
    tilt: 3.13,
    oblateness: 0.0649,
    light: n(-0.55, 0.2, -0.81),
    sun: 1.6,
    ambient: [0.0006, 0.0005, 0.0004],
    atmosphere: thin([0.9, 0.85, 0.75], [0.95, 0.88, 0.78], {
      haze: 0.8,
      height: 0.01,
      top: 1.03,
    }),
    bandDrift: 1 / 2400,
    glint: [1.6, 1.4, 1.1],
  },
  saturn: {
    surface: 'giant',
    tilt: 26.73,
    oblateness: 0.098,
    // From below the ring plane, the same side the canonical camera sees, so the
    // rings show their sunlit face rather than the dark, back-lit one.
    light: n(-0.45, -0.35, -0.82),
    sun: 1.6,
    ambient: [0.0006, 0.0005, 0.0004],
    atmosphere: thin([0.9, 0.82, 0.62], [0.96, 0.88, 0.7], {
      haze: 0.8,
      height: 0.01,
      top: 1.03,
    }),
    bandDrift: 1 / 3000,
    glint: [1.5, 1.35, 1],
  },
  uranus: {
    surface: 'giant',
    tilt: 97.77,
    oblateness: 0.0229,
    light: n(-0.7, 0.2, -0.68),
    sun: 1.55,
    ambient: [0.0005, 0.0007, 0.0008],
    atmosphere: thin([0.55, 0.95, 1.05], [0.72, 0.95, 0.98], {
      haze: 1,
      height: 0.014,
      top: 1.045,
      limbStrength: 0.45,
    }),
    detail: 0.06,
    bandDrift: 1 / 4000,
    glint: [0.9, 1.3, 1.4],
  },
  neptune: {
    surface: 'giant',
    tilt: 28.32,
    oblateness: 0.0171,
    light: n(-0.72, 0.18, -0.67),
    sun: 1.8,
    ambient: [0.0004, 0.0005, 0.0009],
    atmosphere: thin([0.4, 0.75, 1.6], [0.45, 0.65, 1], {
      haze: 0.9,
      height: 0.013,
      top: 1.045,
      limbStrength: 0.45,
    }),
    detail: 0.05,
    bandDrift: 1 / 3200,
    glint: [0.6, 0.9, 1.7],
  },
  proxima: {
    surface: 'star',
    tilt: 0,
    oblateness: 0,
    light: n(0, 0, -1),
    sun: 0,
    ambient: [0, 0, 0],
    emission: 3.4,
    corona: [1, 0.32, 0.16],
    glint: [2.2, 0.6, 0.3],
  },
};

/** Light direction for probes and other stops without an authored look. */
export const DEFAULT_LIGHT = n(-4, 3, -5);
export const lookFor = (id: string): WorldLook | undefined => WORLDS[id];
