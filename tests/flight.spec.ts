import { test, expect } from '@playwright/test';
import { distanceAxis } from '../src/flight';
import { CUMULATIVE, TOTAL, CHECKPOINTS } from '../src/journey';
test('distance markers preserve linear proportions and selectable clusters', () => {
  expect(distanceAxis(0, 0).groups).toHaveLength(1);
  for (let i = 1; i < CHECKPOINTS.length; i++) {
    const axis = distanceAxis(CUMULATIVE[i], i);
    for (const group of axis.groups)
      expect(group.fraction).toBeCloseTo(
        CUMULATIVE[group.indices[0]] / axis.domain,
        10,
      );
  }
  const last = distanceAxis(TOTAL, CHECKPOINTS.length - 1);
  expect(last.groups[0].indices.length).toBeGreaterThan(8);
  expect(CUMULATIVE[1] / last.domain).toBeLessThan(0.000001);
  expect(last.groups.at(-1)!.indices).toContain(CHECKPOINTS.length - 1);
});
