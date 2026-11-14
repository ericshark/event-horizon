import { CHECKPOINTS, CUMULATIVE, type JourneyState } from './journey';
import { clamp, smooth } from './science';
export const SPACING = 120;
export interface FlightState extends JourneyState {
  cameraPose?: import('./controller').CameraPose;
  dragging?: boolean;
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
export interface AxisGroup {
  indices: number[];
  fraction: number;
}
export function distanceAxis(routeKm: number, revealed: number, width = 1000) {
  const target = Math.max(0, Math.min(CHECKPOINTS.length - 1, revealed)),
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
  for (let i = 0; i <= Math.min(CHECKPOINTS.length - 1, revealed); i++) {
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
