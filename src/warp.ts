/**
 * Pure model of the hyperdrive look. Everything is derived from the flight
 * snapshot's `thrust` (actual speed divided by that leg's peak), so the effect
 * shares the single authored clock: pausing freezes it, skipping settles it, and
 * reduced motion removes it entirely. Nothing here alters scientific quantities.
 */
import { clamp } from './science';

/** Orders of magnitude of thrust over which the warp builds from nothing to full. */
export const WARP_DECADES = 4;
/** Peak aberration speed (fraction of c) used for the relativistic look. */
export const BETA_MAX = 0.62;
/** Desktop field-of-view expansion at full warp, in degrees. */
export const FOV_EXPANSION = 14;
export const BASE_FOV = 40;

export interface Warp {
  /** 0 → 1 envelope, the same on every leg. */
  envelope: number;
  /** Aberration speed, fraction of c. */
  beta: number;
  /** Streak length factor for stars and near-field dust. */
  stretch: number;
  /** Lens bend applied at the frame edges by the output pass. */
  bend: number;
  /** Field-of-view expansion in degrees (desktop only). */
  fov: number;
}

/**
 * Speed climbs through many orders of magnitude, so a logarithmic mapping lets
 * stars start stretching as the departure world falls away and build steadily
 * to the cruise plateau, instead of snapping on in the last moments of the ramp.
 */
export function warpEnvelope(thrust: number) {
  if (!(thrust > 0)) return 0;
  const w = clamp((Math.log10(thrust) + WARP_DECADES) / WARP_DECADES);
  return w * w * (3 - 2 * w);
}

export function warpAt(thrust: number, reducedMotion = false): Warp {
  const envelope = reducedMotion ? 0 : warpEnvelope(thrust);
  return {
    envelope,
    beta: BETA_MAX * envelope,
    stretch: envelope,
    bend: 0.35 * envelope,
    fov: FOV_EXPANSION * envelope,
  };
}

/**
 * Relativistic aberration of a direction's angle to the heading. Light from a
 * source at angle θ appears, to an observer moving at β, at angle θ' with
 * cos θ' = (cos θ + β) / (1 + β cos θ): the sky bunches towards the heading.
 */
export function aberrateCos(cosSource: number, beta: number) {
  return (cosSource + beta) / (1 + beta * cosSource);
}
/** Inverse of `aberrateCos`: the source angle that appears at `cosObserved`. */
export function unaberrateCos(cosObserved: number, beta: number) {
  return (cosObserved - beta) / (1 - beta * cosObserved);
}
/** Relativistic Doppler factor for light seen at `cosObserved` to the heading. */
export function dopplerFactor(cosObserved: number, beta: number) {
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  return gamma * (1 + beta * cosObserved);
}

export interface GlareSource {
  /** Fraction of the frame the body's disc covers, 0–1. */
  coverage: number;
  /** Self-luminous bodies dazzle far more than sunlit ones. */
  star: boolean;
}
/**
 * Photographic exposure adaptation. A bright world in frame washes out the faint
 * sky, as in real spacecraft imagery; a star in frame also lowers the overall
 * exposure so its surface keeps detail. Out in empty space the Milky Way comes up.
 */
export function exposureFor(sources: GlareSource[], envelope = 0) {
  let planet = 0,
    star = 0;
  for (const s of sources) {
    const c = clamp(s.coverage);
    if (s.star) star += c;
    else planet += c;
  }
  return {
    scene: 1 / (1 + 3 * Math.min(1, star)),
    sky: Math.min(
      1.35,
      Math.max(0.02, (1 + 0.12 * envelope) / (1 + 5 * planet + 40 * star)),
    ),
  };
}
