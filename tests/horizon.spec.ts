import { test, expect, type Page } from '@playwright/test';
import { CHECKPOINTS } from '../src/journey';
async function jump(page: Page, index: number, local = 0.25) {
  await page.evaluate(
    ([i, t]) => {
      const el = document.querySelectorAll<HTMLElement>('.chapter')[i];
      window.scrollTo(
        0,
        el.offsetTop + (el.offsetHeight - innerHeight * 0.12) * t,
      );
    },
    [index, local],
  );
  await expect
    .poll(() => page.evaluate(() => window.__horizon?.state().index))
    .toBe(index);
}
test('Earth opens immediately with physical altitude and a live globe', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'How far away is the nearest black hole?',
  );
  await expect
    .poll(() => page.evaluate(() => window.__horizon?.frames()))
    .toBeGreaterThan(2);
  await expect(
    page.locator('#earth [data-metric="Camera surface range"]'),
  ).toContainText('20,000 km');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({ path: `artifacts/${info.project.name}-earth.png` });
  expect(errors).toEqual([]);
});
test('every checkpoint updates navigation and telemetry; jumps and reverse scroll work', async ({
  page,
}, info) => {
  await page.goto('/');
  for (let i = 0; i < CHECKPOINTS.length; i++) {
    await jump(page, i);
    await expect(page.locator('body')).toHaveAttribute(
      'data-checkpoint',
      CHECKPOINTS[i].id,
    );
    await expect(page.locator('#checkpoints')).toHaveValue(CHECKPOINTS[i].id);
    await expect(
      page.locator(`.rail a[href="#${CHECKPOINTS[i].id}"]`),
    ).toHaveAttribute('aria-current', 'step');
    expect(
      await page.evaluate(() =>
        Number.isFinite(window.__horizon!.state().earthKm),
      ),
    ).toBe(true);
    if ([3, 7, 12, 13, 16, 20].includes(i))
      await page.screenshot({
        path: `artifacts/${info.project.name}-${CHECKPOINTS[i].id}.png`,
      });
  }
  await expect(page.locator('.summary')).toContainText(
    'Impossible beyond the horizon',
  );
  await expect(page.locator('.summary')).toContainText(
    'We can measure the distance.',
  );
  await jump(page, 7);
  await page.locator('#checkpoints').selectOption('moon');
  await expect(page.locator('body')).toHaveAttribute('data-checkpoint', 'moon');
  await page.locator('#checkpoints').selectOption('earth');
  await expect(page.locator('body')).toHaveAttribute(
    'data-checkpoint',
    'earth',
  );
});
test('sources are accessible and motion stays active under OS reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: /Sources & method/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('not Horizons vectors');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  const before = await page.evaluate(() => window.__horizon!.frames());
  await expect
    .poll(() => page.evaluate(() => window.__horizon!.frames()))
    .toBeGreaterThan(before + 1);
});
test('missing textures leave an illustrated surface and readable science', async ({
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
  await expect
    .poll(() => page.evaluate(() => window.__horizon!.frames()))
    .toBeGreaterThan(1);
  await jump(page, 3);
});
test('without WebGL the full tour and ending remain usable', async ({
  page,
}) => {
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
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/no-webgl/);
  await expect(page.locator('#fallback')).toBeVisible();
  await jump(page, 20);
  await expect(page.locator('.summary')).toContainText('Physical return');
});

test('hidden-tab suspension resumes without a time jump', async ({ page }) => {
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
