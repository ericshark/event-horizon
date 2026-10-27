import { Matrix3, Vector3 } from 'three';

interface CameraKey {
  at: number;
  distance: number;
  elevation: number;
  azimuth: number;
  roll: number;
  fov: number;
}

// One key per chapter boundary; distance is in Schwarzschild radii, angles in degrees.
const KEYS: CameraKey[] = [
  { at: 0.0, distance: 30, elevation: 5, azimuth: 0, roll: 0, fov: 38 },
  { at: 0.17, distance: 21, elevation: 9, azimuth: -10, roll: -4, fov: 42 },
  { at: 0.34, distance: 12.5, elevation: 17, azimuth: -28, roll: 5, fov: 50 },
  { at: 0.5, distance: 6.5, elevation: 9, azimuth: -75, roll: -9, fov: 60 },
  { at: 0.67, distance: 3.4, elevation: 4, azimuth: -125, roll: 14, fov: 74 },
  { at: 0.84, distance: 1.9, elevation: 32, azimuth: -155, roll: 0, fov: 88 },
  { at: 1.0, distance: 1.06, elevation: 68, azimuth: -172, roll: 0, fov: 104 },
];

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const DEG = Math.PI / 180;

export interface CameraState {
  position: Vector3;
  basis: Matrix3;
  tanHalfFov: number;
  distance: number;
}

export function cameraAt(progress: number, sway: number): CameraState {
  const p = Math.min(Math.max(progress, 0), 1);
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smooth((p - a.at) / (b.at - a.at));

  const distance = lerp(a.distance, b.distance, t);
  // A gentle orbit sway keeps the shot alive even when nobody is scrolling.
  const elevation =
    (lerp(a.elevation, b.elevation, t) + Math.sin(sway * 0.21) * 1.2) * DEG;
  const azimuth =
    (lerp(a.azimuth, b.azimuth, t) + Math.sin(sway * 0.13) * 2.5) * DEG;
  const roll = lerp(a.roll, b.roll, t) * DEG;
  const fov = lerp(a.fov, b.fov, t) * DEG;

  const position = new Vector3(
    Math.sin(azimuth) * Math.cos(elevation) * distance,
    Math.sin(elevation) * distance,
    Math.cos(azimuth) * Math.cos(elevation) * distance,
  );
  const forward = position.clone().negate().normalize();
  const worldUp = new Vector3(0, 1, 0);
  const right = new Vector3().crossVectors(forward, worldUp).normalize();
  const up = new Vector3().crossVectors(right, forward).normalize();
  const rolledRight = right
    .clone()
    .multiplyScalar(Math.cos(roll))
    .addScaledVector(up, Math.sin(roll));
  const rolledUp = up
    .clone()
    .multiplyScalar(Math.cos(roll))
    .addScaledVector(right, -Math.sin(roll));

  const basis = new Matrix3().set(
    rolledRight.x,
    rolledUp.x,
    forward.x,
    rolledRight.y,
    rolledUp.y,
    forward.y,
    rolledRight.z,
    rolledUp.z,
    forward.z,
  );

  return { position, basis, tanHalfFov: Math.tan(fov / 2), distance };
}
