/** Presentation conversions only; the journey and controller always use km and seconds. */
export type UnitMode = 'miles' | 'kilometres';
const KM_PER_MILE = 1.609344;
const lengthValue = (km: number, mode: UnitMode) =>
  mode === 'miles' ? km / KM_PER_MILE : km;
const number = (value: number, digits: number) =>
  value.toLocaleString('en-US', { maximumFractionDigits: digits });
export const formatLength = (km: number, mode: UnitMode, digits = 0) =>
  `${number(lengthValue(km, mode), digits)} ${mode === 'miles' ? 'mi' : 'km'}`;
export const speedValue = (kmS: number, mode: UnitMode) =>
  lengthValue(kmS * 3600, mode);
export const speedUnit = (mode: UnitMode) =>
  mode === 'miles' ? 'mph' : 'km/h';
export const formatVelocity = (kmS: number, mode: UnitMode, digits = 0) =>
  `${number(speedValue(kmS, mode), digits)} ${speedUnit(mode)}`;
export function formatAcceleration(kmS2: number, mode: UnitMode) {
  const value = lengthValue(kmS2, mode);
  const formatted =
    Math.abs(value) > 0 && Math.abs(value) < 0.00001
      ? value.toExponential(2)
      : number(value, 5);
  return `${formatted} ${mode === 'miles' ? 'mi' : 'km'}/s²`;
}

import { CHECKPOINTS, OBSERVATION_FACTS } from './journey';
import { AU, LY, RS } from './science';

/** Numeric overrides never infer quantities from rounded catalog prose. */
export function observationFacts(
  id: string,
  mode: UnitMode,
): [string, string][] {
  const stop = CHECKPOINTS.find((p) => p.id === id);
  if (!stop) return [];
  const overrides: Record<string, string> = {
    Diameter: `${id === 'proxima' ? '≈ ' : ''}${formatLength(stop.radius * 2, mode, 1)}${['jupiter', 'saturn', 'uranus', 'neptune'].includes(id) ? ' · mean' : id === 'proxima' ? ' · model' : ''}`,
  };
  if (id === 'earth') overrides['Day length'] = '23 hours 56 minutes';
  if (id === 'moon') {
    overrides['Mean Earth separation'] = formatLength(384400, mode);
    overrides['Surface gravity'] = formatAcceleration(0.00162, mode);
  }
  if (id === 'mars')
    overrides['Surface gravity'] = formatAcceleration(0.00371, mode);
  if (id === 'neptune')
    overrides.Winds = `Over ${formatVelocity(2000 / 3600, mode)}`;
  if (id === 'voyager') {
    overrides['Probe speed'] =
      `≈ ${formatVelocity(17, mode)} · relative to Sun`;
    overrides['Earth distance'] =
      `≈ ${formatLength(172.36 * AU, mode)} · 172 AU · estimated, grows daily`;
  }
  if (id === 'proxima')
    overrides['Earth distance'] =
      `≈ ${formatLength(4.25 * LY, mode)} · 4.25 light-years`;
  if (id === 'sagittarius-a') {
    overrides['Earth distance'] =
      `≈ ${formatLength(26000 * LY, mode)} · 26,000 light-years`;
    overrides['Horizon radius'] = `≈ ${formatLength(RS, mode)}`;
  }
  return OBSERVATION_FACTS[id].facts.map(([label, value]) => [
    label,
    overrides[label] ?? value,
  ]);
}

/** Supplemental catalog facts; dynamic observer/route metrics belong to the caller. */
export function detailFacts(id: string, mode: UnitMode): [string, string][] {
  const stop = CHECKPOINTS.find((p) => p.id === id);
  if (!stop) return [];
  const overrides: Record<string, string> = {};
  if (id === 'earth') {
    overrides.Circumference = `${formatLength(40075, mode)} · equatorial`;
    overrides.Rotation = `${formatVelocity(1674 / 3600, mode)} · equator`;
    overrides['Sidereal day'] =
      '23 hours 56 minutes · rotation relative to distant stars';
    overrides['Orbit around Sun'] = formatVelocity(107200 / 3600, mode);
  }
  if (id === 'voyager') {
    overrides.Speed = `≈ ${formatVelocity(17, mode)} · relative to Sun`;
    overrides['Reference distance'] =
      `≈ ${formatLength(172.36 * AU, mode)} · 172 AU · estimated, not live`;
  }
  if (id === 'proxima')
    overrides['Distance from Earth'] =
      `≈ ${formatLength(4.25 * LY, mode)} · 4.25 light-years`;
  return (stop.facts ?? []).map(([label, value]) => [
    label,
    overrides[label] ?? value,
  ]);
}

const UNIT_KEY = 'journey-through-space.units';
export function readUnitMode(): UnitMode {
  try {
    return localStorage.getItem(UNIT_KEY) === 'kilometres'
      ? 'kilometres'
      : 'miles';
  } catch {
    return 'miles';
  }
}
export function writeUnitMode(mode: UnitMode) {
  try {
    localStorage.setItem(UNIT_KEY, mode);
  } catch {
    /* The current session can still change units when persistence is unavailable. */
  }
}
