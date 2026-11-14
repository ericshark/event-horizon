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
  expect(RS).toBeGreaterThan(11.8e6);
  expect(RS).toBeLessThan(11.9e6);
  expect(stateAt(0, 0).localRangeKm).toBe(20000);
  expect(stateAt(0, 0).earthKm).toBe(26371);
  expect(travelTime(20000, PARKER)).toBeCloseTo(104.04, 1);
  expect(norm(planetPosition('earth')) / AU).toBeGreaterThan(0.98);
});
test('route is continuous, includes detours, and avoids celestial surfaces', () => {
  expect(TOTAL).toBeGreaterThan(26000 * LY);
  expect(TOTAL).toBeLessThan(27000 * LY);
  for (let i = 0; i < CHECKPOINTS.length - 1; i++) {
    expect(stateAt(i, 1).routeKm).toBeCloseTo(stateAt(i + 1, 0).routeKm, 0);
    expect(norm(sub(routePoint(i, 1), routePoint(i + 1, 0)))).toBeLessThan(2);
    expect(CUMULATIVE[i + 1]).toBeGreaterThanOrEqual(CUMULATIVE[i]);
  }
  for (let i = 0; i < CHECKPOINTS.length - 1; i++) {
    let clearance = Infinity;
    for (let j = 0; j <= 128; j++)
      for (const body of CHECKPOINTS.slice(0, 10))
        clearance = Math.min(
          clearance,
          norm(sub(routePoint(i, j / 128), body.position)) /
            (body.radius *
              (body.id === 'saturn' ? 2.4 : body.id === 'earth' ? 1.035 : 1)),
        );
    expect(clearance, `leg ${i} surface/ring clearance`).toBeGreaterThan(1);
  }
});
test('Sagittarius A* observation includes the local offset and never descends', () => {
  expect(tidal(100 * RS) / tidal(200 * RS)).toBeCloseTo(8, 8);
  const i = CHECKPOINTS.length - 1,
    end = stateAt(i, 1);
  expect(end.bhRadius).toBe(1000);
  expect(end.remainingKm).toBe(0);
  expect(end.routeKm).toBe(TOTAL);
  expect(norm(CHECKPOINTS[i].position) / LY).toBeCloseTo(26000, 6);
  expect(norm(sub(routePoint(i, 0), CHECKPOINTS[i].position)) / RS).toBeCloseTo(
    1000,
    5,
  );
});
