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

test('route previews do not travel and activation restores visible navigation focus', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  const target = page.getByRole('button', {
    name: 'Go to Jupiter',
    exact: true,
  });
  if (isMobile) {
    await target.tap();
    await expect(
      page.getByRole('heading', { name: 'Earth', exact: true }),
    ).toBeVisible();
    await expect(page.locator('#route-preview')).toContainText('Jupiter');
    await page.getByRole('button', { name: 'Go', exact: true }).click();
    await expect(page.locator('#next')).toBeFocused();
  } else {
    await target.focus();
    await expect(
      page.getByRole('heading', { name: 'Earth', exact: true }),
    ).toBeVisible();
    await expect(page.locator('#route-preview')).toContainText('Jupiter');
    await target.press('Enter');
  }
  await expect(
    page.getByRole('heading', { name: 'Jupiter', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#route-preview')).toBeHidden();
  await expect(target).toHaveAttribute('aria-current', 'step');
  await page
    .getByRole('button', { name: 'What is an astronomical unit?', exact: true })
    .click();
  await expect(page.locator('#au-help')).toContainText('Earth–Sun distance');
  await page.keyboard.press('Escape');
  await expect(page.locator('#au-help-toggle')).toBeFocused();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Sources', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Sources & methodology' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeFocused();
});

test('inspection double activation toggles close-up and leaves Earth distance unchanged', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean(window.__horizon?.state().cameraPose),
  );
  const original = await page.evaluate(() => window.__horizon!.state());
  const surface = page.locator('#inspection');
  if (isMobile) {
    await surface.tap();
    await surface.tap();
  } else await surface.dblclick();
  await expect
    .poll(async () =>
      page.evaluate(() => window.__horizon!.state().cameraPose?.position),
    )
    .not.toEqual(original.cameraPose?.position);
  expect(await page.evaluate(() => window.__horizon!.state().earthKm)).toBe(
    original.earthKm,
  );
  if (isMobile) {
    await page.waitForTimeout(400);
    await surface.tap();
    await surface.tap();
  } else await surface.dblclick();
  await expect
    .poll(async () =>
      page.evaluate(() => window.__horizon!.state().cameraPose?.position),
    )
    .toEqual(original.cameraPose?.position);
});

test('dismissing settings on the world does not begin an inspection drag', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const original = await page.evaluate(
    () => window.__horizon!.state().cameraPose,
  );
  const surface = page.locator('#inspection');
  await surface.dispatchEvent('pointerdown', {
    pointerId: 1,
    clientX: 250,
    clientY: 200,
    bubbles: true,
  });
  await surface.dispatchEvent('pointermove', {
    pointerId: 1,
    clientX: 310,
    clientY: 240,
    bubbles: true,
  });
  await surface.dispatchEvent('pointerup', {
    pointerId: 1,
    clientX: 310,
    clientY: 240,
    bubbles: true,
  });
  await expect(page.locator('#preference-controls')).toBeHidden();
  expect(
    await page.evaluate(() => window.__horizon!.state().cameraPose),
  ).toEqual(original);
});

test('keyboard activation of the route jumps directly on touch-capable devices too', async ({
  page,
}) => {
  await page.goto('/');
  const target = page.getByRole('button', {
    name: 'Go to Jupiter',
    exact: true,
  });
  await target.focus();
  await target.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Jupiter', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#route-preview')).toBeHidden();
});

test('destination content stays separate from instruments across desktop, phone and landscape', async ({
  page,
}) => {
  await page.goto('/#proxima');
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const panel = await page.locator('.flight-panel').boundingBox();
    const instruments = await page.locator('#timed-instruments').boundingBox();
    expect(
      panel!.y + panel!.height + 8,
      `${viewport.width}x${viewport.height}`,
    ).toBeLessThanOrEqual(instruments!.y);
  }
});
