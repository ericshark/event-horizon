/** One active-time controller for every observation and adjacent flight. */
import { Matrix4, Quaternion, Vector3 } from 'three';
import { type FlightState, SPACING } from './flight';
import {
  CHECKPOINTS,
  CUMULATIVE,
  TOTAL,
  LEG_DURATIONS,
  LEG_LENGTHS,
  pointAtDistance,
} from './journey';
import { clamp, norm, mix, type Vec } from './science';
export interface CameraPose {
  position: Vec;
  rotation: [number, number, number, number];
}
export type Playback = 'observing' | 'flying' | 'paused';
export interface TimedFrame extends FlightState {
  playback: Playback;
  elapsed: number;
  speedKmS: number;
  scientificPosition: Vec;
  cameraPose: CameraPose;
  flightPhase:
    | 'observing'
    | 'departure'
    | 'acceleration'
    | 'cruise'
    | 'braking'
    | 'settling';
  dragging: boolean;
}
const quintic = (x: number) => {
  const t = clamp(x);
  return clamp(t ** 3 * (10 - 15 * t + 6 * t * t));
};
const integral = (x: number) => {
  const t = clamp(x);
  return 2.5 * t ** 4 - 3 * t ** 5 + t ** 6;
};
/** Integral and analytic derivative of the normalized 30/25/45 speed envelope. */
export function schedule(elapsed: number, duration = 6) {
  const departure = Math.min(2, 0.15 * duration),
    settle = Math.min(1.2, 0.12 * duration);
  const moving = duration - departure - settle,
    t = clamp((elapsed - departure) / moving);
  const area = 0.3 / 2 + 0.25 + 0.45 / 2;
  let p: number, v: number;
  if (t < 0.3) {
    p = 0.3 * integral(t / 0.3);
    v = quintic(t / 0.3);
  } else if (t < 0.55) {
    p = 0.15 + t - 0.3;
    v = 1;
  } else {
    const u = (t - 0.55) / 0.45;
    p = 0.4 + 0.45 * (u - integral(u));
    v = 1 - quintic(u);
  }
  return {
    progress: clamp(p / area),
    rate:
      elapsed <= departure || elapsed >= duration - settle
        ? 0
        : v / (area * moving),
    departure,
    settle,
    phase:
      elapsed < departure
        ? 'departure'
        : elapsed >= duration - settle
          ? 'settling'
          : t < 0.3
            ? 'acceleration'
            : t < 0.55
              ? 'cruise'
              : 'braking',
  } as const;
}
/** Per-leg [lift, sideways] swing in render units: Earth–Moon stays local, later legs sweep wider. */
const ARCS: [number, number][] = [
  [7, 2],
  [14, -6],
  [18, 8],
  [12, -10],
  [20, 5],
  [16, -8],
  [22, 9],
  [18, -5],
  [24, 7],
  [14, -9],
  [20, 6],
  [18, -7],
];
function facing(position: Vec, target: Vec) {
  return new Quaternion().setFromRotationMatrix(
    new Matrix4().lookAt(
      new Vector3(...position),
      new Vector3(...target),
      new Vector3(0, 1, 0),
    ),
  );
}
function pose(position: Vec, target: Vec): CameraPose {
  return { position, rotation: facing(position, target).toArray() };
}
function viewingRadius(stop: number) {
  // Saturn: rings (outer radius 2.3) stay inside the frame at maximum zoom and any pitch.
  if (CHECKPOINTS[stop].id === 'saturn') return 8.4;
  return CHECKPOINTS[stop].kind === 'blackhole'
    ? 7
    : CHECKPOINTS[stop].kind === 'probe'
      ? 6
      : 4.1392246;
}
function canonical(stop: number): CameraPose {
  return pose(
    [0, 0, stop * SPACING + (stop ? -1 : 1) * viewingRadius(stop)],
    [0, 0, stop * SPACING],
  );
}
export class JourneyController {
  private stop = 0;
  private target = 1;
  private playback: Playback = 'observing';
  private elapsed = 0;
  private last: number | null = null;
  private yaw = 0;
  private pitch = 0;
  private zoom = 1;
  private drag = false;
  private velocity = [0, 0];
  private camera = canonical(0);
  private start = this.camera;
  private end = canonical(1);
  observe(stop: number) {
    this.stop = Math.max(0, Math.min(CHECKPOINTS.length - 1, Math.floor(stop)));
    this.target = Math.min(CHECKPOINTS.length - 1, this.stop + 1);
    this.playback = 'observing';
    this.elapsed = 0;
    this.last = null;
    this.resetView();
  }
  resetView() {
    this.yaw = this.pitch = 0;
    this.zoom = 1;
    this.drag = false;
    this.velocity = [0, 0];
    this.camera = canonical(this.stop);
  }
  inspect(dx: number, dy: number) {
    if (this.playback !== 'observing') return;
    this.yaw += dx;
    this.pitch = Math.max(-1.15, Math.min(1.15, this.pitch + dy));
    this.updateInspection();
  }
  private updateInspection() {
    const angle = this.yaw + (this.stop ? Math.PI : 0),
      r = viewingRadius(this.stop) * this.zoom;
    const position: Vec = [
      r * Math.sin(angle) * Math.cos(this.pitch),
      r * Math.sin(this.pitch),
      this.stop * SPACING + r * Math.cos(angle) * Math.cos(this.pitch),
    ];
    this.camera = pose(position, [0, 0, this.stop * SPACING]);
  }
  setDragging(value: boolean) {
    this.drag = value;
    if (value) this.velocity = [0, 0];
  }
  fling(dx: number, dy: number) {
    this.velocity = [
      Math.max(-1, Math.min(1, dx)),
      Math.max(-1, Math.min(1, dy)),
    ];
  }
  zoomBy(factor: number) {
    if (this.playback === 'observing') {
      this.zoom = Math.max(0.8, Math.min(1.2, this.zoom * factor));
      this.updateInspection();
    }
  }
  launch(now: number, direction = 1) {
    if (this.playback !== 'observing') return false;
    const target = this.stop + Math.sign(direction);
    if (!direction || target < 0 || target >= CHECKPOINTS.length) return false;
    this.start = {
      position: [...this.camera.position],
      rotation: [...this.camera.rotation],
    };
    this.target = target;
    this.end = canonical(this.target);
    this.playback = 'flying';
    this.elapsed = 0;
    this.last = now;
    this.drag = false;
    this.velocity = [0, 0];
    return true;
  }
  pause(now: number) {
    if (this.playback === 'flying') {
      this.tick(now);
      if (this.playback === 'flying') this.playback = 'paused';
    }
  }
  resume(now: number) {
    if (this.playback === 'paused') {
      this.last = now;
      this.playback = 'flying';
    }
  }
  skip() {
    if (this.playback !== 'observing') this.observe(this.target);
  }
  tick(now: number): TimedFrame {
    const dt = this.last === null ? 0 : Math.max(0, (now - this.last) / 1000);
    this.last = now;
    if (this.playback === 'flying') {
      const duration = LEG_DURATIONS[Math.min(this.stop, this.target)];
      this.elapsed = Math.min(duration, this.elapsed + dt);
      if (this.elapsed >= duration - 1e-10) {
        this.observe(this.target);
        this.last = now;
      }
    } else if (this.playback === 'observing' && !this.drag) {
      this.inspect(this.velocity[0] * dt, this.velocity[1] * dt);
      this.velocity = this.velocity.map((v) => v * Math.exp(-8 * dt));
    }
    return this.snapshot();
  }
  snapshot(): TimedFrame {
    const observing = this.playback === 'observing',
      leg = Math.min(this.stop, this.target),
      timing = schedule(this.elapsed, LEG_DURATIONS[leg] ?? 6);
    const progress = observing
      ? this.stop
      : this.stop + (this.target - this.stop) * timing.progress;
    const segment = Math.min(CHECKPOINTS.length - 2, Math.floor(progress)),
      fraction = progress - segment,
      scientificPosition = pointAtDistance(segment, fraction);
    let cameraPose = this.camera;
    if (!observing) {
      const startFacing = new Quaternion(...this.start.rotation);
      const travelFacing = facing(this.start.position, this.end.position);
      const startCenter: Vec = [0, 0, this.stop * SPACING],
        endCenter: Vec = [0, 0, this.target * SPACING];
      const escape = (point: Vec, center: Vec): Vec => {
        const delta = point.map((v, i) => v - center[i]) as Vec,
          r = norm(delta);
        return delta.map((v, i) => center[i] + (v * 12) / r) as Vec;
      };
      const a = escape(this.start.position, startCenter),
        b = escape(this.end.position, endCenter),
        u = timing.progress;
      const p =
        u < 0.15
          ? mix(this.start.position, a, quintic(u / 0.15))
          : u > 0.85
            ? mix(b, this.end.position, quintic((u - 0.85) / 0.15))
            : mix(a, b, quintic((u - 0.15) / 0.7));
      if (u >= 0.15 && u <= 0.85) {
        const swell = Math.sin((Math.PI * (u - 0.15)) / 0.7) ** 2,
          arc = ARCS[leg % ARCS.length];
        p[1] += arc[0] * swell;
        p[0] += arc[1] * swell;
      }
      const rotation =
        timing.phase === 'departure'
          ? startFacing.slerp(
              travelFacing,
              quintic(this.elapsed / timing.departure),
            )
          : travelFacing.slerp(
              facing(p, endCenter),
              quintic(timing.progress / 0.4),
            );
      cameraPose = { position: p, rotation: rotation.toArray() };
    }
    const speedKmS = observing ? 0 : LEG_LENGTHS[leg] * timing.rate;
    const routeKm = CUMULATIVE[segment] + LEG_LENGTHS[segment] * fraction;
    const frame: TimedFrame = {
      index: this.stop,
      local: fraction,
      transition: timing.progress,
      leg,
      legProgress: observing ? 0 : timing.progress,
      now: this.stop,
      next: observing
        ? Math.min(CHECKPOINTS.length - 1, this.stop + 1)
        : this.target,
      position: progress,
      routeKm,
      remainingKm: Math.max(0, TOTAL - routeKm),
      bhRadius: 1000,
      approach: 0,
      yaw: 0,
      targetZ: this.target * SPACING,
      rangeKm: CHECKPOINTS[this.stop].range,
      localRangeKm: CHECKPOINTS[this.stop].range,
      earthKm: norm(scientificPosition),
      speedKmS,
      scientificPosition,
      playback: this.playback,
      elapsed: this.elapsed,
      cameraPose,
      cameraX: cameraPose.position[0],
      cameraZ: cameraPose.position[2],
      flightPhase: observing ? 'observing' : timing.phase,
      phase: observing
        ? this.stop
          ? 'flyby'
          : 'orbit'
        : timing.phase === 'departure'
          ? 'turn'
          : 'transit',
      direction: Math.sign(this.target - this.stop),
      warp: observing ? 0 : 0.075 * timing.rate * 3,
      dragging: this.drag,
    };
    Object.freeze(scientificPosition);
    Object.freeze(cameraPose.position);
    Object.freeze(cameraPose.rotation);
    Object.freeze(cameraPose);
    return Object.freeze(frame);
  }
}
/** Wheel gesture ownership survives arrival; every wheel event extends the silence gate. */
export class WheelIntent {
  private last = -Infinity;
  private start = -Infinity;
  private sum = 0;
  private armed = true;
  reset() {
    this.sum = 0;
    this.start = -Infinity;
    this.armed = false;
  }
  feed(delta: number, now: number, observing: boolean) {
    const silent = now - this.last >= 300;
    this.last = now;
    if (!observing) {
      this.reset();
      return 0;
    }
    if (!this.armed) {
      if (!silent) return 0;
      this.armed = true;
    }
    if (now - this.start > 250 || Math.sign(delta) !== Math.sign(this.sum)) {
      this.sum = 0;
      this.start = now;
    }
    this.sum += delta;
    if (Math.abs(this.sum) < 60) return 0;
    const direction = Math.sign(this.sum);
    this.reset();
    return direction;
  }
}
