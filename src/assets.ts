/**
 * Texture requirements per stop. The renderer loads these through one shared
 * cache; this module is pure data so lifecycle rules can be tested directly.
 */
import { CHECKPOINTS } from './journey';

export interface AssetSpec {
  name: string;
  ext: 'jpg' | 'png';
  /** Colour used only if the real file fails to load. */
  fallback: string;
  linear?: boolean;
}
export const ASSETS: Record<string, AssetSpec> = {
  stars: { name: 'stars', ext: 'jpg', fallback: '#05080c' },
  earth: { name: 'earth', ext: 'jpg', fallback: '#27618e' },
  night: { name: 'night', ext: 'png', fallback: '#000000' },
  clouds: { name: 'clouds', ext: 'png', fallback: '#000000' },
  'earth-normal': {
    name: 'earth-normal',
    ext: 'jpg',
    fallback: '#8080ff',
    linear: true,
  },
  'earth-specular': { name: 'earth-specular', ext: 'jpg', fallback: '#000000' },
  moon: { name: 'moon', ext: 'jpg', fallback: '#9a9a9a' },
  mercury: { name: 'mercury', ext: 'jpg', fallback: '#8d8478' },
  venus: { name: 'venus', ext: 'jpg', fallback: '#d9bd86' },
  sun: { name: 'sun', ext: 'jpg', fallback: '#ff9d2e' },
  mars: { name: 'mars', ext: 'jpg', fallback: '#a5573a' },
  jupiter: { name: 'jupiter', ext: 'jpg', fallback: '#c4a27e' },
  saturn: { name: 'saturn', ext: 'jpg', fallback: '#d8c08c' },
  'saturn-rings': { name: 'saturn-rings', ext: 'png', fallback: '#b8a47c' },
  uranus: { name: 'uranus', ext: 'jpg', fallback: '#9fd4d8' },
  neptune: { name: 'neptune', ext: 'jpg', fallback: '#3f62c8' },
};
const EXTRA: Record<string, string[]> = {
  earth: ['night', 'clouds', 'earth-normal', 'earth-specular'],
  saturn: ['saturn-rings'],
};
/** Every texture the stop needs while it is built. */
export function assetsFor(id: string): string[] {
  const stop = CHECKPOINTS.find((p) => p.id === id);
  return [...(stop?.texture ? [stop.texture] : []), ...(EXTRA[id] ?? [])];
}
/** Stops whose scenes are kept alive around a leg: previous, both ends, next. */
export function residentStops(leg: number) {
  const last = CHECKPOINTS.length - 1;
  const from = Math.max(0, leg - 1),
    to = Math.min(last, leg + 2);
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
/** Textures to keep while `leg` is active; everything else may be disposed. */
export function residentAssets(leg: number) {
  const set = new Set<string>(['stars']);
  for (const i of residentStops(leg))
    for (const name of assetsFor(CHECKPOINTS[i].id)) set.add(name);
  return set;
}
