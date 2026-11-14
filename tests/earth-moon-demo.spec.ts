import { test, expect } from '@playwright/test';
import { collectErrors, hasHorizontalOverflow } from './helpers';
test.use({ video: 'on' });
test('Earth inspection, six-second flight, pause/resume, Moon inspection and reverse', async ({
  page,
}, info) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.locator('#location')).toHaveText('Earth');
  await expect(page.locator('#observation-facts > div')).toHaveCount(3);
  await expect(page.locator('#earth-miles')).toHaveText('16,386 mi');
  await expect(
    page.getByRole('button', { name: 'Previous', exact: true }),
  ).toBeDisabled();
  const scene = page.getByRole('region', { name: 'Inspect world' });
  const canonical = await page.evaluate(
    () => window.__horizon!.state().cameraPose,
  );
  await scene.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('+');
  await expect
    .poll(() => page.evaluate(() => window.__horizon!.state().cameraPose))
    .not.toEqual(canonical);
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect
    .poll(() => page.evaluate(() => window.__horizon!.state().cameraPose))
    .toEqual(canonical);
  await page.screenshot({
    path: `artifacts/${info.project.name}-timed-earth.png`,
  });
  await page.getByRole('button', { name: 'Next · Moon' }).click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeFocused();
  await expect(page.locator('#speed-digits')).toHaveAttribute(
    'data-value',
    /[1-9]\d+/,
  );
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('#playback-label')).toHaveText('Paused');
  const frozen = await page.locator('#speed-digits').getAttribute('data-value');
  await page.waitForTimeout(250);
  expect(await page.locator('#speed-digits').getAttribute('data-value')).toBe(
    frozen,
  );
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('#location')).toHaveText('Moon', {
    timeout: 15000,
  });
  await expect(
    page.getByRole('button', { name: 'Next · Mercury' }),
  ).toBeFocused();
  await expect(page.locator('#speed-digits')).toHaveAttribute(
    'data-value',
    '0',
  );
  await page.screenshot({
    path: `artifacts/${info.project.name}-timed-moon.png`,
  });
  await scene.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('-');
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(page.locator('#location')).toHaveText('Earth', {
    timeout: 15000,
  });
  await expect(page.locator('body')).toHaveAttribute(
    'data-playback',
    'observing',
  );
  expect(await hasHorizontalOverflow(page)).toBe(false);
  expect(errors).toEqual([]);
  await page.close();
  await page
    .video()!
    .saveAs(`artifacts/${info.project.name}-earth-moon-round-trip.webm`);
});
