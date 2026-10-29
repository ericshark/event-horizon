/** Record representative motion in Chromium. Requires a running dev server and ffmpeg. */
import { chromium } from '@playwright/test';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const temporary = await mkdtemp(join(tmpdir(), 'event-horizon-motion-'));
await mkdir('artifacts/motion', { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error') errors.push(e.text());
  });
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5201');
  await page.waitForFunction(() => window.__horizon?.frames() > 2);
  const cdp = await page.context().newCDPSession(page);
  const frames = [],
    writes = [];
  let recording = false,
    segment = 0;
  cdp.on('Page.screencastFrame', (e) => {
    if (recording) {
      const path = join(
        temporary,
        `frame-${String(frames.length).padStart(6, '0')}.jpg`,
      );
      frames.push({ path, time: e.metadata.timestamp, segment });
      writes.push(writeFile(path, Buffer.from(e.data, 'base64')));
    }
    void cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId });
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 80,
    maxWidth: 960,
    maxHeight: 640,
    everyNthFrame: 1,
  });
  for (const [from, to, seconds] of [
    [0, 1.12, 7],
    [6.75, 7.15, 4],
    [15.97, 18.8, 8],
  ]) {
    await page.evaluate(
      (q) =>
        window.scrollTo(
          0,
          document.querySelector('.flight-section').offsetHeight * q,
        ),
      from,
    );
    await page.waitForTimeout(500);
    segment++;
    recording = true;
    await page.evaluate(
      async ({ from, to, seconds }) => {
        const h = document.querySelector('.flight-section').offsetHeight,
          start = performance.now();
        await new Promise((resolve) => {
          function step(now) {
            const p = Math.min(1, (now - start) / (seconds * 1000));
            window.scrollTo(0, h * (from + (to - from) * p));
            if (p < 1) requestAnimationFrame(step);
            else resolve();
          }
          requestAnimationFrame(step);
        });
      },
      { from, to, seconds },
    );
    await page.waitForTimeout(350);
    recording = false;
  }
  await cdp.send('Page.stopScreencast');
  await Promise.all(writes);
  const list = frames
    .map(
      (f, i) =>
        `file '${f.path}'\nduration ${frames[i + 1] && frames[i + 1].segment === f.segment ? Math.max(0.016, Math.min(0.3, frames[i + 1].time - f.time)) : 0.08}`,
    )
    .join('\n');
  await writeFile(join(temporary, 'frames.txt'), list + '\n');
  const encode = spawnSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      join(temporary, 'frames.txt'),
      '-vf',
      'fps=24,scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '650k',
      '-pix_fmt',
      'yuv420p',
      'artifacts/motion/flight-review.webm',
    ],
    { encoding: 'utf8' },
  );
  if (encode.status !== 0) throw new Error(encode.stderr);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(
    `Recorded ${frames.length} frames: artifacts/motion/flight-review.webm`,
  );
} finally {
  await browser.close();
  await rm(temporary, { recursive: true, force: true });
}
