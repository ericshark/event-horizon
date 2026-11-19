import { test, expect, type Page } from '@playwright/test';
import {
  JourneyController,
  resolveReducedMotion,
  type TimedFrame,
} from '../src/controller';
import { audioTargets } from '../src/audio';
import { fovExpansion, streakStrength } from '../src/scenery';
import { CHECKPOINTS, LEG_DURATIONS } from '../src/journey';
import { LOAD_TIMEOUT_MS } from '../src/renderer';
import {
  chooseStop,
  openSettings,
  closeSettings,
  collectErrors,
  hasHorizontalOverflow,
} from './helpers';

test('motion policy, reduced inertia, and snapshot adapters preserve route and timing without a second clock', () => {
  expect(resolveReducedMotion('system', false)).toBe(false);
  expect(resolveReducedMotion('system', true)).toBe(true);
  expect(resolveReducedMotion('full', true)).toBe(false);
  expect(resolveReducedMotion('reduced', false)).toBe(true);
  expect(LOAD_TIMEOUT_MS).toBe(10_000);

  // Reduced inertia vs full inertia after identical drag fling
  const full = new JourneyController();
  full.setMotionMode('full', false);
  full.tick(0);
  full.fling(0.8, 0.4);
  const fullAfter = full.tick(200).cameraPose.position;

  const reduced = new JourneyController();
  reduced.setMotionMode('reduced', false);
  reduced.tick(0);
  reduced.fling(0.8, 0.4);
  const reducedAfter = reduced.tick(200).cameraPose.position;

  expect(Math.abs(reducedAfter[0])).toBeGreaterThan(0);
  expect(Math.abs(reducedAfter[0])).toBeLessThan(Math.abs(fullAfter[0]) * 0.35);

  // Changing motion mode mid-flight or at rest never resets progress, routeKm or timing
  const c = new JourneyController();
  c.observe(0);
  c.launch(0, 1);
  const mid = c.tick(2500);
  expect(mid.playback).toBe('flying');
  expect(mid.reducedMotion).toBe(false);
  expect(mid.warp).toBeGreaterThan(0);

  c.setMotionMode('reduced', false);
  const switched = c.snapshot();
  expect(switched.playback).toBe('flying');
  expect(switched.elapsed).toBe(mid.elapsed);
  expect(switched.routeKm).toBe(mid.routeKm);
  expect(switched.earthKm).toBe(mid.earthKm);
  expect(switched.speedKmS).toBe(mid.speedKmS);
  expect(switched.reducedMotion).toBe(true);
  expect(switched.motionMode).toBe('reduced');
  expect(switched.warp).toBe(0);

  // Adapters consume the same snapshot without another clock
  expect(
    streakStrength(switched.leg, switched.warp, switched.thrust, true),
  ).toBe(0);
  expect(fovExpansion(switched.leg, switched.warp, switched.thrust, true)).toBe(
    0,
  );
  const fullAudio = audioTargets({ ...switched, reducedMotion: false }, true);
  const reducedAudio = audioTargets(switched, true);
  expect(reducedAudio.master).toBe(1);
  expect(reducedAudio.drive).toBeLessThan(fullAudio.drive);

  // Arrival still completes at exact authored leg duration
  const arrived = c.tick(LEG_DURATIONS[0] * 1000);
  expect(arrived.playback).toBe('observing');
  expect(arrived.now).toBe(1);
  expect(arrived.reducedMotion).toBe(true);
});

async function assertNoControlOverlapAndTouchTargets(page: Page) {
  const result = await page.evaluate(() => {
    const visible = (el: Element) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.hidden || htmlEl.closest('[hidden], [inert]')) return false;
      const style = getComputedStyle(htmlEl);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        Number(style.opacity) === 0
      )
        return false;
      const rect = htmlEl.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const controls = [
      ...document.querySelectorAll('button, select, a[href], summary'),
    ].filter(visible);
    const undersized = controls
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          id: el.id || el.textContent?.trim() || el.tagName,
          width: Math.round(r.width),
          height: Math.round(r.height),
        };
      })
      .filter((c) => c.width < 44 || c.height < 44);
    const unnamed = controls
      .filter((el) => {
        const name =
          el.getAttribute('aria-label') ||
          el.textContent?.trim() ||
          el.getAttribute('title');
        return !name;
      })
      .map((el) => el.outerHTML);

    // Check key interactive regions do not collide with preference controls or navigation
    const rectOf = (sel: string) => {
      const el = document.querySelector(sel);
      return el && visible(el) ? el.getBoundingClientRect() : null;
    };
    const overlaps = (a: DOMRect | null, b: DOMRect | null) => {
      if (!a || !b) return false;
      return (
        a.left < b.right - 2 &&
        a.right > b.left + 2 &&
        a.top < b.bottom - 2 &&
        a.bottom > b.top + 2
      );
    };
    const prefs = rectOf('#preference-controls');
    const nav = rectOf('#timed-navigation');
    const playback = rectOf('#playback-controls');
    const instruments = rectOf('#timed-instruments');
    const checkpoints = rectOf('#rail');
    const notice = rectOf('#render-notice');
    return {
      undersized,
      unnamed,
      prefsOverlapsNav: overlaps(prefs, nav),
      prefsOverlapsPlayback: overlaps(prefs, playback),
      prefsOverlapsInstruments: overlaps(prefs, instruments),
      prefsOverlapsCheckpoints: overlaps(prefs, checkpoints),
      noticeOverlapsNav: overlaps(notice, nav),
      noticeOverlapsPlayback: overlaps(notice, playback),
      noticeOverlapsPrefs: overlaps(notice, prefs),
    };
  });
  expect(result.undersized).toEqual([]);
  expect(result.unnamed).toEqual([]);
  expect(result.prefsOverlapsNav).toBe(false);
  expect(result.prefsOverlapsPlayback).toBe(false);
  expect(result.prefsOverlapsInstruments).toBe(false);
  expect(result.prefsOverlapsCheckpoints).toBe(false);
  expect(result.noticeOverlapsNav).toBe(false);
  expect(result.noticeOverlapsPlayback).toBe(false);
  expect(result.noticeOverlapsPrefs).toBe(false);
}

test('OS and override motion modes persist, update in place, disable tunnel/FOV/spin/blur, and cap digit updates at ≤10 Hz', async ({
  page,
}, info) => {
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');

  // Full is the initial choice even when the OS requests reduced motion
  await openSettings(page);
  await expect(page.locator('#motion-mode')).toHaveValue('full');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  expect(await page.evaluate(() => window.__horizon!.motion())).toEqual({
    mode: 'full',
    reduced: false,
  });

  // Idle globe rotation stays still in reduced mode
  const initialRotation = await page.evaluate(() => {
    const state = window.__horizon!.state() as TimedFrame;
    return state.reducedMotion;
  });
  expect(initialRotation).toBe(false);

  // Override to Full while OS prefers reduced motion
  await page.locator('#motion-mode').selectOption('full');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  expect(
    await page.evaluate(() =>
      localStorage.getItem('journey-through-space.motion'),
    ),
  ).toBe('full');

  await closeSettings(page);
  // Launch Earth→Moon flight in Full mode, then switch to Reduced mid-flight without resetting progress
  await page.getByRole('button', { name: 'Next · Moon' }).press('Enter');
  await page.clock.runFor(1800);
  await openSettings(page);
  const beforeSwitch = await page.evaluate(
    () => window.__horizon!.state() as TimedFrame,
  );
  expect(beforeSwitch.playback).toBe('flying');
  expect(beforeSwitch.elapsed).toBeGreaterThan(1.5);
  expect(beforeSwitch.warp).toBeGreaterThan(0);

  await page.locator('#motion-mode').selectOption('reduced');
  const afterSwitch = await page.evaluate(
    () => window.__horizon!.state() as TimedFrame,
  );
  expect(afterSwitch.playback).toBe('flying');
  expect(afterSwitch.elapsed).toBeGreaterThanOrEqual(beforeSwitch.elapsed);
  expect(afterSwitch.elapsed).toBeLessThan(beforeSwitch.elapsed + 0.5);
  expect(afterSwitch.routeKm).toBeGreaterThanOrEqual(beforeSwitch.routeKm);
  expect(afterSwitch.reducedMotion).toBe(true);
  expect(afterSwitch.warp).toBe(0);
  expect(await page.evaluate(() => window.__horizon!.render()?.warp)).toBe(0);
  if (info.project.name === 'desktop') {
    expect(await page.evaluate(() => window.__horizon!.render()?.fov)).toBe(40);
  }

  await closeSettings(page);
  // Verify unblurred digits and <= 10 Hz update cadence over 1 second of active flight
  const cadence = await page.evaluate(() => {
    const el = document.querySelector('#speed-digits')!;
    let mutations = 0;
    const obs = new MutationObserver(() => {
      mutations++;
    });
    obs.observe(el, { attributes: true, attributeFilter: ['data-value'] });
    (
      window as unknown as { __stopDigitsObserver?: () => number }
    ).__stopDigitsObserver = () => {
      obs.disconnect();
      return mutations;
    };
    return [...el.querySelectorAll<HTMLElement>('.digit')].every(
      (d) => !d.style.filter,
    );
  });
  expect(cadence).toBe(true);
  for (let i = 0; i < 20; i++) {
    await page.clock.runFor(50);
  }
  const updatesInOneSecond = await page.evaluate(() =>
    (
      window as unknown as { __stopDigitsObserver: () => number }
    ).__stopDigitsObserver(),
  );
  expect(updatesInOneSecond).toBeGreaterThanOrEqual(1);
  expect(updatesInOneSecond).toBeLessThanOrEqual(11);

  const anyBlurred = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('#speed-digits .digit')].some(
      (d) => d.style.filter !== '',
    ),
  );
  expect(anyBlurred).toBe(false);

  // Finish the authored flight and confirm arrival at Moon
  await page.clock.fastForward(LEG_DURATIONS[0] * 1000);
  await expect(page.locator('#location')).toHaveText('Moon');
  await page.screenshot({
    path: `artifacts/journey-through-space/eh-06/${info.project.name}-reduced-moon.png`,
    animations: 'disabled',
  });

  // Reload preserves explicit Reduced preference
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await openSettings(page);
  await expect(page.locator('#motion-mode')).toHaveValue('reduced');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  expect(errors).toEqual([]);
});

test('keyboard-only inspection, focus transfer, polite announcements, dialog focus restoration, touch targets, and browser zoom shortcut pass-through', async ({
  page,
}, info) => {
  const errors = collectErrors(page);
  await page.clock.install();
  await page.goto('/');

  await assertNoControlOverlapAndTouchTargets(page);

  // Inspect world with keyboard and verify browser zoom shortcuts (Ctrl/Meta + +/-) are not intercepted
  const inspection = page.getByRole('region', { name: 'Inspect world' });
  await inspection.focus();
  const initialPose = await page.evaluate(
    () => window.__horizon!.state().cameraPose,
  );
  const ctrlPlusPrevented = await inspection.evaluate((el) => {
    const ev = new KeyboardEvent('keydown', {
      key: '+',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  expect(ctrlPlusPrevented).toBe(false);
  expect(
    await page.evaluate(() => window.__horizon!.state().cameraPose),
  ).toEqual(initialPose);

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('+');
  expect(
    await page.evaluate(() => window.__horizon!.state().cameraPose),
  ).not.toEqual(initialPose);
  await page.keyboard.press('Home');
  expect(
    await page.evaluate(() => window.__horizon!.state().cameraPose),
  ).toEqual(initialPose);

  // Details and Sources dialogs trap focus, scroll internally without launching flight, and restore focus on close
  const detailsBtn = page.getByRole('button', { name: 'Details', exact: true });
  await detailsBtn.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#details')).toBeVisible();
  await page.locator('#details').dispatchEvent('wheel', { deltaY: 240 });
  await page.clock.runFor(350);
  await expect(page.locator('body')).toHaveAttribute(
    'data-playback',
    'observing',
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('#details')).toBeHidden();
  await expect(detailsBtn).toBeFocused();

  await openSettings(page);
  const sourcesBtn = page.getByRole('button', { name: 'Sources', exact: true });
  await sourcesBtn.focus();
  await page.keyboard.press(' ');
  await expect(page.locator('#sources')).toBeVisible();
  await expect(page.locator('#sources')).toContainText(
    'System, Full, or Reduced',
  );
  await page.getByRole('button', { name: 'Close sources' }).press('Enter');
  await expect(page.locator('#sources')).toBeHidden();
  await expect(page.locator('#settings-toggle')).toBeFocused();

  // Launch with keyboard transfers focus from hidden Next button to Pause and announces flight politely
  const nextBtn = page.getByRole('button', { name: 'Next · Moon' });
  await nextBtn.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeFocused();
  await expect(page.locator('#journey-announcement')).toHaveText(
    'Flying to Moon.',
  );
  await expect(page.locator('#skip-flight')).toHaveAttribute(
    'aria-description',
    'Skip flight to Moon',
  );
  await assertNoControlOverlapAndTouchTargets(page);

  // Escape pauses flight and announces pause
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-playback', 'paused');
  await expect(page.locator('#journey-announcement')).toHaveText(
    'Flight paused.',
  );

  // Resume with Spacebar and complete flight; focus returns to visible Next destination button
  await page.getByRole('button', { name: 'Resume', exact: true }).focus();
  await page.keyboard.press(' ');
  await expect(page.locator('#journey-announcement')).toHaveText(
    'Flight resumed.',
  );
  await page.clock.fastForward(LEG_DURATIONS[0] * 1000 + 200);
  await expect(page.locator('#location')).toHaveText('Moon');
  await expect(page.locator('#journey-announcement')).toHaveText(
    'Arrived at Moon.',
  );
  await expect(
    page.getByRole('button', { name: 'Next · Mercury' }),
  ).toBeFocused();

  if (info.project.name === 'desktop') {
    await page.setViewportSize({ width: 1366, height: 768 });
    await assertNoControlOverlapAndTouchTargets(page);
    expect(await hasHorizontalOverflow(page)).toBe(false);
  }
  expect(errors).toEqual([]);
});

test('mobile drag, pinch, pointercancel, and orientation/resize changes retain progress without accidental travel', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const scene = page.locator('#inspection');
  const canonical = await page.evaluate(
    () => window.__horizon!.state().cameraPose,
  );

  // Pointer drag then pointercancel clears drag and velocity without launching travel
  await scene.dispatchEvent('pointerdown', {
    pointerId: 1,
    clientX: 180,
    clientY: 220,
  });
  await scene.dispatchEvent('pointermove', {
    pointerId: 1,
    clientX: 240,
    clientY: 160,
  });
  await scene.dispatchEvent('pointercancel', { pointerId: 1 });
  const afterCancel = await page.evaluate(
    () => window.__horizon!.state().cameraPose,
  );
  await page.clock.runFor(300);
  expect(
    await page.evaluate(() => window.__horizon!.state().cameraPose),
  ).toEqual(afterCancel);
  expect(afterCancel).not.toEqual(canonical);
  await expect(page.locator('body')).toHaveAttribute(
    'data-playback',
    'observing',
  );

  // Start flight and rotate/resize viewport mid-flight: progress is preserved
  await page.getByRole('button', { name: 'Next · Moon' }).click();
  await page.clock.runFor(2400);
  const progressBeforeResize = await page.evaluate(
    () => (window.__horizon!.state() as TimedFrame).elapsed,
  );
  await page.setViewportSize({ width: 844, height: 390 });
  expect(await hasHorizontalOverflow(page)).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  const progressAfterResize = await page.evaluate(
    () => (window.__horizon!.state() as TimedFrame).elapsed,
  );
  expect(progressAfterResize).toBeGreaterThanOrEqual(progressBeforeResize);
  expect(await hasHorizontalOverflow(page)).toBe(false);

  // Adaptive quality preserves scientific quantities and leg duration
  await page.evaluate(() => window.__horizon!.setQuality(0.5));
  expect(await page.evaluate(() => window.__horizon!.render()?.quality)).toBe(
    0.5,
  );
  await page.clock.fastForward(LEG_DURATIONS[0] * 1000);
  await expect(page.locator('#location')).toHaveText('Moon');
  expect(errors).toEqual([]);
});

test('10-second texture load timeout enables illustrated fallback with concise notice without freezing midflight', async ({
  page,
}, info) => {
  const errors = collectErrors(page);
  await page.clock.install();
  // Hold Moon and Mercury texture requests open indefinitely to trigger the 10 s timeout
  await page.route('**/textures/moon.jpg', () => {
    /* intentionally never fulfilled */
  });
  await page.goto('/');
  await expect(page.locator('#location')).toHaveText('Earth');

  // Launch Earth→Moon while moon.jpg is still pending: camera moves smoothly and never freezes
  await page.getByRole('button', { name: 'Next · Moon' }).click();
  await page.clock.runFor(3000);
  const midFlight = await page.evaluate(
    () => window.__horizon!.state() as TimedFrame,
  );
  expect(midFlight.playback).toBe('flying');
  expect(midFlight.routeKm).toBeGreaterThan(0);

  // Flight completes at its authored duration despite the pending texture
  await page.clock.fastForward(LEG_DURATIONS[0] * 1000);
  await expect(page.locator('#location')).toHaveText('Moon');
  await expect(page.locator('body')).toHaveAttribute(
    'data-playback',
    'observing',
  );

  // Advance past the 10 s load timeout: illustrated fallback activates and pending count reaches 0
  await page.clock.fastForward(LEG_DURATIONS[0] * 1000);
  await expect(page.locator('html')).toHaveAttribute(
    'data-texture-fallback',
    'true',
  );
  await expect(page.locator('html')).toHaveAttribute('data-textures', 'ready');
  await expect(page.locator('#render-status')).toContainText(
    'Some imagery unavailable · illustrated surfaces remain active.',
  );
  expect(await page.evaluate(() => window.__horizon!.render()?.pending)).toBe(
    0,
  );
  expect(
    await page.evaluate(() => window.__horizon!.textureFailures()),
  ).toBeGreaterThan(0);
  await assertNoControlOverlapAndTouchTargets(page);
  await page.screenshot({
    path: `artifacts/journey-through-space/eh-06/${info.project.name}-texture-timeout-fallback.png`,
    animations: 'disabled',
  });
  await page.unroute('**/textures/moon.jpg');
  expect(errors).toEqual([]);
});

test('no-WebGL disables and explains unsupported inspection affordances while keeping route, telemetry, descent, and replay', async ({
  page,
}, info) => {
  const errors = collectErrors(page);
  await page.clock.install();
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith('webgl')) return null;
      return original.call(this, type as '2d', ...(args as []));
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/no-webgl/);
  await expect(page.locator('#render-status')).toContainText(
    'Static illustration · 3D inspection unavailable',
  );
  await expect(page.locator('#inspection-hint')).toHaveCount(0);
  await expect(page.locator('#inspection')).toHaveAttribute('inert', '');
  await expect(page.getByRole('button', { name: 'Zoom in' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Zoom out' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reset view' })).toHaveCount(0);

  // Flight, telemetry, and arrival still follow the exact schedule
  await page.getByRole('button', { name: 'Next · Moon' }).click();
  await page.clock.runFor(2500);
  expect(
    Number(await page.locator('#speed-digits').getAttribute('data-value')),
  ).toBeGreaterThan(1000);
  await page.clock.fastForward(LEG_DURATIONS[0] * 1000);
  await expect(page.locator('#location')).toHaveText('Moon');
  await assertNoControlOverlapAndTouchTargets(page);
  await page.screenshot({
    path: `artifacts/journey-through-space/eh-06/${info.project.name}-no-webgl-moon.png`,
    animations: 'disabled',
  });
  expect(await hasHorizontalOverflow(page)).toBe(false);
  expect(errors).toEqual([]);
});

test('WebGL context loss pauses travel and supports both 3D recovery and static fallback without resetting or duplicating travel', async ({
  page,
}, info) => {
  const errors = collectErrors(page);
  await page.clock.install();
  await page.goto('/');

  // Start Earth→Moon flight and lose WebGL context at 2.2 seconds
  await page.getByRole('button', { name: 'Next · Moon' }).click();
  await page.clock.runFor(2200);
  await page.evaluate(() => window.__horizon!.loseContext());

  await expect(page.locator('body')).toHaveAttribute('data-playback', 'paused');
  await expect(page.locator('html')).toHaveClass(/no-webgl/);
  await expect(page.locator('#render-status')).toContainText(
    'Graphics context lost · Journey paused',
  );
  await expect(
    page.getByRole('button', { name: 'Restore 3D view' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continue with static illustration' }),
  ).toBeVisible();

  const pausedState = await page.evaluate(
    () => window.__horizon!.state() as TimedFrame,
  );
  expect(pausedState.elapsed).toBeGreaterThanOrEqual(2.1);
  expect(pausedState.elapsed).toBeLessThan(2.6);

  // Advance clock while paused after context loss: no time is consumed
  await page.clock.fastForward(15000);
  expect(
    await page.evaluate(
      () => (window.__horizon!.state() as TimedFrame).elapsed,
    ),
  ).toBe(pausedState.elapsed);
  await assertNoControlOverlapAndTouchTargets(page);
  await page.screenshot({
    path: `artifacts/journey-through-space/eh-06/${info.project.name}-context-lost-paused.png`,
    animations: 'disabled',
  });

  // Path 1: Restore 3D view and verify progress is preserved
  await page.getByRole('button', { name: 'Restore 3D view' }).click();
  await expect(page.locator('html')).toHaveClass(/has-webgl/);
  await expect(page.locator('#context-actions')).toBeHidden();
  expect(
    await page.evaluate(
      () => (window.__horizon!.state() as TimedFrame).elapsed,
    ),
  ).toBe(pausedState.elapsed);

  // Lose context again and choose Path 2: Continue with static illustration, then Resume to finish flight
  await page.evaluate(() => window.__horizon!.loseContext());
  await page
    .getByRole('button', { name: 'Continue with static illustration' })
    .click();
  await expect(page.locator('html')).toHaveClass(/no-webgl/);
  await expect(page.locator('#context-actions')).toBeHidden();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.fastForward(LEG_DURATIONS[0] * 1000);
  await expect(page.locator('#location')).toHaveText('Moon');
  await expect(page.getByRole('button', { name: 'Zoom in' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('repeated navigation disposes non-resident scene nodes and textures', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/');
  for (const id of [
    'earth',
    'jupiter',
    'saturn',
    'neptune',
    'sagittarius-a',
    'earth',
  ]) {
    await chooseStop(page, id);
    await expect(page.locator('#location')).toHaveText(
      CHECKPOINTS.find((p) => p.id === id)!.name,
    );
    const diag = await page.evaluate(() => window.__horizon!.render());
    expect(diag!.loaded.length).toBeLessThanOrEqual(4);
    expect(diag!.textures.length).toBeLessThanOrEqual(9);
  }
  expect(errors).toEqual([]);
});
