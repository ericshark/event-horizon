import type { Page } from '@playwright/test';

/**
 * Standard deviation of luminance across a screenshot, decoded in the page so
 * no image library is needed. A blank or flat canvas scores close to zero.
 */
export async function screenshotContrast(page: Page, png: Buffer) {
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 16) {
      const y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += y;
      sumSq += y * y;
      n++;
    }
    const mean = sum / n;
    return Math.sqrt(sumSq / n - mean * mean);
  }, png.toString('base64'));
}

export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

export async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
}

/** Mean colour of the bright pixels (the lit object) in a screenshot. */
export async function brightColor(page: Page, png: Buffer) {
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] + data[i + 1] + data[i + 2] < 150) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    return {
      r: r / Math.max(1, n),
      g: g / Math.max(1, n),
      b: b / Math.max(1, n),
      n,
    };
  }, png.toString('base64'));
}

/** Open preferences through the same visible control available to visitors. */
export async function openSettings(page: Page) {
  const trigger = page.locator('#settings-toggle');
  if ((await trigger.getAttribute('aria-expanded')) !== 'true')
    await trigger.click();
}

export async function closeSettings(page: Page) {
  const trigger = page.locator('#settings-toggle');
  if ((await trigger.getAttribute('aria-expanded')) === 'true')
    await trigger.click();
}

/** Touch previews first; desktop activation launches flight, then skips for test setup. */
export async function chooseStop(page: Page, id: string) {
  const stop = page.locator(`.route-stop[data-stop="${id}"]`);
  await stop.scrollIntoViewIfNeeded();
  await stop.click();
  const go = page.locator('#route-go');
  if (await go.isVisible()) await go.click();
  const skip = page.locator('#skip-flight');
  if (await skip.isVisible()) await skip.click();
}
