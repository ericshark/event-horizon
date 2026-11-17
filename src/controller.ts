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
import { clamp, norm, mix, RS, type Vec } from './science';
export interface CameraPose {
  position: Vec;
  rotation: [number, number, number, number];
}
export type Playback = 'observing' | 'flying' | 'paused' | 'complete';
export type MotionMode = 'system' | 'full' | 'reduced';
export function resolveReducedMotion(
  mode: MotionMode,
  systemReduced: boolean,
): boolean {
  return mode === 'reduced' ? true : mode === 'full' ? false : systemReduced;
}
export interface TimedFrame extends FlightState {
  playback: Playback;
  sequence: 'route' | 'descent';
  elapsed: number;
  speedKmS: number;
  /** Normalised speed envelope, 0 at rest and 1 at the cruise plateau. */
  thrust: number;
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
  motionMode: MotionMode;
  reducedMotion: boolean;
}
const quintic = (x: number) => {
  const t = clamp(x);
  return clamp(t ** 3 * (10 - 15 * t + 6 * t * t));
};
/**
 * A shared active-time sample: a smooth exponential acceleration, cruise, and
 * symmetric braking. Its analytic integral is scientific progress; the derivative
 * is the actual virtual speed. Length-aware curvature keeps the first seconds
 * readable even on galactic legs rather than scaling an early mph spike up.
 */
export function schedule(
  elapsed: number,
  duration = LEG_DURATIONS[0],
  lengthKm = LEG_LENGTHS[0],
) {
  const t = clamp(elapsed / duration),
    ramp = 0.4,
    cruise = 0.2,
    k = Math.max(8, Math.log((lengthKm * 3600) / (1.609344 * duration)));
  // v(x) = x² [k+3 - (k+2)x] exp(k(x-1)); v and v' join
  // the plateau at 1 and 0, respectively, and start at rest with v'=0.
  const velocity = (x: number) =>
    x * x * (k + 3 - (k + 2) * x) * Math.exp(k * (x - 1));
  const a = k + 3,
    b = k + 2;
  const primitive = (x: number) =>
    (-b / k) * x ** 3 +
    (a / k + (3 * b) / k ** 2) * x ** 2 +
    ((-2 * a) / k ** 2 - (6 * b) / k ** 3) * x +
    (2 * a) / k ** 3 +
    (6 * b) / k ** 4;
  const integral = (x: number) =>
    Math.max(
      0,
      Math.exp(k * (x - 1)) * primitive(x) - Math.exp(-k) * primitive(0),
    );
  const rampArea = integral(1),
    area = 2 * ramp * rampArea + cruise;
  let p: number, v: number;
  if (t < ramp) {
    p = ramp * integral(t / ramp);
    v = velocity(t / ramp);
  } else if (t <= ramp + cruise) {
    p = ramp * rampArea + t - ramp;
    v = 1;
  } else {
    const x = (1 - t) / ramp;
    p = area - ramp * integral(x);
    v = velocity(x);
  }
  const settle = Math.min(1.2, 0.12 * duration),
    departure = 0.15 * duration;
  return {
    thrust: t === 0 || t === 1 ? 0 : v,
    progress: t === 0 ? 0 : t === 1 ? 1 : clamp(p / area),
    rate: t === 0 || t === 1 ? 0 : v / (area * duration),
    // Camera distance is perceptually rescaled. Expand the tiny early science
    // fractions on this same clock; never ease the escape a second time.
    visualProgress: t * t * (3 - 2 * t),
    departure,
    settle,
    phase:
      elapsed < departure
        ? 'departure'
        : elapsed >= duration - settle
          ? 'settling'
          : t < ramp
            ? 'acceleration'
            : t <= ramp + cruise
              ? 'cruise'
              : 'braking',
  } as const;
}
/** Authored illustrative descent: smooth log-radius, not a geodesic. */
export const DESCENT_SECONDS = 20;
export function descentRadius(seconds: number) {
  const times = [0, 8, 15, 18, 20],
    radii = [1000, 100, 1.5, 1, 0.8];
  const t = Math.max(0, Math.min(DESCENT_SECONDS, seconds));
  const i = Math.min(3, times.findIndex((end, j) => j > 0 && t <= end) - 1);
  const u = quintic((t - times[i]) / (times[i + 1] - times[i]));
  return Math.exp(Math.log(radii[i]) * (1 - u) + Math.log(radii[i + 1]) * u);
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
/** Voyager is framed far enough back that its compressed booms stay inside maximum zoom. */
export const PROBE_VIEWING_RADIUS = 12;
export function viewingRadius(stop: number) {
  // Saturn: rings (outer radius 2.3) stay inside the frame at maximum zoom and any pitch.
  if (CHECKPOINTS[stop].id === 'saturn') return 8.4;
  return CHECKPOINTS[stop].kind === 'blackhole'
    ? 7
    : CHECKPOINTS[stop].kind === 'probe'
      ? PROBE_VIEWING_RADIUS
      : 4.1392246;
}
function canonical(stop: number): CameraPose {
  return pose(
    [0, 0, stop * SPACING + (stop ? -1 : 1) * viewingRadius(stop)],
    [0, 0, stop * SPACING],
  );
}
export class JourneyController {
  private sequence: 'route' | 'descent' = 'route';
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
  private motionMode: MotionMode = 'full';
  private systemReduced = false;
  private camera = canonical(0);
  private start = this.camera;
  private end = canonical(1);
  get currentMotionMode(): MotionMode {
    return this.motionMode;
  }
  get reducedMotion(): boolean {
    return resolveReducedMotion(this.motionMode, this.systemReduced);
  }
  setMotionMode(mode: MotionMode, systemReduced = this.systemReduced) {
    this.motionMode = mode;
    this.systemReduced = systemReduced;
    if (this.reducedMotion) this.velocity = [0, 0];
  }
  setSystemReducedMotion(systemReduced: boolean) {
    this.systemReduced = systemReduced;
    if (this.reducedMotion) this.velocity = [0, 0];
  }
  observe(stop: number) {
    this.sequence = 'route';
    this.stop = Math.max(0, Math.min(CHECKPOINTS.length - 1, Math.floor(stop)));
    this.target = Math.min(CHECKPOINTS.length - 1, this.stop + 1);
    this.playback = 'observing';
    this.elapsed = 0;
    this.last = null;
    this.resetView();
  }
  resetView() {
    if (this.playback !== 'observing') return;
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
    const scale = this.reducedMotion ? 0.2 : 1,
      limit = this.reducedMotion ? 0.25 : 1;
    this.velocity = [
      Math.max(-limit, Math.min(limit, dx * scale)),
      Math.max(-limit, Math.min(limit, dy * scale)),
    ];
  }
  zoomBy(factor: number) {
    if (this.playback === 'observing') {
      this.zoom = Math.max(0.8, Math.min(1.2, this.zoom * factor));
      this.updateInspection();
    }
  }
  toggleZoom() {
    if (this.playback !== 'observing') return;
    this.zoom = this.zoom < 0.9 ? 1 : 0.8;
    this.velocity = [0, 0];
    this.updateInspection();
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
  enterHorizon(now: number) {
    if (
      this.playback !== 'observing' ||
      CHECKPOINTS[this.stop].kind !== 'blackhole'
    )
      return false;
    this.start = {
      position: [...this.camera.position],
      rotation: [...this.camera.rotation],
    };
    this.sequence = 'descent';
    this.elapsed = 0;
    this.last = now;
    this.playback = 'flying';
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
    if (this.sequence === 'descent') {
      this.elapsed = DESCENT_SECONDS;
      this.playback = 'complete';
    } else if (this.playback !== 'observing') this.observe(this.target);
  }
  tick(now: number): TimedFrame {
    const dt = this.last === null ? 0 : Math.max(0, (now - this.last) / 1000);
    this.last = now;
    if (this.playback === 'flying') {
      const duration =
        this.sequence === 'descent'
          ? DESCENT_SECONDS
          : LEG_DURATIONS[Math.min(this.stop, this.target)];
      this.elapsed = Math.min(duration, this.elapsed + dt);
      if (this.elapsed >= duration - 1e-10) {
        if (this.sequence === 'descent') this.playback = 'complete';
        else this.observe(this.target);
        this.last = now;
      }
    } else if (this.playback === 'observing' && !this.drag) {
      this.inspect(this.velocity[0] * dt, this.velocity[1] * dt);
      const decay = this.reducedMotion ? 24 : 8;
      this.velocity = this.velocity.map((v) => v * Math.exp(-decay * dt));
    }
    return this.snapshot();
  }
  snapshot(): TimedFrame {
    return this.sequence === 'descent'
      ? this.descentSnapshot()
      : this.routeSnapshot();
  }
  private routeSnapshot(forceObservation = false): TimedFrame {
    const observing = forceObservation || this.playback === 'observing',
      leg = Math.min(this.stop, this.target),
      timing = schedule(
        this.elapsed,
        LEG_DURATIONS[leg] ?? LEG_DURATIONS[0],
        LEG_LENGTHS[leg],
      );
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
        u = timing.visualProgress;
      const direction = Math.sign(this.target - this.stop);
      const outbound: Vec = [0, 0, startCenter[2] + direction * 20];
      const inbound: Vec = [0, 0, endCenter[2] - direction * 20];
      const orbit = (
        from: Vec,
        to: Vec,
        center: Vec,
        fraction: number,
      ): Vec => {
        const origin = new Vector3(...from)
          .sub(new Vector3(...center))
          .normalize();
        const target = new Vector3(...to)
          .sub(new Vector3(...center))
          .normalize();
        const rotation = new Quaternion().setFromUnitVectors(origin, target);
        const turn = new Quaternion().slerp(rotation, fraction);
        const range =
          new Vector3(...from).distanceTo(new Vector3(...center)) *
            (1 - fraction) +
          new Vector3(...to).distanceTo(new Vector3(...center)) * fraction;
        return origin
          .applyQuaternion(turn)
          .multiplyScalar(range)
          .add(new Vector3(...center))
          .toArray() as Vec;
      };
      // Escape radially, round the safe viewing sphere, then cross between
      // its forward tangent points. Arbitrary inspection never cuts a world.
      const p =
        u < 0.15
          ? mix(this.start.position, a, u / 0.15)
          : u < 0.3
            ? orbit(a, outbound, startCenter, (u - 0.15) / 0.15)
            : u <= 0.7
              ? mix(outbound, inbound, (u - 0.3) / 0.4)
              : u <= 0.85
                ? orbit(inbound, b, endCenter, (u - 0.7) / 0.15)
                : mix(b, this.end.position, (u - 0.85) / 0.15);
      if (u >= 0.3 && u <= 0.7) {
        const swell =
          Math.sin((Math.PI * (u - 0.3)) / 0.4) ** 2 *
          (this.reducedMotion ? 0.35 : 1);
        const arc = ARCS[leg % ARCS.length];
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
              quintic(
                (this.elapsed - timing.departure) / (LEG_DURATIONS[leg] * 0.4),
              ),
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
      thrust: observing ? 0 : timing.thrust,
      scientificPosition,
      sequence: 'route',
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
      warp: observing || this.reducedMotion ? 0 : 0.075 * timing.rate * 3,
      dragging: this.drag,
      motionMode: this.motionMode,
      reducedMotion: this.reducedMotion,
    };
    Object.freeze(scientificPosition);
    Object.freeze(cameraPose.position);
    Object.freeze(cameraPose.rotation);
    Object.freeze(cameraPose);
    return Object.freeze(frame);
  }
  private descentSnapshot(): TimedFrame {
    // Reuse the final observation's route quantities. Descent never adds Euclidean tour distance.
    const playback = this.playback;
    const base = this.routeSnapshot(true);
    const radius = descentRadius(this.elapsed),
      center: Vec = [0, 0, this.stop * SPACING];
    const inward = canonical(this.stop);
    const blend = quintic(this.elapsed / 2);
    const rotation = new Quaternion(...this.start.rotation).slerp(
      new Quaternion(...inward.rotation),
      blend,
    );
    const startRange = norm(
      this.start.position.map((n, i) => n - center[i]) as Vec,
    );
    const inspectionRange =
      startRange * (1 - blend) + viewingRadius(this.stop) * blend;
    const cameraPose: CameraPose = {
      position: [...center],
      rotation: rotation.toArray(),
    };
    const bh = CHECKPOINTS[this.stop].position;
    const delta = base.scientificPosition.map((v, i) => v - bh[i]) as Vec;
    const scientificPosition = bh.map(
      (v, i) => v + (delta[i] * radius) / 1000,
    ) as Vec;
    const opticalRadius =
      20 * Math.pow(radius / 1000, Math.log(20) / Math.log(1000));
    const offset = new Vector3(
      0,
      0,
      (inspectionRange * opticalRadius) / 20,
    ).applyQuaternion(rotation);
    cameraPose.position = center.map(
      (n, i) => n + offset.getComponent(i),
    ) as Vec;
    Object.freeze(cameraPose.position);
    Object.freeze(cameraPose.rotation);
    Object.freeze(cameraPose);
    Object.freeze(scientificPosition);
    return Object.freeze({
      ...base,
      sequence: 'descent',
      playback,
      elapsed: this.elapsed,
      bhRadius: radius,
      approach: this.elapsed / DESCENT_SECONDS,
      phase: playback === 'complete' ? 'interior' : 'blackhole',
      flightPhase: 'observing',
      scientificPosition,
      earthKm: norm(scientificPosition),
      rangeKm: Math.max(0, radius - 1) * RS,
      localRangeKm: Math.max(0, radius - 1) * RS,
      cameraPose,
      cameraX: cameraPose.position[0],
      cameraZ: cameraPose.position[2],
      thrust: 0,
      warp: 0,
      speedKmS: 0,
      next: this.stop,
    });
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
