import { test, expect } from '@playwright/test';
import { CHECKPOINTS, LEG_DURATIONS } from '../src/journey';
import {
  chooseStop,
  openSettings,
  collectErrors,
  hasHorizontalOverflow,
  screenshotContrast,
} from './helpers';

test('all stops through visible controls, timed forward/reverse flights, inspection and no descent', async ({
  page,
}, info) => {
  test.setTimeout(240000); // software WebGL renders every resident planet
  const errors = collectErrors(page);
  await page.clock.install();
  await page.goto('/');
  await expect(page.locator('.route-stop')).toHaveCount(13);
  await expect(page.getByRole('button', { name: /^Previous/ })).toBeDisabled();
  for (let i = 0; i < CHECKPOINTS.length; i++) {
    await expect(page.locator('#location')).toHaveText(CHECKPOINTS[i].name);
    await expect(
      page.locator(`.route-stop[data-stop="${CHECKPOINTS[i].id}"]`),
    ).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('#observation-facts > div')).toHaveCount(3);
    await expect(page.locator('#speed-digits')).toHaveAttribute(
      'data-value',
      '0',
    );
    await expect(page).toHaveURL(new RegExp(`#${CHECKPOINTS[i].id}$`));
    if ([0, 7, 10, 11, 12].includes(i)) {
      await page.getByRole('region', { name: 'Inspect world' }).focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('+');
      await page.clock.runFor(100);
      await page.locator('#inspection').focus();
      await page.keyboard.press('Home');
      await page.screenshot({
        path: `artifacts/journey-through-space/eh-02/${info.project.name}-${CHECKPOINTS[i].id}.png`,
        animations: 'disabled',
      });
    }
    if (i < CHECKPOINTS.length - 1) {
      await page
        .getByRole('button', {
          name: `Next · ${CHECKPOINTS[i + 1].name}`,
          exact: true,
        })
        .press('Enter');
      await page.clock.runFor(400);
      await expect(page.locator('body')).toHaveClass(/in-flight/);
      await expect(page.locator('.flight-panel')).toHaveAttribute('inert', '');
      await expect(page.locator('#timed-instruments')).toBeVisible();
      await page.clock.fastForward(LEG_DURATIONS[i] * 1000);
      await page.clock.fastForward(600);
    }
  }
  await expect(
    page.getByRole('button', { name: 'Enter the event horizon', exact: true }),
  ).toBeEnabled();
  await page.locator('#inspection').dispatchEvent('wheel', { deltaY: 200 });
  await page.clock.fastForward(1000);
  await expect(page.locator('body')).toHaveAttribute(
    'data-playback',
    'observing',
  );
  await expect(page.locator('#ending')).toBeHidden();
  await page
    .getByRole('button', { name: 'Details', exact: true })
    .press('Enter');
  await expect(page.locator('#details')).toContainText(
    '4 million solar masses',
  );
  await expect(page.locator('#details')).toContainText('1000.00 rₛ');
  await expect(page.locator('#details')).toContainText(
    'Light-equivalent route time',
  );
  await page.keyboard.press('Escape');
  for (let i = CHECKPOINTS.length - 1; i > 0; i--) {
    await page.getByRole('button', { name: /^Previous/ }).press('Enter');
    await page.clock.fastForward(LEG_DURATIONS[i - 1] * 1000 + 100);
    await page.clock.fastForward(600);
    await expect(page.locator('#location')).toHaveText(CHECKPOINTS[i - 1].name);
  }
  expect(await hasHorizontalOverflow(page)).toBe(false);
  expect(errors).toEqual([]);
});

test('direct route, hash redirects, invalid links, and history always settle with zero speed', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/#saturn');
  await expect(page.locator('#location')).toHaveText('Saturn');
  await chooseStop(page, 'proxima');
  await expect(page.locator('#location')).toHaveText('Proxima Centauri');
  await page.goBack();
  await expect(page.locator('#location')).toHaveText('Saturn');
  await page.goForward();
  await expect(page.locator('#location')).toHaveText('Proxima Centauri');
  for (const [hash, name] of Object.entries({
    kuiper: 'Voyager 1',
    heliopause: 'Voyager 1',
    oort: 'Proxima Centauri',
    interstellar: 'Sagittarius A*',
    gaia: 'Sagittarius A*',
    tides: 'Sagittarius A*',
    photon: 'Sagittarius A*',
    horizon: 'Sagittarius A*',
    interior: 'Sagittarius A*',
    descent: 'Sagittarius A*',
    unknown: 'Earth',
  })) {
    await page.evaluate((hash) => {
      location.hash = hash;
    }, hash);
    await expect(page.locator('#location')).toHaveText(name);
    await expect(page.locator('body')).toHaveAttribute(
      'data-playback',
      'observing',
    );
    await expect(page.locator('#speed-digits')).toHaveAttribute(
      'data-value',
      '0',
    );
    await expect(page.locator('#ending')).toBeHidden();
  }
  await openSettings(page);
  await page.getByRole('button', { name: 'Sources', exact: true }).click();
  await expect(page.locator('#sources')).toContainText('not Horizons vectors');
  await expect(page.locator('#sources')).toContainText('11.8 million km');
  expect(errors).toEqual([]);
});

test('maximum galactic speed and growing digits fit a fixed instrument width', async ({
  page,
}, info) => {
  await page.clock.install();
  await page.goto('/#proxima');
  await expect(page.locator('#speed-readout')).toBeHidden();
  await page
    .getByRole('button', { name: 'Next · Sagittarius A*' })
    .press('Enter');
  await page.clock.fastForward(LEG_DURATIONS.at(-1)! * 500);
  await page.getByRole('button', { name: 'Pause', exact: true }).press('Enter');
  const value = await page.locator('#speed-digits').getAttribute('data-value');
  expect(Number(value)).toBeGreaterThan(1e18);
  const width = await page
    .locator('#speed-digits')
    .evaluate((el) => el.getBoundingClientRect().width);
  await page.clock.fastForward(1000);
  expect(
    await page
      .locator('#speed-digits')
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBeCloseTo(width, 1);
  const bounds = await page
    .locator('#timed-instruments strong')
    .first()
    .boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  expect(
    await page
      .locator('#speed-digits')
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  expect(await hasHorizontalOverflow(page)).toBe(false);
  await page.screenshot({
    path: `artifacts/journey-through-space/eh-02/${info.project.name}-maximum-speed.png`,
  });
  await page.getByRole('button', { name: 'Skip flight' }).press('Enter');
  await page.clock.fastForward(600);
  await expect(page.locator('#speed-digits')).toHaveAttribute(
    'data-value',
    '0',
  );
});

test('named schematic route reaches every stop even at galactic scale', async ({
  page,
}) => {
  await page.goto('/#sagittarius-a');
  await expect(page.locator('.route-stop')).toHaveCount(13);
  await chooseStop(page, 'earth');
  await expect(page.locator('#location')).toHaveText('Earth');
  await chooseStop(page, 'sagittarius-a');
  await expect(page.locator('#location')).toHaveText('Sagittarius A*');
  await expect(page.locator('#ending')).toBeHidden();
});

test('failed imagery and no-WebGL preserve navigation, facts and safe final observation', async ({
  page,
}) => {
  await page.route('**/textures/*', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('#render-status')).toContainText(
    'illustrated surfaces',
  );
  await page.unroute('**/textures/*');
  await page.addInitScript(() => {
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
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/no-webgl/);
  await chooseStop(page, 'sagittarius-a');
  await expect(page.locator('#location')).toHaveText('Sagittarius A*');
  await expect(page.locator('#observation-facts > div')).toHaveCount(3);
  await expect(page.locator('#ending')).toBeHidden();
});

test('short viewport, scene contrast and real-time outer-planet flight', async ({
  page,
}, info) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/#jupiter');
  await expect(page.locator('#location')).toHaveText('Jupiter');
  await expect
    .poll(async () =>
      screenshotContrast(page, await page.locator('#universe').screenshot()),
    )
    .toBeGreaterThan(5);
  await page.screenshot({
    path: `artifacts/journey-through-space/eh-02/${info.project.name}-short-jupiter.png`,
  });
  await page.getByRole('button', { name: 'Next · Saturn' }).click();
  await expect(page.locator('.flight-panel')).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute(
    'data-playback',
    'observing',
    { timeout: LEG_DURATIONS[6] * 1000 + 15000 },
  );
  await expect(page.locator('#location')).toHaveText('Saturn');
  expect(await hasHorizontalOverflow(page)).toBe(false);
  expect(errors).toEqual([]);
});
