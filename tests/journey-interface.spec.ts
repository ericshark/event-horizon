import { test, expect } from '@playwright/test';

test('quiet observation and settings remain available throughout a flight', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'Journey Through Space', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#speedometer')).toBeHidden();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Motion preference')).toHaveValue('full');
  await expect(page.getByLabel('Distance units')).toHaveValue('miles');
  await page.getByLabel('Distance units').selectOption('kilometres');
  await expect(page.locator('#earth-miles')).toContainText('km');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeFocused();
  await page.locator('#next').click();
  await expect(page.locator('#location')).toBeHidden();
  await expect(page.locator('#rail')).toBeHidden();
  await expect(page.locator('#speedometer')).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Distance units')).toHaveValue('kilometres');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Skip flight', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Moon', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#speedometer')).toBeHidden();
});
