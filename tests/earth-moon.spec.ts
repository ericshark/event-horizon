import { test, expect } from '@playwright/test';
import { LEG_DURATIONS } from '../src/journey';
import { hasHorizontalOverflow } from './helpers';

test('intentional wheel starts one flight; momentum, modifiers, dialogs and touch do not queue flights', async ({
  page,
}) => {
  test.setTimeout(240000); // software WebGL renders every resident planet
  await page.clock.install();
  await page.goto('/');
  const wheel = async (deltaY: number, extra = {}) =>
    page.locator('#inspection').dispatchEvent('wheel', { deltaY, ...extra });
  await wheel(150, { deltaX: 200 });
  await wheel(150, { ctrlKey: true });
  await wheel(15);
  await expect(page.locator('body')).toHaveAttribute(
    'data-playback',
    'observing',
  );
  await page.clock.runFor(350);
  await wheel(30);
  await wheel(30);
  await expect(page.locator('body')).toHaveAttribute('data-playback', 'flying');
  // Schedule inertia inside the page so host/render latency cannot create
  // >300ms gaps that would correctly count as a fresh intentional gesture.
  await page.evaluate(() => {
    (window as unknown as { __wheelInertia: number }).__wheelInertia =
      window.setInterval(
        () =>
          document
            .querySelector('#inspection')!
            .dispatchEvent(
              new WheelEvent('wheel', { deltaY: 120, bubbles: true }),
            ),
        100,
      );
  });
  await page.clock.runFor(LEG_DURATIONS[0] * 1000 + 500);
  await page.evaluate(() =>
    clearInterval(
      (window as unknown as { __wheelInertia: number }).__wheelInertia,
    ),
  );
  await expect(page.locator('#location')).toHaveText('Moon');
  await expect(page.locator('body')).toHaveAttribute(
    'data-playback',
    'observing',
  );
  await page.clock.runFor(350);
  await wheel(-80, { deltaMode: 1 });
  await page.getByRole('button', { name: 'Skip flight' }).press('Enter');
  await page.clock.runFor(100);
  await expect(page.locator('#location')).toHaveText('Earth');
  await page
    .getByRole('button', { name: 'Details', exact: true })
    .press('Enter');
  await page.locator('#details').dispatchEvent('wheel', { deltaY: 300 });
  await page.clock.runFor(1000);
  await expect(page.locator('body')).toHaveAttribute(
    'data-playback',
    'observing',
  );
  await page.keyboard.press('Escape');
});

test('pointer drag/pinch, resizing, hidden-tab pause and native keyboard activation', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  const scene = page.locator('#inspection');
  const before = await page.evaluate(
    () => window.__horizon!.state().cameraPose,
  );
  await scene.dispatchEvent('pointerdown', {
    pointerId: 1,
    clientX: 200,
    clientY: 200,
  });
  await scene.dispatchEvent('pointermove', {
    pointerId: 1,
    clientX: 230,
    clientY: 220,
  });
  await scene.dispatchEvent('pointerdown', {
    pointerId: 2,
    clientX: 300,
    clientY: 220,
  });
  await scene.dispatchEvent('pointermove', {
    pointerId: 2,
    clientX: 310,
    clientY: 220,
  });
  await scene.dispatchEvent('pointermove', {
    pointerId: 2,
    clientX: 340,
    clientY: 220,
  });
  await scene.dispatchEvent('pointerup', { pointerId: 2 });
  await scene.dispatchEvent('pointerup', { pointerId: 1 });
  await page.clock.runFor(100);
  expect(
    await page.evaluate(() => window.__horizon!.state().cameraPose),
  ).not.toEqual(before);
  await page.getByRole('button', { name: 'Next · Moon' }).focus();
  await page.keyboard.press('Enter');
  await page.clock.runFor(2100);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(20000);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(100);
  await expect(page.locator('body')).toHaveAttribute('data-playback', 'paused');
  await page
    .getByRole('button', { name: 'Resume', exact: true })
    .press('Enter');
  await page.clock.fastForward(LEG_DURATIONS[0] * 1000);
  await expect(page.locator('#location')).toHaveText('Moon');
  expect(await hasHorizontalOverflow(page)).toBe(false);
});
