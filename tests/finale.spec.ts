import { test, expect } from '@playwright/test';
import { JourneyController, descentRadius } from '../src/controller';
import { CHECKPOINTS, TOTAL, SCIENTIFIC_ORIGINS } from '../src/journey';
import { SPACING } from '../src/flight';
import { BH_MASS, RS, G, C, norm, sub } from '../src/science';
import {
  collectErrors,
  hasHorizontalOverflow,
  screenshotContrast,
} from './helpers';
test.use({ video: 'on' });
const final = CHECKPOINTS.length - 1;

test('descent milestones, partition independence, scientific offset, continuity and reset', () => {
  expect(RS).toBeCloseTo((2 * G * BH_MASS) / C ** 2, 6);
  expect(RS / 1e6).toBeCloseTo(11.8, 1);
  for (const [t, r] of [
    [0, 1000],
    [8, 100],
    [15, 1.5],
    [18, 1],
    [20, 0.8],
  ])
    expect(descentRadius(t)).toBeCloseTo(r, 9);
  for (const step of [0.016, 0.13, 2, 20]) {
    const c = new JourneyController();
    expect(c.enterHorizon(0)).toBe(false);
    c.observe(final);
    c.inspect(2, 1.15);
    c.zoomBy(0.8);
    const before = c.snapshot();
    expect(c.launch(0)).toBe(false);
    expect(c.enterHorizon(0)).toBe(true);
    expect(c.enterHorizon(0)).toBe(false);
    expect(
      norm(sub(c.snapshot().cameraPose.position, before.cameraPose.position)),
    ).toBeLessThan(1e-10);
    expect(c.snapshot().cameraPose.rotation).toEqual(
      before.cameraPose.rotation,
    );
    let previous = 1000;
    for (let t = step; t < 20; t += step) {
      const s = c.tick(t * 1000);
      expect(s.bhRadius).toBeLessThanOrEqual(previous);
      expect(s.earthKm).toBe(norm(s.scientificPosition));
      expect(
        norm(sub(s.scientificPosition, CHECKPOINTS[final].position)) / RS,
      ).toBeCloseTo(s.bhRadius, 3);
      expect(s.routeKm).toBe(TOTAL);
      expect(s.speedKmS).toBe(0);
      expect(s.cameraPose.position.every(Number.isFinite)).toBe(true);
      previous = s.bhRadius;
    }
    expect(c.tick(20000).playback).toBe('complete');
    expect(c.snapshot().bhRadius).toBeCloseTo(0.8);
    c.observe(0);
    expect(c.snapshot().sequence).toBe('route');
    expect(c.snapshot().elapsed).toBe(0);
    expect(c.snapshot().scientificPosition).toEqual(SCIENTIFIC_ORIGINS[0]);
  }
  // An exactly opposite inspection must turn around the center, never cut through it.
  const opposite = new JourneyController();
  opposite.observe(final);
  opposite.inspect(Math.PI, 0);
  opposite.enterHorizon(0);
  for (let ms = 0; ms <= 2000; ms += 10) {
    const p = opposite.tick(ms).cameraPose.position;
    expect(norm(sub(p, [0, 0, final * SPACING]))).toBeGreaterThan(6);
  }
  const inward = opposite.snapshot().cameraPose.rotation;
  expect(opposite.tick(15000).cameraPose.rotation).toEqual(inward);
  // Smooth at every milestone, including the optical camera handoff.
  for (const t of [0, 8, 15, 18, 20])
    expect(
      Math.abs(descentRadius(t - 0.001) - descentRadius(t + 0.001)),
    ).toBeLessThan(0.001);
});

test('pause freezes descent, finish reaches interior, reset discards queued inspection', () => {
  const c = new JourneyController();
  c.observe(final);
  c.enterHorizon(0);
  c.pause(8000);
  const paused = c.snapshot();
  expect(c.tick(100000)).toEqual(paused);
  c.resume(100000);
  expect(c.tick(107000).bhRadius).toBeCloseTo(1.5);
  c.pause(107000);
  c.skip();
  expect(c.snapshot().phase).toBe('interior');
  c.inspect(1, 1);
  c.zoomBy(0.2);
  c.resetView();
  expect(c.snapshot().playback).toBe('complete');
  c.observe(0);
  expect(c.tick(999999).position).toBe(0);
});

test('explicit entry, safe observation, pause/finish and replay through visible controls', async ({
  page,
}, info) => {
  const errors = collectErrors(page);
  await page.goto('/#interior');
  await expect(page.locator('#location')).toHaveText('Sagittarius A*');
  await page.waitForTimeout(350);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(350);
  await expect(page.locator('#ending')).toBeHidden();
  await expect(page.locator('#observation-facts > div')).toHaveCount(3);
  await page
    .getByRole('button', { name: 'Zoom in', exact: true })
    .press('Enter');
  await page.locator('#inspection').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await page
    .getByRole('button', { name: 'Details', exact: true })
    .press('Enter');
  await expect(page.locator('#details')).toContainText(
    'not a survival or geodesic simulation',
  );
  await page.getByRole('button', { name: 'Close details' }).press('Enter');
  await page.screenshot({
    path: `artifacts/eh-05/${info.project.name}-observation.png`,
  });
  expect(
    await screenshotContrast(
      page,
      await page.locator('#universe').screenshot(),
    ),
  ).toBeGreaterThan(5);
  if (info.project.name === 'desktop') {
    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: 1366, height: 768 });
    expect(await hasHorizontalOverflow(page)).toBe(false);
    await page.screenshot({
      path: 'artifacts/eh-05/desktop-short-observation.png',
    });
    await page.setViewportSize(viewport);
  }
  await page
    .getByRole('button', { name: 'Enter the event horizon', exact: true })
    .press('Enter');
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeFocused();
  await expect(page.locator('#speed-label')).toHaveText('Horizon approach');
  await expect(page.locator('#speed-readout')).toBeHidden();
  await expect(page.locator('#horizon-radius')).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).press('Enter');
  const radius = await page.locator('#horizon-radius').textContent();
  await page.waitForTimeout(350);
  await expect(page.locator('#horizon-radius')).toHaveText(radius!);
  await page
    .getByRole('button', { name: 'Resume', exact: true })
    .press('Enter');

  await page
    .getByRole('button', { name: 'Finish descent', exact: true })
    .press('Enter');

  await expect(page.locator('#ending')).toBeVisible();
  await expect(page.locator('#ending')).toContainText(
    'light-equivalent route time',
  );
  await expect(
    page.getByRole('link', { name: 'Return to Earth', exact: true }),
  ).toBeFocused();
  expect(await hasHorizontalOverflow(page)).toBe(false);
  await page.screenshot({
    path: `artifacts/eh-05/${info.project.name}-ending.png`,
  });
  await page
    .getByRole('link', { name: 'Return to Earth', exact: true })
    .press('Enter');

  await expect(page.locator('#location')).toHaveText('Earth');
  await expect(page.locator('#ending')).toBeHidden();
  await expect(page.locator('#speed-label')).toHaveText('Virtual travel speed');
  await expect(page.locator('#speed-digits')).toHaveAttribute(
    'data-value',
    '0',
  );
  await page
    .getByRole('button', { name: 'Next · Moon', exact: true })
    .press('Enter');

  await expect(page.locator('#location')).toHaveText('Moon');
  expect(errors).toEqual([]);
});

test('real-time final handoff and uninterrupted twenty-second descent', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors = collectErrors(page);
  await page.goto('/#proxima');
  await page
    .getByRole('button', { name: 'Next · Sagittarius A*', exact: true })
    .press('Enter');
  // Record the full final flight and descent using real playback timestamps.
  await expect(
    page.getByRole('button', { name: 'Enter the event horizon', exact: true }),
  ).toBeVisible({ timeout: 70000 });
  await page
    .getByRole('button', { name: 'Enter the event horizon', exact: true })
    .click();
  await expect(page.locator('#ending')).toBeVisible({ timeout: 35000 });
  expect(errors).toEqual([]);
  expect(await hasHorizontalOverflow(page)).toBe(false);
  await page.screenshot({
    path: `artifacts/eh-05/${info.project.name}-realtime-ending.png`,
  });
  await page.close();
  await page
    .video()!
    .saveAs(`artifacts/eh-05/${info.project.name}-handoff-descent.webm`);
});

test('short viewport and static fallback retain explicit ending, replay and sound preference', async ({
  page,
}, info) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => {
    localStorage.setItem('event-horizon.sound', 'on');
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith('webgl')) return null;
      return original.call(this, type as '2d', ...(args as []));
    } as typeof original;
  });
  await page.goto('/#horizon');
  await expect(page.locator('html')).toHaveClass(/no-webgl/);
  await expect(page.locator('#ending')).toBeHidden();
  await page
    .getByRole('button', { name: 'Enter the event horizon', exact: true })
    .click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('#playback-label')).toHaveText('Paused');
  await page
    .getByRole('button', { name: 'Finish descent', exact: true })
    .click();
  await expect(page.locator('#ending')).toBeVisible();
  expect(await hasHorizontalOverflow(page)).toBe(false);
  await page.screenshot({
    path: `artifacts/eh-05/${info.project.name}-short-fallback-ending.png`,
  });
  await page
    .getByRole('link', { name: 'Return to Earth', exact: true })
    .click();
  await expect(page.locator('#location')).toHaveText('Earth');
  expect(
    await page.evaluate(() => localStorage.getItem('event-horizon.sound')),
  ).toBe('on');
  expect(errors).toEqual([]);
});
