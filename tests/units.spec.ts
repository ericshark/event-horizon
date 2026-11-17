import { test, expect } from '@playwright/test';
import {
  formatLength,
  formatVelocity,
  speedValue,
  speedUnit,
  formatAcceleration,
} from '../src/units';

test('ordinary units convert authoritative kilometres without losing small accelerations', () => {
  expect(formatLength(1.609344, 'miles', 3)).toBe('1 mi');
  expect(formatLength(384400, 'kilometres')).toBe('384,400 km');
  expect(formatVelocity(17, 'miles')).toBe('38,028 mph');
  expect(formatVelocity(17, 'kilometres')).toBe('61,200 km/h');
  expect(speedValue(1, 'kilometres')).toBe(3600);
  expect(speedUnit('miles')).toBe('mph');
  expect(formatAcceleration(0.00162, 'kilometres')).toBe('0.00162 km/s²');
  expect(formatAcceleration(0.00162, 'miles')).toBe('0.00101 mi/s²');
});

import { observationFacts, detailFacts } from '../src/units';
import { CHECKPOINTS } from '../src/journey';
test('every observation converts lengths, speeds and acceleration while retaining qualifications', () => {
  expect(observationFacts('earth', 'miles')).toEqual([
    ['Diameter', '7,917.5 mi'],
    ['Day length', '23 hours 56 minutes'],
    ['Atmosphere', '78% nitrogen · 21% oxygen'],
  ]);
  expect(observationFacts('moon', 'kilometres')).toContainEqual([
    'Surface gravity',
    '0.00162 km/s²',
  ]);
  expect(observationFacts('moon', 'miles')).toContainEqual([
    'Mean Earth separation',
    '238,855 mi',
  ]);
  expect(observationFacts('neptune', 'miles')).toContainEqual([
    'Winds',
    'Over 1,243 mph',
  ]);
  expect(observationFacts('voyager', 'miles')).toContainEqual([
    'Probe speed',
    '≈ 38,028 mph · relative to Sun',
  ]);
  expect(detailFacts('earth', 'miles')).toContainEqual([
    'Circumference',
    '24,901 mi · equatorial',
  ]);
  expect(detailFacts('earth', 'miles')).toContainEqual([
    'Sidereal day',
    '23 hours 56 minutes · rotation relative to distant stars',
  ]);
  expect(detailFacts('voyager', 'kilometres')).toContainEqual([
    'Speed',
    '≈ 61,200 km/h · relative to Sun',
  ]);
  for (const stop of CHECKPOINTS) {
    expect(observationFacts(stop.id, 'miles')).toHaveLength(3);
    expect(observationFacts(stop.id, 'miles').join(' ')).not.toMatch(
      /\bkm\b|m\/s²/,
    );
  }
  expect(observationFacts('proxima', 'miles').join(' ')).toContain('model');
  expect(observationFacts('voyager', 'kilometres').join(' ')).toContain(
    'estimated',
  );
});

import { readUnitMode, writeUnitMode } from '../src/units';
import { AudioEngine } from '../src/audio';
test('preferences persist and explicit legacy sound migrates with new preference taking precedence', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const saved = new Map<string, string>([['event-horizon.sound', 'on']]);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    },
  });
  try {
    expect(readUnitMode()).toBe('miles');
    writeUnitMode('kilometres');
    expect(readUnitMode()).toBe('kilometres');
    expect(saved.get('journey-through-space.units')).toBe('kilometres');
    const legacy = new AudioEngine(false);
    expect(legacy.preference).toBe(true);
    expect(saved.get('journey-through-space.sound')).toBe('on');
    await legacy.set(false);
    expect(new AudioEngine(false).preference).toBe(false);
    saved.clear();
    saved.set('event-horizon.sound', 'off');
    expect(new AudioEngine(false).preference).toBe(false);
    expect(saved.get('journey-through-space.sound')).toBe('off');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('unavailable storage uses miles and silence', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('storage disabled');
    },
  });
  try {
    expect(readUnitMode()).toBe('miles');
    expect(() => writeUnitMode('kilometres')).not.toThrow();
    expect(new AudioEngine(false).preference).toBe(false);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

import { earthDistance } from '../src/instruments';
import { AU, LY } from '../src/science';
test('Earth distance uses selected ordinary units with unchanged astronomical thresholds', () => {
  expect(earthDistance(384400, 'kilometres')).toEqual({
    distance: '384,400 km',
    miles: '238,855 mi',
    context: '',
  });
  expect(earthDistance(AU, 'miles').distance).toBe(earthDistance(AU).miles);
  expect(earthDistance(AU, 'kilometres').context).toBe('1.00 AU');
  expect(earthDistance(LY * 0.1, 'kilometres').context).toBe('0.10 ly');
  expect(earthDistance(AU * 0.099).context).toBe('');
});

test('rolling digits immediately announce changed units even inside throttled updates', async ({
  page,
}) => {
  await page.route('**/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<div id="speed"><span id="digits"></span></div>',
    }),
  );
  await page.goto('/');
  const labels = await page.evaluate(async () => {
    // @ts-expect-error Vite browser import, resolved by the test server.
    const { RollingDigits } = await import('/src/instruments.ts');
    const digits = new RollingDigits(document.querySelector('#digits')!);
    const label = () =>
      document.querySelector('#speed')!.getAttribute('aria-label');
    digits.update(100, false, true, 1000);
    const legacy = label();
    digits.update(161, false, true, 1010, 'kilometres per hour');
    return [legacy, label()];
  });
  expect(labels).toEqual(['100 miles per hour', '161 kilometres per hour']);
});
