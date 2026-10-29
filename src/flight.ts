import {
  CHECKPOINTS,
  CUMULATIVE,
  TOTAL,
  routePoint,
  stateAt,
  type JourneyState,
} from './journey';
import { clamp, smooth, norm, RS } from './science';
export const SPACING = 120;
export interface FlightState extends JourneyState {
  position: number;
  leg: number;
  legProgress: number;
  now: number;
  next: number;
  phase: 'orbit' | 'turn' | 'transit' | 'flyby' | 'blackhole' | 'interior';
  cameraZ: number;
  cameraX: number;
  yaw: number;
  targetZ: number;
  rangeKm: number;
  warp: number;
  direction: number;
  approach: number;
}
export function cameraZAt(q: number) {
  if (q <= 0.15) return 4.1392246;
  if (q < 1) {
    const u = (q - 0.15) / 0.85,
      L = SPACING - 8.2784492;
    return (
      4.1392246 + L * (smooth(u) + (u * u * u - u * u) * ((SPACING * 0.85) / L))
    );
  }
  return q * SPACING - 4.1392246;
}
export function flightAt(
  position: number,
  warp = 0,
  direction = 1,
): FlightState {
  const q = Math.max(0, Math.min(20, position)),
    leg = Math.min(19, Math.floor(q)),
    t = q - leg;
  const travelT = leg === 0 ? clamp((q - 0.15) / 0.85) : t;
  const s = stateAt(leg, 0.62 + 0.38 * travelT);
  const now = q === 20 ? 20 : Math.floor(q),
    next = Math.min(20, now + 1);
  const z = cameraZAt(q);
  let x = 0;
  for (let i = Math.max(1, leg - 1); i <= Math.min(15, leg + 1); i++) {
    const d = z - i * SPACING;
    x += (i === 7 ? 5 : 2.8) * Math.exp((-d * d) / 5);
  }
  const offset = z - now * SPACING;
  const close = now > 0 && Math.abs(offset) < 16;
  const phase =
    q === 0
      ? 'orbit'
      : q < 0.15
        ? 'turn'
        : q >= 20
          ? 'interior'
          : q >= 16
            ? 'blackhole'
            : close
              ? 'flyby'
              : 'transit';
  const rangeIndex = close ? now : next;
  const body = CHECKPOINTS[rangeIndex];
  const actual = norm(routePoint(leg, s.transition));
  const range = body.radius
    ? Math.max(0, (Math.hypot(x, rangeIndex * SPACING - z) - 1) * body.radius)
    : Math.max(0, CUMULATIVE[rangeIndex] - s.routeKm);
  const radii = [1000, 100, 1.5, 1, 0.8];
  let bh = 1000;
  if (q >= 16) {
    const a = Math.min(3, Math.floor(q - 16)),
      f = Math.min(1, q - 16 - a);
    bh = Math.exp(
      Math.log(radii[a]) + (Math.log(radii[a + 1]) - Math.log(radii[a])) * f,
    );
  }
  return {
    ...s,
    index: now,
    earthKm: actual,
    position: q,
    leg,
    legProgress: t,
    now,
    next,
    phase,
    cameraZ: z,
    cameraX: x,
    yaw: Math.PI * smooth(q / 0.15),
    targetZ: next * SPACING,
    rangeKm: q === 0 ? 20000 : q >= 16 ? Math.max(0, (bh - 1) * RS) : range,
    localRangeKm: q === 0 ? 20000 : range,
    warp,
    direction,
    approach: clamp((q - 16) / 4),
    bhRadius: bh,
    remainingKm: Math.max(0, TOTAL - s.routeKm),
  };
}
export class TravelMotion {
  warp = 0;
  direction = 1;
  private previous: number | null = null;
  update(routeKm: number, dt: number) {
    const delta = this.previous === null ? 0 : routeKm - this.previous;
    this.previous = routeKm;
    const speed = Math.abs(delta) / Math.max(0.001, dt);
    if (Math.abs(delta) > 1) this.direction = Math.sign(delta);
    const target = Math.min(1, Math.log10(1 + speed / 10000) / 9);
    this.warp +=
      (target - this.warp) * (1 - Math.exp(-dt * (target > this.warp ? 7 : 5)));
    return this.warp;
  }
  reset() {
    this.previous = null;
    this.warp = 0;
  }
}
export interface AxisGroup {
  indices: number[];
  fraction: number;
}
export function distanceAxis(routeKm: number, revealed: number, width = 1000) {
  const target = Math.max(0, Math.min(20, revealed)),
    leg = Math.max(0, target - 1);
  const legStart = CUMULATIVE[leg],
    legEnd = CUMULATIVE[target];
  const fraction = clamp((routeKm - legStart) / Math.max(1, legEnd - legStart));
  const extent =
    leg === 0
      ? legEnd * 1.1
      : legStart * 1.1 + (legEnd - legStart) * 1.1 * smooth(fraction / 0.25);
  const domain = Math.max(1, extent, routeKm * 1.01),
    groups: AxisGroup[] = [];
  for (let i = 0; i <= Math.min(20, revealed); i++) {
    if (CUMULATIVE[i] > domain) continue;
    const fraction = CUMULATIVE[i] / domain;
    const prev = groups.at(-1);
    if (prev && (fraction - prev.fraction) * width < 48) prev.indices.push(i);
    else groups.push({ indices: [i], fraction });
  }
  return {
    domain,
    head: Math.min(1, routeKm / domain),
    groups,
    ticks: [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      fraction: f,
      km: domain * f,
    })),
  };
}
export { CUMULATIVE };
