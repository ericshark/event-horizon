import { test, expect, type Page } from '@playwright/test';
import { CHECKPOINTS } from '../src/journey';
async function jump(page: Page, q: number) {
  await page.evaluate((q) => {
    const stops = [
      ...document.querySelectorAll<HTMLElement>('.flight-section'),
    ];
    const i = Math.min(20, Math.floor(q)),
      start = stops[i].offsetTop,
      span = (stops[i + 1]?.offsetTop ?? start) - start;
    window.scrollTo(0, start + (q - i) * span);
  }, q);
  await expect
    .poll(() => page.evaluate(() => window.__horizon!.state().position))
    .toBeCloseTo(q, 2);
}
test('mono interface opens on Earth with only three primary metrics', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#location')).toHaveText('Earth');
  await expect(page.locator('#range-value')).toHaveText('20,000 km');
  await expect(page.locator('.readouts>div')).toHaveCount(3);
  await expect(page.locator('.axis-marker')).toHaveCount(1);
  expect(
    await page
      .locator('body')
      .evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain('JetBrains');
  await expect
    .poll(() => page.evaluate(() => window.__horizon!.frames()))
    .toBeGreaterThan(2);
  await page.screenshot({ path: `artifacts/${info.project.name}-earth.png` });
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
test('turn, distant target, continuous encounters, and reverse navigation', async ({
  page,
}, info) => {
  await page.goto('/');
  await jump(page, 0.14);
  expect(
    await page.evaluate(() => window.__horizon!.render()!.yaw),
  ).toBeGreaterThan(3);
  await jump(page, 0.2);
  await expect(page.locator('#destination-marker')).toBeVisible();
  await expect(page.locator('#destination-name')).toHaveText('Moon');
  for (const q of [0.35, 0.75, 1, 3, 7, 12, 13, 16, 17.5, 18, 20]) {
    await jump(page, q);
    expect(
      await page.evaluate(() =>
        Number.isFinite(window.__horizon!.state().rangeKm),
      ),
    ).toBe(true);
    if ([0.35, 0.75, 1, 7, 13, 17.5, 18, 20].includes(q))
      await page.screenshot({
        path: `artifacts/${info.project.name}-flight-${q}.png`,
      });
  }
  await expect(page.locator('#ending')).toBeVisible();
  await expect(page.locator('#ending')).toContainText(
    'We can measure the distance.',
  );
  await page.locator('#checkpoints').selectOption('moon');
  await expect(page.locator('body')).toHaveAttribute('data-checkpoint', 'moon');
  await page.locator('#checkpoints').selectOption('earth');
  await expect(page.locator('#location')).toHaveText('Earth');
});
test('all 21 destinations are accessible and details preserve science', async ({
  page,
}) => {
  await page.goto('/');
  for (let i = 0; i < 21; i++) {
    await jump(page, i);
    await expect(page.locator('body')).toHaveAttribute(
      'data-checkpoint',
      CHECKPOINTS[i].id,
    );
    await expect(page.locator('#checkpoints')).toHaveValue(CHECKPOINTS[i].id);
  }
  await jump(page, 0);
  await page.getByRole('button', { name: 'Details' }).click();
  await expect(page.getByRole('dialog', { name: 'Earth' })).toContainText(
    'Mass',
  );
  await expect(page.locator('#details')).toContainText('Parker');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sources', exact: true }).click();
  await expect(page.locator('#sources')).toContainText('not Horizons vectors');
  await page.keyboard.press('Escape');
});
test('warp follows travel and settles while paused; renderer retains nearby bodies', async ({
  page,
}) => {
  await page.goto('/');
  await jump(page, 0.8);
  await expect
    .poll(() =>
      page.evaluate(() => window.__horizon!.render()!.loaded.includes(1)),
    )
    .toBe(true);
  const moonId = await page.evaluate(
    () => window.__horizon!.render()!.nodeIds[1],
  );
  await jump(page, 1.01);
  expect(
    await page.evaluate(() => window.__horizon!.render()!.nodeIds[1]),
  ).toBe(moonId);
  expect(await page.evaluate(() => window.__horizon!.render()!.loaded)).toEqual(
    expect.arrayContaining([0, 1, 2]),
  );
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollBy(0, 50));
    await page.waitForTimeout(35);
  }
  await expect
    .poll(() => page.evaluate(() => window.__horizon!.state().warp))
    .toBeGreaterThan(0.01);
  await expect
    .poll(() => page.evaluate(() => window.__horizon!.state().warp), {
      timeout: 6000,
    })
    .toBeLessThan(0.01);
});
test('linear rail compresses old checkpoints and cluster inset remains navigable', async ({
  page,
}, info) => {
  await page.goto('/');
  await jump(page, 15.8);
  const axis = await page.evaluate(() => window.__horizon!.axis());
  expect(axis.groups[0].indices.length).toBeGreaterThan(8);
  await page.locator('.axis-marker').first().click();
  await expect(page.locator('#cluster')).toBeVisible();
  await expect(page.locator('#cluster-list')).toContainText('Earth');
  await page.screenshot({
    path: `artifacts/${info.project.name}-distance-cluster.png`,
  });
  await page.locator('#cluster-list a[href="#earth"]').click();
  await expect(page.locator('#location')).toHaveText('Earth');
});
test('black-hole panel remains fixed through the inward zoom', async ({
  page,
}) => {
  await page.goto('/');
  await jump(page, 16);
  const start = await page.locator('.flight-panel').boundingBox();
  const radius = await page.evaluate(() => window.__horizon!.state().bhRadius);
  await jump(page, 18.5);
  const end = await page.locator('.flight-panel').boundingBox();
  expect(end!.x).toBe(start!.x);
  expect(end!.y).toBe(start!.y);
  expect(
    await page.evaluate(() => window.__horizon!.state().bhRadius),
  ).toBeLessThan(radius);
  await expect(page.locator('#cinematic-note')).toBeVisible();
  await jump(page, 20);
  await expect(page.locator('#range-value')).toHaveText('Inside · no return');
});
test('motion remains enabled under OS preference, and hidden tabs pause and resume', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.__horizon!.frames()))
    .toBeGreaterThan(2);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const stopped = await page.evaluate(() => window.__horizon!.frames());
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__horizon!.frames())).toBe(stopped);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect
    .poll(() => page.evaluate(() => window.__horizon!.frames()))
    .toBeGreaterThan(stopped);
});
test('failed imagery and no-WebGL retain the journey and ending', async ({
  page,
}) => {
  await page.route('**/textures/*', (route) => route.abort());
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => window.__horizon!.textureFailures()))
    .toBeGreaterThan(0);
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
  await jump(page, 20);
  await expect(page.locator('#ending')).toBeVisible();
});

test('checkpoint jumps remain exact with fractional section heights', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 846 });
  await page.goto('/');
  for (const id of ['moon', 'saturn', 'earth']) {
    await page.locator('#checkpoints').selectOption(id);
    await expect(page.locator('body')).toHaveAttribute('data-checkpoint', id);
  }
});

test('region and spacecraft metrics use physical route distance', async ({
  page,
}, info) => {
  await page.goto('/');
  await jump(page, 12);
  await expect(page.locator('#range-label')).toHaveText(
    'DISTANCE TO OORT CLOUD',
  );
  await expect(page.locator('#range-value')).toHaveText(/(AU|ly)/);
  await jump(page, 13);
  await expect(page.locator('#range-label')).toHaveText(
    'DISTANCE TO PROXIMA CENTAURI',
  );
  await expect(page.locator('#range-value')).toHaveText(/ly/);
  await page.screenshot({
    path: `artifacts/${info.project.name}-flight-13.png`,
  });
});
