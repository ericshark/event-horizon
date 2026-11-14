/** Record representative real-time motion. Requires a running verification server. */
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
const output = 'artifacts/motion/eh-02';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync('/usr/bin/chromium')
      ? '/usr/bin/chromium'
      : chromium.executablePath()),
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: output, size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (e) => {
  if (e.type() === 'error') errors.push(e.text());
});
try {
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5201');
  for (const [id, destination, seconds] of [
    ['earth', 'Moon', 6],
    ['jupiter', 'Saturn', 18],
    ['proxima', 'Sagittarius A*', 50],
  ]) {
    await page.locator('#checkpoints').selectOption(id);
    await page.waitForFunction(
      (id) => document.body.dataset.checkpoint === id,
      id,
    );
    await page
      .getByRole('button', { name: `Next · ${destination}`, exact: true })
      .click();
    await page.waitForFunction(
      () => document.body.dataset.playback === 'observing',
      null,
      { timeout: (seconds + 15) * 1000 },
    );
    await page.waitForTimeout(600);
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  await context.close();
  await page.video().saveAs(`${output}/flight-review.webm`);
  await browser.close();
}
console.log(
  `Recorded Earth–Moon, Jupiter–Saturn, Proxima–Sagittarius A*: ${output}/flight-review.webm`,
);
