import { test, expect } from '@playwright/test';
import { collectErrors } from './helpers';

test('current route stop stays visible after a desktop-to-phone resize', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'Starts from the desktop viewport',
  );
  const errors = collectErrors(page);
  await page.goto('/#sagittarius-a');
  const current = page.locator('#route-stops [aria-current="step"]');
  await expect(current).toHaveAttribute('data-stop', 'sagittarius-a');

  await page.setViewportSize({ width: 390, height: 844 });

  const visible = () =>
    page.evaluate(() => {
      const scroll = document
        .querySelector('#route-scroll')!
        .getBoundingClientRect();
      const marker = document
        .querySelector('#route-stops [aria-current="step"]')!
        .getBoundingClientRect();
      return marker.left >= scroll.left - 1 && marker.right <= scroll.right + 1;
    });
  await expect.poll(visible).toBe(true);
  await expect(current).toHaveAttribute('data-stop', 'sagittarius-a');
  expect(errors).toEqual([]);
});
