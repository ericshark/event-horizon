import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PerspectiveCamera } from 'three';
import { audioTargets } from '../src/audio';
import {
  JourneyController,
  PROBE_VIEWING_RADIUS,
  schedule,
  type TimedFrame,
} from '../src/controller';
import { CHECKPOINTS, LEG_DURATIONS, LEG_LENGTHS } from '../src/journey';
import { AU } from '../src/science';
import {
  fovExpansion,
  sceneryAt,
  streakStrength,
  VOYAGER_AU,
} from '../src/scenery';
import { buildVoyager, voyagerExtent } from '../src/voyager';
import {
  brightColor,
  collectErrors,
  hasHorizontalOverflow,
  screenshotContrast,
} from './helpers';

const index = (id: string) => CHECKPOINTS.findIndex((p) => p.id === id);
/** Run a leg on the controller's own clock, sampling every `step` seconds. */
function sample(from: number, direction: 1 | -1, step = 0.05) {
  const c = new JourneyController();
  c.observe(from);
  c.launch(0, direction);
  const frames: TimedFrame[] = [];
  const duration = LEG_DURATIONS[direction > 0 ? from : from - 1];
  for (let t = step; t < duration; t += step) frames.push(c.tick(t * 1000));
  return { frames, final: c.tick(duration * 1000 + 1), duration };
}

test('Neptune→Voyager, Voyager→Proxima and Proxima→Sagittarius A* keep the 26/34/50 s timing and derived speed', () => {
  for (const [from, seconds] of [
    [9, 26],
    [10, 34],
    [11, 50],
  ] as const) {
    expect(LEG_DURATIONS[from]).toBe(seconds);
    const { frames, final } = sample(from, 1, 0.1);
    expect(final.playback).toBe('observing');
    expect(final.now).toBe(from + 1);
    expect(frames.every((f) => f.playback === 'flying')).toBe(true);
    const moving =
      seconds - Math.min(2, 0.15 * seconds) - Math.min(1.2, 0.12 * seconds);
    const plateau = LEG_LENGTHS[from] / (0.625 * moving);
    const peak = Math.max(...frames.map((f) => f.speedKmS));
    expect(peak).toBeGreaterThan(plateau * 0.999);
    expect(peak).toBeLessThanOrEqual(plateau * (1 + 1e-9));
    expect(frames[0].speedKmS).toBe(0);
  }
});

test('long-leg effects build and decay smoothly with no steps in thrust, FOV or streaks', () => {
  for (const leg of [9, 10, 11]) {
    const dt = 0.1;
    const { frames } = sample(leg, 1, dt);
    let previous = { streak: 0, fov: 0, thrust: 0 };
    for (const f of frames) {
      const now = {
        thrust: f.thrust,
        streak: streakStrength(leg, f.warp, f.thrust),
        fov: fovExpansion(leg, f.warp, f.thrust),
      };
      expect(Math.abs(now.thrust - previous.thrust)).toBeLessThan(0.09);
      expect(Math.abs(now.streak - previous.streak)).toBeLessThan(0.012);
      expect(Math.abs(now.fov - previous.fov)).toBeLessThan(0.3);
      expect(now.fov).toBeLessThanOrEqual(3.5 + 1e-9);
      previous = now;
    }
    expect(previous.thrust).toBeLessThan(0.02);
    expect(Math.max(...frames.map((f) => f.thrust))).toBeCloseTo(1, 2);
  }
  expect(schedule(0, 50).thrust).toBe(0);
  expect(streakStrength(11, 0, 0)).toBe(0);
});

test('scenery evolves across the long legs and respects scientific boundaries', () => {
  const at = (au: number, position = 9.5) => sceneryAt(au * AU, position);
  expect(at(40).kuiper).toBeGreaterThan(0.5);
  expect(at(130).heliopause).toBeGreaterThan(0.5);
  // Voyager 1 (≈172 AU) is before the Oort Cloud and has no interstellar field.
  expect(at(VOYAGER_AU, 10).oort).toBe(0);
  expect(at(VOYAGER_AU, 10).interstellar).toBe(0);
  expect(at(VOYAGER_AU, 10).kuiper).toBe(0);
  expect(at(8_000, 10.2).oort).toBeGreaterThan(0.3);
  expect(at(268_800, 11).interstellar).toBeGreaterThan(0.99);
  expect(at(268_800, 11).oort).toBe(0);
  expect(sceneryAt(0, 4).kuiper).toBe(0);
  // Sky tint is continuous but differs from leg to leg, so no leg repeats a tunnel.
  const tints = [9.5, 10.5, 11.5].map((p) => sceneryAt(1e12, p).tint);
  for (const [a, b] of [
    [0, 1],
    [1, 2],
  ])
    expect(
      Math.hypot(...tints[a].map((v, i) => v - tints[b][i])),
    ).toBeGreaterThan(0.04);
  let previous = sceneryAt(1e12, 9).tint;
  for (let p = 9.01; p <= 12; p += 0.01) {
    const tint = sceneryAt(1e12, p).tint;
    expect(Math.hypot(...tint.map((v, i) => v - previous[i]))).toBeLessThan(
      0.01,
    );
    previous = tint;
  }
  expect(sceneryAt(1e12, 11.9).galactic).toBeGreaterThan(
    sceneryAt(1e12, 11.1).galactic,
  );
});

test('Voyager has dish, core, booms and antennas; its silhouette fits at maximum zoom', () => {
  const craft = buildVoyager();
  expect(craft.children.length).toBeGreaterThan(20);
  const extent = voyagerExtent();
  const camera = new PerspectiveCamera(40);
  const nearest = 0.8 * PROBE_VIEWING_RADIUS;
  expect(nearest, 'camera outside the model').toBeGreaterThan(extent * 1.2);
  expect(extent * 1.05).toBeLessThan(
    nearest * Math.tan((camera.fov * Math.PI) / 360),
  );
  const voyager = CHECKPOINTS[index('voyager')];
  expect(voyager.kind).toBe('probe');
  // No planet-like globe: nothing in the model is a full sphere larger than a tank.
  const c = new JourneyController();
  c.observe(index('voyager'));
  c.zoomBy(0.01);
  c.inspect(0, 5);
  const [x, y, z] = c.snapshot().cameraPose.position;
  expect(Math.hypot(x, y, z - index('voyager') * 120)).toBeGreaterThan(
    extent * 1.2,
  );
});

test('audio targets follow the snapshot: silent when off, paused or hidden, no steps', () => {
  const run = sample(11, 1, 0.05);
  const on = run.frames.map((f) => audioTargets(f, true));
  expect(audioTargets(run.frames[200], false).master).toBe(0);
  expect(audioTargets(run.frames[200], true, false).master).toBe(0);
  expect(
    audioTargets({ ...run.frames[200], playback: 'paused' }, true).master,
  ).toBe(0);
  let previous = on[0];
  for (const t of on) {
    for (const key of ['bed', 'drive', 'arrival', 'master'] as const) {
      expect(t[key]).toBeGreaterThanOrEqual(0);
      expect(t[key]).toBeLessThanOrEqual(1);
      expect(Math.abs(t[key] - previous[key])).toBeLessThan(
        key === 'arrival' ? 0.15 : 0.05,
      );
    }
    previous = t;
  }
  // Arrival blooms only while settling, and decays to zero as the leg ends.
  const arrivals = run.frames.map((f) => audioTargets(f, true).arrival);
  expect(Math.max(...arrivals)).toBeGreaterThan(0.9);
  expect(arrivals.at(-1)!).toBeLessThan(0.05);
  expect(
    run.frames.every(
      (f) =>
        f.flightPhase === 'settling' || audioTargets(f, true).arrival === 0,
    ),
  ).toBe(true);
  // Reverse and observing frames are equally valid inputs.
  for (const f of sample(12, -1, 0.5).frames)
    expect(audioTargets(f, true).drive).toBeLessThanOrEqual(1);
  const rest = new JourneyController();
  rest.observe(11);
  expect(audioTargets(rest.snapshot(), true).drive).toBe(0);
});

test('procedural assets and synthesised audio are credited', () => {
  const credits = JSON.parse(
    readFileSync('public/textures/credits.json', 'utf8'),
  ) as {
    file: string;
    source: string;
    modifications?: string;
  }[];
  for (const needle of ['voyager', 'proxima', 'audio']) {
    const entry = credits.find((c) => c.file.includes(needle));
    expect(entry, needle).toBeTruthy();
    expect(entry!.source).toMatch(/^https:/);
    expect(entry!.modifications).toBeTruthy();
  }
});

function clip(page: Page) {
  const { width } = page.viewportSize()!;
  return width < 760
    ? { x: 100, y: 150, width: 190, height: 130 }
    : { x: 620, y: 300, width: 400, height: 300 };
}
async function ready(page: Page) {
  await expect
    .poll(() => page.evaluate(() => window.__horizon!.render()?.pending))
    .toBe(0);
  const start = await page.evaluate(() => window.__horizon!.frames());
  await expect
    .poll(() => page.evaluate(() => window.__horizon!.frames()))
    .toBeGreaterThan(start + 5);
  await page.waitForTimeout(500);
}

for (const [id, name] of [
  ['voyager', 'Voyager 1'],
  ['proxima', 'Proxima Centauri'],
] as const) {
  test(`${id}: inspection at rest and maximum zoom is complete and overflow-free`, async ({
    page,
  }, info) => {
    const errors = collectErrors(page);
    await page.goto(`/#${id}`);
    await expect(page.locator('#location')).toHaveText(name);
    await ready(page);
    const rest = await page.screenshot({
      path: `artifacts/eh-04/${info.project.name}-${id}.png`,
    });
    expect(await screenshotContrast(page, rest)).toBeGreaterThan(8);
    const region = page.getByRole('region', { name: 'Inspect world' });
    await region.focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press('+');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(600);
    const zoomed = await page.screenshot({
      path: `artifacts/eh-04/${info.project.name}-${id}-max-zoom.png`,
    });
    expect(await screenshotContrast(page, zoomed)).toBeGreaterThan(8);
    const color = await brightColor(
      page,
      await page.screenshot({ clip: clip(page) }),
    );
    expect(color.n).toBeGreaterThan(200);
    if (id === 'proxima') {
      // Red dwarf: strongly red, unlike the yellow-white Sun.
      expect(color.r).toBeGreaterThan(color.g * 1.7);
      expect(color.r).toBeGreaterThan(color.b * 2.5);
    }
    expect(await hasHorizontalOverflow(page)).toBe(false);
    expect(errors).toEqual([]);
  });
}

test('audio lifecycle: off by default, explicit toggle, persistence, pause, hidden tab, skip, jump, disable', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const audio = () => page.evaluate(() => window.__horizon!.audio());
  await page.goto('/#neptune');
  await ready(page);
  expect(await audio()).toMatchObject({
    status: 'off',
    context: 'none',
    preference: false,
  });
  const toggle = page.getByRole('button', { name: /Sound/ });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await audio()).context).toBe('running');
  // Persisted: a reload with the stored preference either resumes or waits for a gesture.
  await page.reload();
  await ready(page);
  expect((await audio()).preference).toBe(true);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  if ((await audio()).status === 'blocked') {
    await expect(toggle).toContainText('tap to allow');
    await toggle.click();
  }
  await expect.poll(async () => (await audio()).status).toBe('on');

  await page.getByRole('button', { name: /^Next · Voyager 1/ }).click();
  await expect(page.locator('body')).toHaveAttribute('data-playback', 'flying');
  await expect
    .poll(async () => (await audio()).targets.drive, { timeout: 20000 })
    .toBeGreaterThan(0.2);
  expect((await audio()).targets.master).toBe(1);
  // Pause fades the master target to zero; resume brings it back.
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect.poll(async () => (await audio()).targets.master).toBe(0);
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect.poll(async () => (await audio()).targets.master).toBe(1);
  // A hidden tab suspends audio and returns paused.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await audio()).context).toBe('suspended');
  expect((await audio()).hidden).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await audio()).context).toBe('running');
  // Returning from a hidden tab leaves travel paused until explicitly resumed.
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expect.poll(async () => (await audio()).targets.master).toBe(0);
  await page.getByRole('button', { name: 'Resume' }).click();
  // Skip lands on the destination and the travel bed settles.
  await page.getByRole('button', { name: 'Skip flight' }).click();
  await expect(page.locator('#location')).toHaveText('Voyager 1');
  await expect.poll(async () => (await audio()).targets.drive).toBe(0);
  // Direct jump while sound is active.
  await page.locator('#checkpoints').selectOption('proxima');
  await expect(page.locator('#location')).toHaveText('Proxima Centauri');
  expect((await audio()).targets.drive).toBe(0);
  // Disable: silent, preference stored, context suspended.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await audio()).targets.master).toBe(0);
  await expect
    .poll(async () => (await audio()).context, { timeout: 5000 })
    .toBe('suspended');
  expect(
    await page.evaluate(() => localStorage.getItem('event-horizon.sound')),
  ).toBe('off');
  expect(errors).toEqual([]);
});

test('missing or denied audio leaves silent travel usable without errors', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.addInitScript(() => {
    // @ts-expect-error simulate a browser with no Web Audio
    delete window.AudioContext;
    // @ts-expect-error simulate a browser with no Web Audio
    delete window.webkitAudioContext;
  });
  await page.goto('/#neptune');
  await ready(page);
  await expect(page.locator('#sound-toggle')).toBeHidden();
  await page.getByRole('button', { name: /^Next · Voyager 1/ }).click();
  await expect(page.locator('body')).toHaveAttribute('data-playback', 'flying');
  await page.getByRole('button', { name: 'Skip flight' }).click();
  await expect(page.locator('#location')).toHaveText('Voyager 1');
  expect(errors).toEqual([]);
});

test('Voyager→Proxima→Sagittarius A* real-time flights keep evolving scenery and smooth decay', async ({
  page,
}, info) => {
  test.setTimeout(240000);
  const errors = collectErrors(page);
  await page.goto('/#voyager');
  await ready(page);
  await page.getByRole('button', { name: /^Next · Proxima/ }).click();
  await expect(page.locator('body')).toHaveAttribute('data-playback', 'flying');
  await expect(page.locator('#location')).toHaveText('Proxima Centauri', {
    timeout: 60000,
  });
  await ready(page);
  await page.getByRole('button', { name: /^Next · Sagittarius/ }).click();
  const thrust: number[] = [];
  const weights: Record<string, number>[] = [];
  const started = Date.now();
  for (const [i, at] of [6, 16, 26, 36, 44, 48].entries()) {
    await page.waitForTimeout(Math.max(0, at * 1000 - (Date.now() - started)));
    const shot = await page.screenshot({
      path: `artifacts/eh-04/${info.project.name}-proxima-sgra-${i}.png`,
    });
    expect(await screenshotContrast(page, shot)).toBeGreaterThan(2);
    const sample = await page.evaluate(() => ({
      thrust: (window.__horizon!.state() as unknown as TimedFrame).thrust,
      speed: document.querySelector('#speed-digits')!.textContent,
      earth: document.querySelector('#earth-miles')!.textContent,
      scenery: window.__horizon!.render()!.scenery,
      fov: window.__horizon!.render()!.fov,
    }));
    expect(sample.speed!.length).toBeGreaterThan(0);
    expect(sample.earth!.length).toBeGreaterThan(0);
    if (info.project.name === 'desktop') expect(sample.fov).toBeLessThan(44);
    else expect(sample.fov).toBe(100);
    thrust.push(sample.thrust);
    weights.push(sample.scenery);
  }
  expect(thrust[3]).toBeGreaterThan(thrust[4]);
  expect(thrust[4]).toBeGreaterThan(thrust[5]);
  expect(thrust[5]).toBeLessThan(0.35);
  expect(weights.every((w) => w.interstellar > 0.4)).toBe(true);
  await expect(page.locator('#location')).toHaveText('Sagittarius A*', {
    timeout: 30000,
  });
  expect(errors).toEqual([]);
});
