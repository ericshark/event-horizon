import { test, expect } from '@playwright/test';
test('landing tells the story and links to its experience', async ({
  page,
}, info) => {
  await page.goto('/');
  await expect(page.locator('main h1').first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight > innerHeight,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  for (const link of await page.locator('main a[href^="#"]').all()) {
    const href = await link.getAttribute('href');
    if (href && href.length > 1)
      expect(await page.locator(href).count(), href).toBeGreaterThan(0);
  }
  await page.screenshot({ path: `artifacts/${info.project.name}-landing.png` });
});
