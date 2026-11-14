import { test, expect } from '@playwright/test';
import { JourneyController, schedule } from '../src/controller';
import {
  CHECKPOINTS,
  LEG_DURATIONS,
  PLAYBACK_SECONDS,
  LEG_LENGTHS,
  pointAtDistance,
  resolveStop,
  OBSERVATION_FACTS,
} from '../src/journey';
import { norm, sub } from '../src/science';

test('exact catalog, sourced content, legacy redirects and 236-second authored schedule', () => {
  expect(CHECKPOINTS.map((p) => p.id)).toEqual([
    'earth',
    'moon',
    'mercury',
    'venus',
    'sun',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'voyager',
    'proxima',
    'sagittarius-a',
  ]);
  expect(LEG_DURATIONS).toEqual([6, 8, 10, 12, 14, 16, 18, 20, 22, 26, 34, 50]);
  expect(PLAYBACK_SECONDS).toBe(236);
  for (const p of CHECKPOINTS) {
    expect(OBSERVATION_FACTS[p.id].facts).toHaveLength(3);
    expect(OBSERVATION_FACTS[p.id].source).toMatch(/^https:\/\//);
  }
  for (const [id, target] of Object.entries({
    kuiper: 10,
    heliopause: 10,
    oort: 11,
    interstellar: 12,
    gaia: 12,
    tides: 12,
    photon: 12,
    horizon: 12,
    descent: 12,
    interior: 12,
    unknown: 0,
  }))
    expect(resolveStop(id)).toBe(target);
});

test('every connection in both directions: partition independence, analytic integration, finite telemetry and exact endpoints', () => {
  for (let leg = 0; leg < LEG_DURATIONS.length; leg++) {
    const duration = LEG_DURATIONS[leg];
    let integral = 0,
      sampledLength = 0,
      prev = pointAtDistance(leg, 0);
    for (let i = 1; i <= 2000; i++) {
      integral +=
        (schedule(((i - 0.5) * duration) / 2000, duration).rate * duration) /
        2000;
      const p = pointAtDistance(leg, i / 2000);
      sampledLength += norm(sub(p, prev));
      prev = p;
    }
    expect(Math.abs(integral - 1)).toBeLessThan(0.001);
    expect(Math.abs(sampledLength / LEG_LENGTHS[leg] - 1)).toBeLessThan(0.001);
    for (const direction of [1, -1])
      for (const dt of [0.1, 0.4, duration]) {
        const c = new JourneyController(),
          start = direction === 1 ? leg : leg + 1,
          end = start + direction;
        c.observe(start);
        c.launch(0, direction);
        let previous = c.snapshot(),
          monotonic = true,
          displaced = true,
          finite = true,
          positive = true;
        for (let t = dt; t < duration; t += dt) {
          const s = c.tick(t * 1000);
          monotonic &&= (s.routeKm - previous.routeKm) * direction >= 0;
          displaced &&= s.earthKm === norm(s.scientificPosition);
          positive &&= s.speedKmS >= 0;
          finite &&= [
            ...s.scientificPosition,
            ...s.cameraPose.position,
            ...s.cameraPose.rotation,
            s.speedKmS,
          ].every(Number.isFinite);
          previous = s;
        }
        expect({ monotonic, displaced, finite, positive }).toEqual({
          monotonic: true,
          displaced: true,
          finite: true,
          positive: true,
        });
        const arrived = c.tick(duration * 1000);
        expect(arrived.now).toBe(end);
        expect(arrived.playback).toBe('observing');
        expect(arrived.speedKmS).toBe(0);
        expect(
          norm(
            sub(
              arrived.scientificPosition,
              pointAtDistance(leg, direction > 0 ? 1 : 0),
            ),
          ),
        ).toBeLessThan(2);
      }
  }
});

test('all-stop inspection, continuity and camera clearance including rings; direct jumps reset speed', () => {
  for (let stop = 0; stop < CHECKPOINTS.length; stop++)
    for (const direction of [1, -1]) {
      const c = new JourneyController();
      c.observe(stop);
      const before = c.snapshot();
      c.inspect(2, 1);
      c.zoomBy(0.01);
      expect(c.snapshot().earthKm).toBe(before.earthKm);
      expect(c.snapshot().routeKm).toBe(before.routeKm);
      const initial = c.snapshot().cameraPose;
      if (stop + direction < 0 || stop + direction >= CHECKPOINTS.length) {
        expect(c.launch(0, direction)).toBe(false);
        continue;
      }
      c.launch(0, direction);
      expect(c.snapshot().cameraPose).toEqual(initial);
      const duration = LEG_DURATIONS[Math.min(stop, stop + direction)];
      let minimumClearance = Infinity;
      for (let j = 0; j < 1000; j++) {
        const s = c.tick(j * duration),
          p = s.cameraPose.position;
        for (const i of [stop, stop + direction])
          minimumClearance = Math.min(
            minimumClearance,
            Math.hypot(p[0], p[1], p[2] - i * 120) /
              (CHECKPOINTS[i].id === 'saturn' ? 2.4 : 1.035),
          );
      }
      expect(minimumClearance).toBeGreaterThan(1);
      c.observe(12);
      expect(c.snapshot().speedKmS).toBe(0);
      expect(c.snapshot().bhRadius).toBe(1000);
    }
});

test('Earth displacement can decrease on detours while forward route distance grows', () => {
  let decreases = 0;
  for (let leg = 1; leg < LEG_DURATIONS.length; leg++) {
    const c = new JourneyController();
    c.observe(leg);
    c.launch(0, 1);
    let previous = c.snapshot();
    for (let step = 1; step <= 100; step++) {
      const state = c.tick(step * LEG_DURATIONS[leg] * 10);
      if (state.earthKm < previous.earthKm) decreases++;
      expect(state.routeKm).toBeGreaterThanOrEqual(previous.routeKm);
      previous = state;
    }
  }
  expect(decreases).toBeGreaterThan(0);
});
