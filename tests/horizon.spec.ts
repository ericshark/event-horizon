import { expect, test, type Page } from '@playwright/test';
import {
  collectErrors,
  hasHorizontalOverflow,
  screenshotContrast,
} from './helpers';

const framesRendered = (page: Page) =>
  page.evaluate(() => window.__horizon?.frames() ?? 0);

async function scrollToChapter(page: Page, index: number, local = 0.4) {
  await page.evaluate(
    ([i, l]) => {
      const section = document.querySelectorAll<HTMLElement>('.chapter')[i];
      const last = i === document.querySelectorAll('.chapter').length - 1;
      const span = section.offsetHeight - (last ? innerHeight : 0);
      window.scrollTo(0, section.offsetTop + span * l);
    },
    [index, local],
  );
}

test('renders the lensed hero with live telemetry and no errors', async ({
  page,
}, info) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/has-webgl/);
  await expect(page.locator('html')).toHaveClass(/is-ready/);
  await expect(page.locator('.loader')).toBeHidden();
  await expect.poll(() => framesRendered(page)).toBeGreaterThan(2);

  const shot = await page.screenshot({
    path: `artifacts/${info.project.name}-hero.png`,
  });
  expect(await screenshotContrast(page, shot)).toBeGreaterThan(12);
  await expect(page.locator('[data-readout="r"]')).toHaveText('30.00');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /Event\s+Horizon/,
  );
  expect(await hasHorizontalOverflow(page)).toBe(false);
  expect(errors).toEqual([]);
});

test('scrolling falls inward and advances the chapter', async ({
  page,
}, info) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/is-ready/);
  await scrollToChapter(page, 2, 0.45);
  await expect(page.locator('[data-chapter-name]')).toHaveText('Photon sphere');
  await expect
    .poll(async () =>
      Number(await page.locator('[data-readout="r"]').textContent()),
    )
    .toBeLessThan(14);
  await expect(page.locator('[data-tick="2"]')).toHaveAttribute(
    'aria-current',
    'step',
  );
  await expect(page.locator('#chapter-3 .copy')).toHaveCSS('opacity', '1');
  await expect(page.locator('.loader')).toBeHidden();
  await page.screenshot({
    path: `artifacts/${info.project.name}-photon-sphere.png`,
  });

  await scrollToChapter(page, 4, 0.5);
  await expect(page.locator('[data-chapter-name]')).toHaveText('Time');
  const home = await page.locator('[data-clock="home"]').textContent();
  const you = await page.locator('[data-clock="you"]').textContent();
  expect(you! < home!).toBe(true);
  expect(await hasHorizontalOverflow(page)).toBe(false);
});

test('the singularity whites out and falling again inverts the universe', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/is-ready/);
  await scrollToChapter(page, 5, 0.97);
  await expect(page.locator('html')).toHaveClass(/is-white/);
  const button = page.getByRole('button', { name: /Fall again/ });
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator('html')).toHaveClass(/inverted/);
  await expect(page.locator('[data-descent]')).toHaveText('02');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
  await expect(page.locator('html')).not.toHaveClass(/is-white/);
});

test('reduced motion keeps the descent but drops smooth scroll and stretching', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/reduce-motion/);
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
  await scrollToChapter(page, 3, 0.9);
  await expect(page.locator('[data-chapter-name]')).toHaveText('Tides');
  await expect(page.locator('.stretch__char').first()).toHaveCSS(
    'transform',
    'none',
  );
});

test('without WebGL a static illustration and readable title remain', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (type.startsWith('webgl')) return null;
      return (original as (...args: unknown[]) => RenderingContext | null).call(
        this,
        type,
        ...rest,
      );
    } as typeof original;
  });
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/no-webgl/);
  await expect(page.locator('.fallback')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/is-ready/);
  await expect(page.locator('.loader')).toBeHidden();
  await page.screenshot({
    path: `artifacts/${info.project.name}-no-webgl.png`,
  });
  expect(errors).toEqual([]);
});
