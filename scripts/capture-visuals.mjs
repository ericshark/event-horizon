/**
 * Deterministic visual captures for the realism work: every stop at rest and at
 * maximum zoom, plus fixed-fraction strips through Earth → Moon and
 * Proxima → Sagittarius A* in Full and Reduced motion. Time is driven by a
 * controlled clock, so frames are reproducible on software WebGL. Requires a
 * running server: PREVIEW_URL=http://127.0.0.1:5301 node scripts/capture-visuals.mjs
 * Optional: TIER=high|medium|low (default high), ONLY=stops|flights.
 */
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';

const target = process.env.PREVIEW_URL || 'http://127.0.0.1:5201';
const tier = process.env.TIER || 'high';
const only = process.env.ONLY || '';
const output = `artifacts/journey-through-space/visual-realism/${tier}`;
await mkdir(output, { recursive: true });
const STOPS = [
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
  'voyager',
  'proxima',
  'sagittarius-a',
];
const FLIGHTS = [
  { from: 'earth', next: /^Next · Moon/, seconds: 16, label: 'earth-moon' },
  {
    from: 'proxima',
    next: /^Next · Sagittarius/,
    seconds: 60,
    label: 'proxima-sgra',
  },
];
const FRACTIONS = [0.12, 0.22, 0.32, 0.45, 0.55, 0.7, 0.85, 0.95];

const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync('/usr/bin/chromium')
      ? '/usr/bin/chromium'
      : chromium.executablePath()),
  headless: true,
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});
const errors = [];
const samples = [];
async function open(id, motion = 'full') {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript((mode) => {
    try {
      localStorage.setItem('journey-through-space.motion', mode);
    } catch {
      /* storage unavailable */
    }
  }, motion);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${id}: ${e.message}`));
  page.on('console', (e) => {
    if (e.type() === 'error') errors.push(`${id}: ${e.text()}`);
  });
  await page.clock.install();
  await page.goto(`${target}/?quality=${tier}#${id}`);
  await settle(page, true);
  // The installed clock otherwise keeps flowing in real time while slow software
  // frames are captured; pause it so only explicit steps advance the journey.
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 50);
  return { page, context };
}
/** Advance the controlled clock until textures (and hero maps) are ready and drawn. */
async function settle(page, heroes = false) {
  for (let i = 0; i < 400; i++) {
    await page.clock.runFor(50);
    const r = await page.evaluate(() => window.__horizon?.render());
    const ready =
      r &&
      r.pending === 0 &&
      (!heroes || tier !== 'high' || r.heroes.includes('milkyway'));
    if (ready) break;
    await page.waitForTimeout(50);
  }
  // Let decoded images upload and a few frames composite.
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(250);
    await page.clock.runFor(34);
  }
}
async function shot(page, name) {
  await page.screenshot({ path: `${output}/${name}.png` });
}

if (only !== 'flights')
  for (const id of STOPS) {
    const { page, context } = await open(id);
    await shot(page, `stop-${id}`);
    // Keyboard zoom: the paused clock never yields the animation frames that
    // pointer actionability checks wait for.
    await page.getByRole('region', { name: 'Inspect world' }).focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press('+');
    await settle(page);
    await shot(page, `stop-${id}-zoom`);
    await context.close();
  }

if (only !== 'stops')
  for (const motion of ['full', 'reduced'])
    for (const flight of FLIGHTS) {
      const { page, context } = await open(flight.from, motion);
      await page.getByRole('button', { name: flight.next }).click();
      let at = 0;
      for (const fraction of FRACTIONS) {
        const t = fraction * flight.seconds * 1000;
        await page.clock.fastForward(t - at);
        at = t;
        await page.clock.runFor(48);
        await page.waitForTimeout(300);
        await page.clock.runFor(16);
        const d = await page.evaluate(() => {
          const s = window.__horizon.state();
          const r = window.__horizon.render();
          return {
            elapsed: s.elapsed,
            thrust: s.thrust,
            bank: r.bank,
            beta: r.beta,
            stretch: r.stretch,
            fov: r.fov,
            exposure: r.exposure,
            tier: r.tier,
          };
        });
        samples.push({ flight: flight.label, motion, fraction, ...d });
        await shot(
          page,
          `flight-${flight.label}-${motion}-${String(Math.round(fraction * 100)).padStart(2, '0')}`,
        );
      }
      await context.close();
    }

await writeFile(`${output}/samples.json`, JSON.stringify(samples, null, 2));
await browser.close();
console.log(
  JSON.stringify(
    { output, frames: samples.length, errors: errors.slice(0, 20) },
    null,
    2,
  ),
);
if (errors.length) process.exitCode = 1;
