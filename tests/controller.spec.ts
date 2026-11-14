import { test, expect } from '@playwright/test';
import { JourneyController, schedule, WheelIntent } from '../src/controller';
import { LEG_LENGTHS, pointAtDistance } from '../src/journey';
import { norm, sub, C, AU, LY } from '../src/science';
import { mph, earthDistance } from '../src/instruments';

test('six active seconds, frame partition independence and analytic speed integration', () => {
  for (const direction of [1, -1]) {
    for (const dt of [1 / 60, 0.07, 0.4, 6]) {
      const c = new JourneyController();
      c.observe(direction === 1 ? 0 : 1);
      c.launch(0, direction);
      for (let t = dt; t < 6 - 1e-8; t += dt) c.tick(t * 1000);
      const s = c.tick(6000);
      expect(s.playback).toBe('observing');
      expect(s.now).toBe(direction === 1 ? 1 : 0);
      expect(s.speedKmS).toBe(0);
    }
  }
  let distance = 0;
  for (let t = 0.0005; t < 6; t += 0.001)
    distance += schedule(t).rate * LEG_LENGTHS[0] * 0.001;
  expect(Math.abs(distance / LEG_LENGTHS[0] - 1)).toBeLessThan(0.001);
  expect(schedule(0).rate).toBe(0);
  expect(schedule(0.899).progress).toBe(0);
  expect(schedule(5.281).rate).toBe(0);
  for (const t of [0.9, 0.9 + 4.38 * 0.3, 0.9 + 4.38 * 0.55, 5.28]) {
    expect(
      Math.abs(schedule(t - 1e-7).rate - schedule(t + 1e-7).rate),
    ).toBeLessThan(1e-6);
  }
});
test('inspection leaves scientific quantities unchanged; pause, duplicate input, resume and skip', () => {
  const c = new JourneyController(),
    before = c.snapshot();
  c.inspect(2, 0.8);
  c.zoomBy(0.1);
  expect(c.snapshot().earthKm).toBe(before.earthKm);
  expect(c.snapshot().routeKm).toBe(before.routeKm);
  expect(before.earthKm).toBeGreaterThan(0);
  expect(before.routeKm).toBe(0);
  const captured = c.snapshot().cameraPose;
  expect(c.launch(0)).toBe(true);
  expect(c.launch(0)).toBe(false);
  expect(c.snapshot().cameraPose).toEqual(captured);
  c.tick(2200);
  c.pause(2200);
  const paused = c.snapshot();
  c.tick(600000);
  expect(c.snapshot()).toEqual(paused);
  c.resume(600000);
  expect(c.tick(601000).elapsed).toBeCloseTo(3.2);
  c.skip();
  expect(c.snapshot().now).toBe(1);
  expect(c.snapshot().speedKmS).toBe(0);
  c.launch(700000);
  expect(c.tick(702000).speedKmS).toBeGreaterThan(0);
});
test('scientific arc length, conversions, reverse speed and Earth displacement match the snapshot', () => {
  const c = new JourneyController();
  c.launch(0);
  let integrated = 0,
    previous = pointAtDistance(0, 0);
  for (let i = 1; i <= 2000; i++) {
    const next = pointAtDistance(0, i / 2000);
    integrated += norm(sub(next, previous));
    previous = next;
  }
  expect(Math.abs(integrated / LEG_LENGTHS[0] - 1)).toBeLessThan(0.001);
  for (let t = 0; t < 6000; t += 23) {
    const s = c.tick(t);
    expect(s.earthKm).toBe(norm(s.scientificPosition));
    expect(mph(s.speedKmS) / (s.speedKmS || 1)).toBeCloseTo(
      s.speedKmS ? 3600 / 1.609344 : 0,
      9,
    );
    expect(Number.isFinite(s.speedKmS / C)).toBe(true);
  }
  for (const km of [0.1 * AU - 1, 0.1 * AU, 0.1 * LY - 1, 0.1 * LY])
    expect(earthDistance(km).miles).toContain('mi');
  expect(earthDistance(0.1 * AU - 1).context).toBe('');
  expect(earthDistance(0.1 * AU).context).toContain('AU');
  expect(earthDistance(0.1 * LY - 1).context).toContain('AU');
  expect(earthDistance(0.1 * LY).context).toContain('ly');
});
test('camera is continuous and clears globes after arbitrary inspection and in reverse', () => {
  for (const stop of [0, 1])
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2])
      for (const pitch of [-1.15, 0, 1.15]) {
        const c = new JourneyController();
        c.observe(stop);
        c.inspect(yaw, pitch);
        c.zoomBy(0.8);
        const initial = c.snapshot().cameraPose;
        c.launch(0, stop === 0 ? 1 : -1);
        expect(c.snapshot().cameraPose).toEqual(initial);
        let previous = initial.position,
          minimum = Infinity,
          maximumStep = 0,
          finite = true;
        for (let t = 0; t <= 6000; t += 10) {
          const s = c.tick(t),
            p = s.cameraPose.position;
          for (const z of [0, 120])
            minimum = Math.min(minimum, Math.hypot(p[0], p[1], p[2] - z));
          maximumStep = Math.max(maximumStep, norm(sub(p, previous)));
          previous = p;
          finite = finite && s.cameraPose.rotation.every(Number.isFinite);
        }
        expect(minimum).toBeGreaterThan(1.035);
        expect(maximumStep).toBeLessThan(2.2);
        expect(finite).toBe(true);
      }
});
test('wheel threshold, timeout, reversal and post-arrival momentum silence gate', () => {
  const w = new WheelIntent();
  expect(w.feed(30, 0, true)).toBe(0);
  expect(w.feed(-30, 20, true)).toBe(0);
  expect(w.feed(-30, 30, true)).toBe(-1);
  expect(w.feed(120, 6000, true)).toBe(1);
  for (let t = 6100; t < 7000; t += 100) expect(w.feed(120, t, false)).toBe(0);
  for (let t = 7000; t < 8000; t += 100) expect(w.feed(120, t, true)).toBe(0);
  expect(w.feed(30, 8300, true)).toBe(0);
  expect(w.feed(30, 8600, true)).toBe(0);
  expect(w.feed(30, 8620, true)).toBe(1);
});
