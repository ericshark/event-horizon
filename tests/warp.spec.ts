import { test, expect } from '@playwright/test';
import { JourneyController, schedule } from '../src/controller';
import { CHECKPOINTS, LEG_DURATIONS } from '../src/journey';
import {
  BETA_MAX,
  FOV_EXPANSION,
  aberrateCos,
  dopplerFactor,
  exposureFor,
  unaberrateCos,
  warpAt,
  warpEnvelope,
} from '../src/warp';
import { selectTier, tierSettings } from '../src/post';
import { HERO, heroAssetsFor, residentAssets } from '../src/assets';
import { WORLDS } from '../src/worlds';

/** Run a leg on the controller's own clock. */
function fly(from: number, direction: 1 | -1, step = 0.05, reduced = false) {
  const c = new JourneyController();
  if (reduced) c.setMotionMode('reduced', false);
  c.observe(from);
  c.launch(0, direction);
  const duration = LEG_DURATIONS[direction > 0 ? from : from - 1];
  const frames = [];
  for (let t = step; t < duration; t += step) frames.push(c.tick(t * 1000));
  return { frames, duration };
}

test('warp is zero at rest, absent in reduced motion and full at cruise on every leg', () => {
  expect(warpEnvelope(0)).toBe(0);
  expect(warpEnvelope(Number.NaN)).toBe(0);
  expect(warpEnvelope(1)).toBeCloseTo(1, 12);
  expect(warpAt(1, true)).toEqual({
    envelope: 0,
    beta: 0,
    stretch: 0,
    bend: 0,
    fov: 0,
  });
  for (let leg = 0; leg < LEG_DURATIONS.length; leg++) {
    const { frames } = fly(leg, 1);
    const peak = Math.max(...frames.map((f) => warpAt(f.thrust).envelope));
    expect(peak, `leg ${leg} reaches full warp`).toBeCloseTo(1, 2);
    expect(warpAt(frames[0].thrust).envelope).toBeLessThan(0.02);
    expect(warpAt(frames.at(-1)!.thrust).envelope).toBeLessThan(0.02);
    expect(warpAt(peak).beta).toBeLessThanOrEqual(BETA_MAX);
  }
  for (const f of fly(3, 1, 0.1, true).frames)
    expect(warpAt(f.thrust, f.reducedMotion).envelope).toBe(0);
});

test('warp builds monotonically, decays monotonically and never steps', () => {
  for (const leg of [0, 5, 11]) {
    const dt = 0.05;
    const { frames } = fly(leg, 1, dt);
    const w = frames.map((f) => warpAt(f.thrust).envelope);
    const peakAt = w.indexOf(Math.max(...w));
    for (let i = 1; i < w.length; i++) {
      expect(Math.abs(w[i] - w[i - 1])).toBeLessThan(0.025);
      if (i <= peakAt) expect(w[i]).toBeGreaterThanOrEqual(w[i - 1] - 1e-9);
    }
    const plateauEnd = w.lastIndexOf(Math.max(...w));
    for (let i = plateauEnd + 1; i < w.length; i++)
      expect(w[i]).toBeLessThanOrEqual(w[i - 1] + 1e-9);
  }
});

test('reverse travel shows the same warp envelope as forward travel', () => {
  for (const leg of [0, 8]) {
    const forward = fly(leg, 1, 0.25).frames.map(
      (f) => warpAt(f.thrust).envelope,
    );
    const reverse = fly(leg + 1, -1, 0.25).frames.map(
      (f) => warpAt(f.thrust).envelope,
    );
    expect(reverse.length).toBe(forward.length);
    forward.forEach((w, i) => expect(reverse[i]).toBeCloseTo(w, 9));
  }
});

test('relativistic aberration bunches the sky forward and inverts exactly', () => {
  for (const c of [-1, -0.7, -0.2, 0, 0.3, 0.9, 1]) {
    expect(aberrateCos(c, 0)).toBeCloseTo(c, 12);
    expect(unaberrateCos(aberrateCos(c, 0.6), 0.6)).toBeCloseTo(c, 12);
    // Every direction except dead ahead/behind moves towards the heading.
    if (Math.abs(c) < 1) expect(aberrateCos(c, 0.6)).toBeGreaterThan(c);
  }
  // A star abeam (90°) appears about 52° from the heading at β = 0.62.
  expect((Math.acos(aberrateCos(0, BETA_MAX)) * 180) / Math.PI).toBeCloseTo(
    51.7,
    0,
  );
  expect(dopplerFactor(1, 0.6)).toBeGreaterThan(1);
  expect(dopplerFactor(-1, 0.6)).toBeLessThan(1);
  expect(dopplerFactor(0.3, 0)).toBe(1);
});

test('exposure adapts to glare and stays bounded', () => {
  const empty = exposureFor([]);
  expect(empty).toEqual({ scene: 1, sky: 1 });
  const planet = exposureFor([{ coverage: 0.3, star: false }]);
  expect(planet.scene).toBe(1);
  expect(planet.sky).toBeLessThan(0.5);
  const sun = exposureFor([{ coverage: 0.3, star: true }]);
  expect(sun.scene).toBeLessThan(0.6);
  expect(sun.sky).toBeLessThan(planet.sky);
  for (const coverage of [0, 0.01, 0.5, 1, 5])
    for (const star of [false, true])
      for (const envelope of [0, 1]) {
        const e = exposureFor([{ coverage, star }], envelope);
        expect(e.sky).toBeGreaterThanOrEqual(0.02);
        expect(e.sky).toBeLessThanOrEqual(1.35);
        expect(e.scene).toBeGreaterThan(0.2);
        expect(e.scene).toBeLessThanOrEqual(1);
      }
});

test('quality tiers follow capability, viewport and adaptive scale', () => {
  const base = {
    scale: 1,
    mobile: false,
    floatTargets: true,
    software: false,
  };
  expect(selectTier(base)).toBe('high');
  expect(selectTier({ ...base, mobile: true })).toBe('medium');
  expect(selectTier({ ...base, scale: 0.7 })).toBe('medium');
  expect(selectTier({ ...base, scale: 0.4 })).toBe('low');
  expect(selectTier({ ...base, software: true })).toBe('low');
  expect(selectTier({ ...base, floatTargets: false })).toBe('low');
  expect(selectTier({ ...base, software: true, forced: 'high' })).toBe('high');
  // A forced HDR tier still needs float render targets.
  expect(selectTier({ ...base, floatTargets: false, forced: 'high' })).toBe(
    'low',
  );
  expect(tierSettings('high')).toMatchObject({ post: true, hero: true });
  expect(tierSettings('medium')).toMatchObject({ post: true, hero: false });
  expect(tierSettings('low')).toMatchObject({ post: false, hero: false });
});

test('8K hero maps upgrade only resident base maps', () => {
  const earth = CHECKPOINTS.findIndex((p) => p.id === 'earth');
  expect(heroAssetsFor(earth).sort()).toEqual(['clouds', 'earth']);
  for (let stop = 0; stop < CHECKPOINTS.length; stop++)
    for (const name of heroAssetsFor(stop)) {
      expect(HERO[name]).toMatch(/-8k\.webp$/);
      expect(residentAssets(Math.max(0, stop - 1)).has(name)).toBe(true);
    }
  expect(HERO.milkyway).toBe('milkyway-8k.webp');
});

test('travel heading is a continuous unit vector and the bank returns to level', () => {
  for (const [leg, direction] of [
    [0, 1],
    [7, 1],
    [4, -1],
  ] as const) {
    const { frames } = fly(leg, direction, 0.05);
    let previous = frames[0].heading!;
    let maxBank = 0;
    for (const f of frames) {
      const h = f.heading!;
      expect(Math.hypot(...h)).toBeCloseTo(1, 9);
      const turn = Math.acos(
        Math.min(
          1,
          h[0] * previous[0] + h[1] * previous[1] + h[2] * previous[2],
        ),
      );
      expect(turn).toBeLessThan(0.35);
      previous = h;
      maxBank = Math.max(maxBank, Math.abs(f.bank ?? 0));
    }
    expect(maxBank).toBeGreaterThan(0.01);
    expect(maxBank).toBeLessThan(0.15);
    expect(Math.abs(frames[0].bank ?? 0)).toBe(0);
    expect(Math.abs(frames.at(-1)!.bank ?? 0)).toBe(0);
  }
  for (const f of fly(7, 1, 0.1, true).frames) expect(f.bank).toBe(0);
  expect(schedule(0, 16).thrust).toBe(0);
});

test('every textured world has an authored look with a light direction', () => {
  for (const p of CHECKPOINTS.filter(
    (c) => c.kind === 'planet' || c.kind === 'star',
  )) {
    const look = WORLDS[p.id];
    expect(look, p.id).toBeTruthy();
    expect(Math.hypot(...look.light)).toBeCloseTo(1, 9);
    expect(look.oblateness).toBeGreaterThanOrEqual(0);
    expect(look.oblateness).toBeLessThan(0.11);
  }
  expect(WORLDS.saturn.oblateness).toBeCloseTo(0.098, 3);
  expect(FOV_EXPANSION).toBeGreaterThan(8);
});
