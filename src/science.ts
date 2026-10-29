/** All science calculations use km, kg and seconds. Render units never enter these functions. */
export const C = 299792.458;
export const AU = 149597870.7;
export const YEAR = 365.25 * 86400;
export const LY = C * YEAR;
export const PARKER = (430000 * 1.609344) / 3600;
export const G = 6.6743e-20;
export const EARTH_RADIUS = 6371;
export const BH_MASS = 9.62 * 1.98847e30;
export const RS = (2 * G * BH_MASS) / C ** 2;
export type Vec = [number, number, number];
export const norm = (v: Vec) => Math.hypot(...v);
export const sub = (a: Vec, b: Vec): Vec => a.map((n, i) => n - b[i]) as Vec;
export const mix = (a: Vec, b: Vec, t: number): Vec =>
  a.map((n, i) => n + (b[i] - n) * t) as Vec;
export const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const smooth = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
export const travelTime = (km: number, speed = C) => Math.max(0, km) / speed;
export const tidal = (rKm: number, heightKm = 0.002) =>
  ((2 * G * BH_MASS * heightKm) / rKm ** 3) * 1000;
export function distance(km: number) {
  if (km >= LY * 0.1)
    return `${(km / LY).toLocaleString('en-US', { maximumFractionDigits: 2 })} ly`;
  if (km >= AU * 0.1)
    return `${(km / AU).toLocaleString('en-US', { maximumFractionDigits: 2 })} AU`;
  return `${Math.max(0, km).toLocaleString('en-US', { maximumFractionDigits: 0 })} km`;
}
export function duration(s: number) {
  if (s < 1) return `${(s * 1000).toFixed(1)} ms`;
  if (s < 60) return `${s.toFixed(1)} seconds`;
  if (s < 3600) return `${(s / 60).toFixed(1)} minutes`;
  if (s < 86400) return `${(s / 3600).toFixed(1)} hours`;
  if (s < YEAR) return `${(s / 86400).toFixed(1)} days`;
  return `${(s / YEAR).toLocaleString('en-US', { maximumFractionDigits: 1 })} years`;
}
/** Low-precision J2000 Kepler elements, propagated by period. Not Horizons vectors.
 * Source/method: JPL approximate planetary positions, https://ssd.jpl.nasa.gov/planets/approx_pos.html
 * a(AU), e, I, mean longitude, longitude of perihelion, ascending node, period(years).
 * Deliberately no claim to navigation-grade ephemerides. */
const ELEMENTS: Record<string, number[]> = {
  mercury: [0.387099, 0.205636, 7.005, 252.251, 77.457, 48.331, 0.240846],
  venus: [0.723336, 0.006777, 3.395, 181.98, 131.602, 76.68, 0.615198],
  earth: [1.000003, 0.016711, -0.000015, 100.465, 102.938, 0, 1],
  mars: [1.52371, 0.093394, 1.85, -4.553, -23.944, 49.56, 1.88082],
  jupiter: [5.202887, 0.048386, 1.304, 34.396, 14.728, 100.474, 11.8626],
  saturn: [9.536676, 0.053862, 2.486, 49.954, 92.599, 113.662, 29.4475],
  uranus: [19.189165, 0.047257, 0.773, 313.238, 170.954, 74.016, 84.0168],
  neptune: [30.069923, 0.00859, 1.77, -55.12, 44.964, 131.784, 164.7913],
};
export const EPOCH = '2026-10-29T00:00:00Z';
export function planetPosition(id: string): Vec {
  const [a, e, inc, L, p, node, period] = ELEMENTS[id];
  const rad = Math.PI / 180;
  const years =
    (Date.parse(EPOCH) - Date.parse('2000-01-01T12:00:00Z')) / 1000 / YEAR;
  const M = (L - p) * rad + (years * 2 * Math.PI) / period;
  let E = M;
  for (let j = 0; j < 12; j++)
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const x = a * (Math.cos(E) - e),
    y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = (p - node) * rad,
    N = node * rad,
    I = inc * rad;
  return [
    (Math.cos(w) * Math.cos(N) - Math.sin(w) * Math.sin(N) * Math.cos(I)) * x +
      (-Math.sin(w) * Math.cos(N) - Math.cos(w) * Math.sin(N) * Math.cos(I)) *
        y,
    (Math.cos(w) * Math.sin(N) + Math.sin(w) * Math.cos(N) * Math.cos(I)) * x +
      (-Math.sin(w) * Math.sin(N) + Math.cos(w) * Math.cos(N) * Math.cos(I)) *
        y,
    Math.sin(w) * Math.sin(I) * x + Math.cos(w) * Math.sin(I) * y,
  ].map((v) => v * AU) as Vec;
}
/** Catalog RA/Dec (equatorial) to J2000 ecliptic Cartesian km. */
export function starPosition(ra: number, dec: number, ly: number): Vec {
  const r = (ra * Math.PI) / 180,
    d = (dec * Math.PI) / 180,
    e = (23.43928 * Math.PI) / 180;
  const x = Math.cos(d) * Math.cos(r),
    y = Math.cos(d) * Math.sin(r),
    z = Math.sin(d);
  return [
    x,
    y * Math.cos(e) + z * Math.sin(e),
    -y * Math.sin(e) + z * Math.cos(e),
  ].map((v) => v * ly * LY) as Vec;
}
