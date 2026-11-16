/**
 * Pure model of interstellar scenery. Everything is derived from the authoritative
 * flight snapshot (Earth distance, route position, thrust), so rendering and audio
 * never keep their own clocks. Scientific boundaries come from published distances
 * and are never moved for spectacle.
 */
import { AU, clamp, smooth } from './science';

export type Rgb = [number, number, number];
export interface Scenery {
  /** Sparse icy specks, 30–50 AU. Never dense enough to read as an asteroid field. */
  kuiper: number;
  /** Faint plasma shimmer around the ≈120 AU heliopause crossing. */
  heliopause: number;
  /** Pale specks of the Oort Cloud; only beyond Voyager 1 (≈172 AU), from ≈1,500 AU. */
  oort: number;
  /** Streaming stars once the Solar System is behind. */
  interstellar: number;
  /** 0 → 1 across the Proxima → Sagittarius A* leg: denser, warmer galactic sky. */
  galactic: number;
  /** Background multiply colour (linear sRGB components). */
  tint: Rgb;
}
const bump = (x: number, lo: number, hi: number) => {
  const t = (x - lo) / (hi - lo);
  return t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t) ** 2;
};
const lerp = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
/** Sky tint at stop positions Neptune → Voyager → Proxima → Sagittarius A*. */
const SKY: Rgb[] = [
  [0.141, 0.192, 0.255],
  [0.12, 0.155, 0.28],
  [0.26, 0.16, 0.14],
  [0.36, 0.25, 0.17],
];
export const FIRST_INTERSTELLAR_STOP = 9;
export const NEPTUNE_STOP = FIRST_INTERSTELLAR_STOP;
export const VOYAGER_AU = 172.36;

export function sceneryAt(earthKm: number, position: number): Scenery {
  const au = Math.max(1e-6, earthKm / AU),
    logAu = Math.log10(Math.max(1, au));
  const stopT = Math.min(0.999999, clamp((position - NEPTUNE_STOP) / 3)) * 3,
    i = Math.floor(stopT);
  return {
    kuiper: bump(au, 28, 60),
    heliopause: bump(au, 100, 145),
    oort:
      smooth((logAu - Math.log10(1500)) / 0.5) *
      (1 - smooth((logAu - Math.log10(60000)) / 0.3)),
    interstellar: smooth((logAu - 4.3) / 0.9),
    galactic: clamp(position - 11),
    tint:
      position <= NEPTUNE_STOP ? SKY[0] : lerp(SKY[i], SKY[i + 1], stopT - i),
  };
}
/**
 * Streak strength. Earlier legs keep the original rate-derived value; the long
 * interstellar legs follow the thrust envelope so streaks build and decay with the
 * same eased speed as everything else instead of staying nearly invisible.
 */
export function streakStrength(
  leg: number,
  warp: number,
  thrust: number,
  reducedMotion = false,
) {
  if (reducedMotion) return 0;
  if (leg < FIRST_INTERSTELLAR_STOP)
    return warp * Math.min(1, 0.25 + 0.18 * leg);
  return thrust * [0.1, 0.13, 0.16][Math.min(2, leg - FIRST_INTERSTELLAR_STOP)];
}
/** Restrained field-of-view expansion in degrees. */
export function fovExpansion(
  leg: number,
  warp: number,
  thrust: number,
  reducedMotion = false,
) {
  if (reducedMotion) return 0;
  return leg < FIRST_INTERSTELLAR_STOP
    ? warp * 8
    : thrust * [2.5, 3, 3.5][Math.min(2, leg - FIRST_INTERSTELLAR_STOP)];
}
