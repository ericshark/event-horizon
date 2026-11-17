import { test, expect, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { CHECKPOINTS } from '../src/journey';
import {
  ASSETS,
  assetsFor,
  residentAssets,
  residentStops,
} from '../src/assets';
import { JourneyController } from '../src/controller';
import { RING_OUTER } from '../src/planet-materials';
import {
  collectErrors,
  hasHorizontalOverflow,
  screenshotContrast,
} from './helpers';

const WORLDS = [
  'earth',
  'moon',
  'mercury',
  'venus',
  'sun',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
];

test('every world from Earth through Neptune ships real imagery with provenance', () => {
  const credits = JSON.parse(
    readFileSync('public/textures/credits.json', 'utf8'),
  ) as {
    file: string;
    credit: string;
    source: string;
    license?: string;
    modifications?: string;
  }[];
  for (const id of WORLDS) {
    const stop = CHECKPOINTS.find((p) => p.id === id)!;
    expect(stop.texture, `${id} has a surface texture`).toBeTruthy();
    for (const name of assetsFor(id)) {
      const spec = ASSETS[name];
      const file = `${name}.${spec.ext}`;
      expect(existsSync(`public/textures/${file}`), file).toBe(true);
      const entry = credits.find((c) => c.file === file);
      expect(entry, `${file} credited`).toBeTruthy();
      expect(entry!.source).toMatch(/^https:/);
    }
  }
});

test('adjacent stops preload and non-resident textures are released', () => {
  expect(residentStops(0)).toEqual([0, 1, 2]);
  expect(residentStops(3)).toEqual([2, 3, 4, 5]);
  expect(residentAssets(0).has('earth')).toBe(true);
  expect(residentAssets(0).has('moon')).toBe(true);
  expect(residentAssets(0).has('mars')).toBe(false);
  expect(residentAssets(9).has('saturn-rings')).toBe(false);
  expect(residentAssets(5).has('saturn-rings')).toBe(true);
});

test('Saturn rings stay inside the frame at every pitch and maximum zoom', () => {
  const saturn = CHECKPOINTS.findIndex((p) => p.id === 'saturn');
  const c = new JourneyController();
  c.observe(saturn);
  c.zoomBy(0.01);
  const fov = (40 * Math.PI) / 180;
  for (const pitch of [-1.15, -0.5, 0, 0.5, 1.15]) {
    c.inspect(0, pitch * 3);
    const [x, y, z] = c.snapshot().cameraPose.position;
    const distance = Math.hypot(x, y, z - saturn * 120);
    expect(distance, 'camera is outside rings').toBeGreaterThan(RING_OUTER * 2);
    // Largest ring extent (face-on) against the vertical half-height at that distance.
    expect(RING_OUTER / (distance * Math.tan(fov / 2))).toBeLessThan(0.97);
  }
});

/** A region that holds only the 3D scene, never the HUD text. */
function planetClip(page: Page) {
  const { width } = page.viewportSize()!;
  return width < 760
    ? { x: 100, y: 150, width: 190, height: 130 }
    : { x: 620, y: 300, width: 400, height: 300 };
}

for (const id of WORLDS) {
  test(`${id}: textured world renders at rest and at maximum zoom without overflow`, async ({
    page,
  }, info) => {
    const errors = collectErrors(page);
    await page.goto(`/#${id}`);
    await expect(page.locator('#location')).toHaveText(
      CHECKPOINTS.find((p) => p.id === id)!.name,
    );
    await expect(page.locator('html')).toHaveAttribute(
      'data-textures',
      'ready',
    );
    const frames = () => page.evaluate(() => window.__horizon!.frames());
    const start = await frames();
    await expect.poll(frames).toBeGreaterThan(start + 5);
    await expect
      .poll(() => page.evaluate(() => window.__horizon!.render()?.pending))
      .toBe(0);
    await expect
      .poll(async () =>
        screenshotContrast(
          page,
          await page.screenshot({
            path: `artifacts/journey-through-space/eh-03/${info.project.name}-${id}.png`,
          }),
        ),
      )
      .toBeGreaterThan(8);
    // A composited frame may lag the renderer on software WebGL; wait for
    // actual visible content rather than treating a transient blank as ready.
    await expect
      .poll(async () =>
        screenshotContrast(
          page,
          await page.screenshot({ clip: planetClip(page) }),
        ),
      )
      .toBeGreaterThan(5);
    const scene = page.getByRole('region', { name: 'Inspect world' });
    await scene.focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press('+');
    const before = await frames();
    await expect.poll(frames).toBeGreaterThan(before + 3);
    const zoomed = await page.screenshot({
      path: `artifacts/journey-through-space/eh-03/${info.project.name}-${id}-max-zoom.png`,
    });
    expect(await screenshotContrast(page, zoomed)).toBeGreaterThan(8);
    // A composited frame may lag the renderer on software WebGL; wait for
    // actual visible content rather than treating a transient blank as ready.
    await expect
      .poll(async () =>
        screenshotContrast(
          page,
          await page.screenshot({ clip: planetClip(page) }),
        ),
      )
      .toBeGreaterThan(5);
    expect(await hasHorizontalOverflow(page)).toBe(false);
    expect(await page.evaluate(() => window.__horizon!.textureFailures())).toBe(
      0,
    );
    expect(errors).toEqual([]);
  });
}

test('real-time Jupiter to Saturn flight has no errors and keeps the scene populated', async ({
  page,
}, info) => {
  const errors = collectErrors(page);
  await page.goto('/#jupiter');
  await expect(page.locator('#location')).toHaveText('Jupiter');
  await expect
    .poll(() => page.evaluate(() => window.__horizon!.render()?.pending))
    .toBe(0);
  await page.getByRole('button', { name: 'Next · Saturn' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-playback', 'flying');
  for (const [i, wait] of [3000, 6000, 6000].entries()) {
    await page.waitForTimeout(wait);
    const shot = await page.locator('#universe').screenshot({
      path: `artifacts/journey-through-space/eh-03/${info.project.name}-jupiter-saturn-${i}.png`,
      style:
        'body > *:not(canvas):not(.vignette) { visibility: hidden !important; }',
    });
    // Sparse space stays dark. A blank canvas is approximately zero; the
    // new path need not put a bright world inside an arbitrary centre crop.
    expect(await screenshotContrast(page, shot)).toBeGreaterThan(1);
  }
  await expect(page.locator('#location')).toHaveText('Saturn', {
    timeout: 20000,
  });
  expect(await page.evaluate(() => window.__horizon!.textureFailures())).toBe(
    0,
  );
  expect(errors).toEqual([]);
});
