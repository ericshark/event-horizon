import { test, expect } from '@playwright/test';
import {
  C,
  AU,
  LY,
  YEAR,
  PARKER,
  RS,
  tidal,
  travelTime,
  norm,
  sub,
  planetPosition,
} from '../src/science';
import {
  CHECKPOINTS,
  stateAt,
  TOTAL,
  CUMULATIVE,
  routePoint,
} from '../src/journey';
test('physical units, altitude and travel-time comparisons', () => {
  expect(LY / C).toBeCloseTo(YEAR, 5);
  expect(travelTime(384400)).toBeCloseTo(1.2822, 3);
  expect(PARKER).toBeCloseTo(192.2272, 3);
  expect(RS).toBeGreaterThan(28);
  expect(RS).toBeLessThan(29);
  expect(stateAt(0, 0).localRangeKm).toBe(20000);
  expect(stateAt(0, 0).earthKm).toBe(26371);
  expect(travelTime(20000, PARKER)).toBeCloseTo(104.04, 1);
  expect(norm(planetPosition('earth')) / AU).toBeGreaterThan(0.98);
});
test('route is continuous, includes detours, and avoids celestial surfaces', () => {
  expect(TOTAL).toBeGreaterThan(1560 * LY);
  expect(TOTAL).toBeLessThan(1600 * LY);
  for (let i = 0; i < 20; i++) {
    expect(stateAt(i, 1).routeKm).toBeCloseTo(stateAt(i + 1, 0).routeKm, 0);
    expect(norm(sub(routePoint(i, 1), routePoint(i + 1, 0)))).toBeLessThan(2);
    expect(CUMULATIVE[i + 1]).toBeGreaterThanOrEqual(CUMULATIVE[i]);
  }
  for (let i = 0; i < 14; i++)
    for (let j = 0; j <= 128; j++)
      for (const body of CHECKPOINTS.slice(0, 10)) {
        expect(
          norm(sub(routePoint(i, j / 128), body.position)),
          `${i} intersects ${body.id}`,
        ).toBeGreaterThan(body.radius);
      }
});
test('tidal force increases inward; horizon and interior states are valid', () => {
  expect(tidal(100 * RS) / tidal(200 * RS)).toBeCloseTo(8, 8);
  expect(stateAt(18, 0).bhRadius).toBe(1.5);
  expect(stateAt(19, 0).bhRadius).toBe(1);
  const end = stateAt(20, 1);
  expect(end.bhRadius).toBeLessThan(1);
  expect(end.remainingKm).toBe(0);
  expect(end.routeKm).toBe(TOTAL);
  expect(CHECKPOINTS.findIndex((p) => p.id === 'voyager')).toBeLessThan(
    CHECKPOINTS.findIndex((p) => p.id === 'oort'),
  );
});
