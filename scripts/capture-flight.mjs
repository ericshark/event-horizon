/** Record the current journey's real-time motion. Requires a verification server. */
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
const output = 'artifacts/journey-through-space/motion';
const target = process.env.PREVIEW_URL || 'http://127.0.0.1:5201';
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
const recordings = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (e) => {
  if (e.type() === 'error') errors.push(e.text());
});
async function record(label, button, seconds) {
  await page.evaluate(() => {
    window.__captureSamples = [];
    window.__captureTimer = setInterval(() => {
      const state = window.__horizon.state();
      window.__captureSamples.push({
        elapsed: state.elapsed,
        playback: state.playback,
        phase: state.flightPhase,
        speedKmS: state.speedKmS,
        thrust: state.thrust,
        routeKm: state.routeKm,
        earthKm: state.earthKm,
        cameraPose: state.cameraPose,
        displayedSpeed: document.querySelector('#speed-digits').dataset.value,
        displayedDistance: document.querySelector('#earth-miles').textContent,
      });
    }, 250);
  });
  await page.locator(button).click();
  await page.waitForFunction(() => document.body.dataset.playback === 'flying');
  const started = Date.now();
  for (const [i, fraction] of [0.05, 0.15, 0.4, 0.6, 0.85, 0.98].entries()) {
    await page.waitForTimeout(
      Math.max(0, seconds * fraction * 1000 - (Date.now() - started)),
    );
    await page.screenshot({ path: `${output}/${label}-${i}.png` });
  }
  await page.waitForFunction(
    () => ['observing', 'complete'].includes(document.body.dataset.playback),
    null,
    { timeout: (seconds + 15) * 1000 },
  );
  const samples = await page.evaluate(() => {
    clearInterval(window.__captureTimer);
    return window.__captureSamples;
  });
  recordings.push({
    label,
    authoredSeconds: seconds,
    observedMilliseconds: Date.now() - started,
    samples,
  });
}
try {
  await page.goto(target);
  for (const [id, seconds] of [
    ['earth', 16],
    ['jupiter', 28],
    ['proxima', 60],
  ]) {
    await page.locator(`.route-stop[data-stop="${id}"]`).click();
    await page.waitForFunction(
      (id) =>
        document.body.dataset.checkpoint === id &&
        document.body.dataset.playback === 'observing' &&
        !document.body.classList.contains('direct-navigation'),
      id,
    );
    await page.waitForFunction(() => window.__horizon.render()?.pending === 0);
    await record(`${id}-forward`, '#next', seconds);
    if (id === 'earth') {
      await page.locator('#inspection').focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('+');
      await record('moon-inspected-reverse', '#previous', 16);
    }
  }
  await record('horizon-descent', '#next', 20);
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  await writeFile(
    `${output}/samples.json`,
    JSON.stringify({ target, errors, recordings }, null, 2),
  );
  await context.close();
  await page.video().saveAs(`${output}/flight-review.webm`);
  await browser.close();
}
console.log(
  `Recorded forward/reverse departure, outer planets, final leg and descent: ${output}/flight-review.webm`,
);
