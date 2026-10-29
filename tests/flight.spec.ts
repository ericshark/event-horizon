import { test, expect } from '@playwright/test';
import { cameraZAt, flightAt, TravelMotion, distanceAxis } from '../src/flight';
import { CUMULATIVE, TOTAL } from '../src/journey';
test('camera poses and route distances remain continuous at encounters', () => {
  for (let i = 1; i < 20; i++) {
    expect(Math.abs(cameraZAt(i - 1e-7) - cameraZAt(i + 1e-7))).toBeLessThan(
      0.0001,
    );
    expect(
      Math.abs(flightAt(i - 1e-7).routeKm - flightAt(i + 1e-7).routeKm) /
        Math.max(1, TOTAL),
    ).toBeLessThan(1e-5);
  }
  expect(flightAt(0.075).yaw).toBeCloseTo(Math.PI * 0.5, 5);
  expect(flightAt(0.15).yaw).toBeCloseTo(Math.PI, 5);
  expect(flightAt(0.14).routeKm).toBe(0);
  for (let q = 1; q < 15; q += 0.01) {
    const s = flightAt(q);
    const nearby = Math.round(s.cameraZ / 120);
    expect(Math.hypot(s.cameraX, s.cameraZ - nearby * 120)).toBeGreaterThan(
      nearby === 7 ? 2.25 : 1,
    );
  }
});
test('warp rises with travel, reverses, settles and resets', () => {
  const m = new TravelMotion();
  m.update(0, 0.016);
  for (let i = 1; i <= 20; i++) m.update(i * 1e9, 0.016);
  expect(m.warp).toBeGreaterThan(0.1);
  expect(m.direction).toBe(1);
  m.update(0, 0.016);
  expect(m.direction).toBe(-1);
  for (let i = 0; i < 150; i++) m.update(0, 0.016);
  expect(m.warp).toBeLessThan(0.001);
  m.reset();
  expect(m.warp).toBe(0);
});
test('distance markers use linear proportions and retain real positions in clusters', () => {
  const first = distanceAxis(0, 0);
  expect(first.groups).toHaveLength(1);
  const a = distanceAxis(CUMULATIVE[12], 12);
  for (const g of a.groups)
    expect(g.fraction).toBeCloseTo(CUMULATIVE[g.indices[0]] / a.domain, 10);
  const last = distanceAxis(TOTAL, 20);
  expect(last.groups[0].indices).toContain(13);
  expect(CUMULATIVE[1] / last.domain).toBeLessThan(0.000001);
  expect(last.groups.at(-1)!.indices).toContain(20);
});
