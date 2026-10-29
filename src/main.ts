import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './styles.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CHECKPOINTS, stateAt, TOTAL, type JourneyState } from './journey';
import {
  C,
  LY,
  RS,
  EARTH_RADIUS,
  BH_MASS,
  AU,
  PARKER,
  distance,
  duration,
  tidal,
  travelTime,
  clamp,
} from './science';
import { JourneyRenderer } from './renderer';
gsap.registerPlugin(ScrollTrigger);
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const main = $('#journey'),
  rail = $('#rail'),
  picker = $<HTMLSelectElement>('#checkpoints');
const number = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const metric = (label: string, value: string) =>
  `<div data-metric="${label}"><dt>${label}</dt><dd>${value}</dd></div>`;
for (const [index, p] of CHECKPOINTS.entries()) {
  const el = document.createElement('section');
  el.id = p.id;
  el.className = `chapter chapter--${p.kind}`;
  el.dataset.checkpoint = String(index);
  el.setAttribute('aria-labelledby', `${p.id}-title`);
  const physical = p.radius && p.kind !== 'blackhole' && p.kind !== 'interior';
  const stats = physical
    ? [
        ['Diameter', `${number(p.radius * 2)} km`],
        ['Mass', `${p.mass.toExponential(3)} kg`],
        ['Diameter / Earth', `${(p.radius / EARTH_RADIUS).toFixed(2)} ×`],
        [
          'Camera surface range',
          `${number(p.range)} km / ${number(p.range / 1.609344)} mi`,
        ],
        ['Light to surface', duration(p.range / C)],
        ['At Parker speed', duration(p.range / PARKER)],
        ...(p.facts ?? []),
      ]
    : p.bhRadius
      ? [
          ['Mass', `${(BH_MASS / 1.98847e30).toFixed(2)} solar masses`],
          ['Horizon radius', `${RS.toFixed(1)} km`],
          ['Virtual camera radius', `${p.bhRadius} rₛ`],
          [
            'Tidal difference / 2 m',
            `${tidal(p.bhRadius * RS).toExponential(2)} m/s²`,
          ],
          [
            'Return signal',
            p.bhRadius <= 1 ? 'Cannot escape' : 'Outside horizon',
          ],
          [
            'Viewpoint',
            index >= 17 ? 'Virtual camera' : 'Illustrated observation',
          ],
        ]
      : (p.facts ?? []);
  el.innerHTML = `<div class="chapter-panel"><article class="story"><p class="eyebrow">${p.eyebrow}</p><h${index === 0 ? '1' : '2'} id="${p.id}-title">${p.title}</h${index === 0 ? '1' : '2'}><p class="description">${p.description}</p>${index === 0 ? '<a class="begin" href="#moon">Begin the journey <span aria-hidden="true">↓</span></a>' : ''}<p class="note">${p.note}</p></article><aside class="body-facts" aria-label="${p.name} facts"><p class="facts-title">${p.name.toUpperCase()} / FIELD NOTES</p><dl>${stats.map(([a, b]) => metric(a, b)).join('')}</dl></aside></div>`;
  if (index === 20)
    el.innerHTML += `<div class="summary"><p class="eyebrow">YOUR EXPEDITION / A LIGHT-EQUIVALENT RECAP</p><h2>One Earth.<br>A universe of perspective.</h2><dl>${metric('Earth → Gaia BH1', '≈ 1,560 light-years')}${metric('Curated tour length', distance(TOTAL))}${metric('At the speed of light', duration(travelTime(TOTAL)))}${metric('At Parker’s record speed', duration(travelTime(TOTAL, PARKER)))}${metric('Physical return', 'Impossible beyond the horizon')}</dl><p>These are distance/speed comparisons, not a feasible human flight or a measure of experienced time. The virtual camera has ended inside the horizon.</p><blockquote>“We can measure the distance. We are still learning what lies beyond.”</blockquote><p class="eyebrow">EVENT HORIZON · ORIGINAL CLOSING LINE</p><details><summary>The 21 checkpoints you explored</summary><ol>${CHECKPOINTS.map((c) => `<li><a href="#${c.id}">${c.name}</a></li>`).join('')}</ol></details><a class="begin" href="#earth">Return to Earth <span aria-hidden="true">↑</span></a></div>`;
  main.append(el);
  const link = document.createElement('a');
  link.href = `#${p.id}`;
  link.setAttribute('aria-label', `${index + 1}. ${p.name}`);
  link.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><em>${p.name}</em>`;
  rail.append(link);
  picker.add(
    new Option(`${String(index + 1).padStart(2, '0')} / ${p.name}`, p.id),
  );
}
const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.85 });
lenis.on('scroll', ScrollTrigger.update);
const sections = [...document.querySelectorAll<HTMLElement>('.chapter')];
function go(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  lenis.scrollTo(section, {
    duration: 1.25,
    onComplete: () => {
      $(`#${id}-title`).setAttribute('tabindex', '-1');
      $(`#${id}-title`).focus({ preventScroll: true });
    },
  });
  history.replaceState(null, '', `#${id}`);
}
picker.addEventListener('change', () => go(picker.value));
document.addEventListener('click', (event) => {
  const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
    'a[href^="#"]',
  );
  if (link && CHECKPOINTS.some((p) => `#${p.id}` === link.hash)) {
    event.preventDefault();
    go(link.hash.slice(1));
  }
});
const dialog = $<HTMLDialogElement>('#sources');
$('#sources-open').addEventListener('click', () => {
  dialog.showModal();
  lenis.stop();
});
$('#sources-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => lenis.start());
const renderer = JourneyRenderer.create($<HTMLCanvasElement>('#universe'));
document.documentElement.classList.add(renderer ? 'has-webgl' : 'no-webgl');
if (!renderer)
  $('#render-status').textContent =
    'Static illustration mode · all checkpoints and science remain available.';
let telemetryAt = -1;
let active = -1,
  state: JourneyState = stateAt(0, 0),
  time = 0,
  last = performance.now(),
  visible = !document.hidden;
const links = [...rail.querySelectorAll('a')];
function read() {
  let i = 0;
  for (let k = sections.length - 1; k >= 0; k--) {
    if (sections[k].getBoundingClientRect().top <= innerHeight * 0.06) {
      i = k;
      break;
    }
  }
  const rect = sections[i].getBoundingClientRect();
  return stateAt(
    i,
    clamp(-rect.top / Math.max(1, rect.height - innerHeight * 0.12)),
  );
}
function update() {
  const p = CHECKPOINTS[state.index];
  if (renderer?.textureFailures)
    $('#render-status').textContent =
      'Some imagery unavailable · illustrated surfaces remain active.';
  if (active !== state.index) {
    active = state.index;
    document.body.dataset.checkpoint = p.id;
    document.documentElement.style.setProperty('--accent', p.color);
    picker.value = p.id;
    links.forEach((l, i) => {
      if (i === active) l.setAttribute('aria-current', 'step');
      else l.removeAttribute('aria-current');
    });
    document.documentElement.style.setProperty('--fallback-color', p.color);
    document.documentElement.dataset.kind = p.kind;
  }
  const activeSection = sections[state.index];
  for (const [label, value] of [
    [
      'Camera surface range',
      `${number(state.localRangeKm)} km / ${number(state.localRangeKm / 1.609344)} mi`,
    ],
    ['Light to surface', duration(state.localRangeKm / C)],
    ['At Parker speed', duration(state.localRangeKm / PARKER)],
    ['Virtual camera radius', `${state.bhRadius.toFixed(2)} rₛ`],
    [
      'Tidal difference / 2 m',
      `${tidal(state.bhRadius * RS).toExponential(2)} m/s²`,
    ],
  ]) {
    const dd = activeSection.querySelector(`[data-metric="${label}"] dd`);
    if (dd) dd.textContent = value;
  }
  $('#earth-distance').textContent = distance(state.earthKm);
  $('#earth-miles').textContent =
    `${number(state.earthKm / 1.609344)} mi · ${state.index >= 19 ? 'no return signal' : `light home: ${duration(state.earthKm / C)}`}`;
  $('#route-distance').textContent = distance(state.routeKm);
  $('#remaining-distance').textContent = distance(state.remainingKm);
  document.querySelector('.mission-meta span:last-child')!.textContent =
    `REMAINING: ${distance(state.remainingKm)}`;
  $('#light-time').textContent = duration(travelTime(state.routeKm));
  $('#parker-time').textContent = duration(travelTime(state.routeKm, PARKER));
  const legDistance =
    state.remainingKm && state.index < CHECKPOINTS.length - 1
      ? stateAt(state.index, 1).routeKm - stateAt(state.index, 0).routeKm
      : 0;
  $('#compression').textContent = legDistance
    ? `Next transit spans ${duration(legDistance / C)} at 1c`
    : state.index >= 19
      ? 'No physical return beyond the horizon'
      : 'Local approach · distance scale changes';
  document.documentElement.style.setProperty(
    '--progress',
    String((state.index + state.local) / CHECKPOINTS.length),
  );
}
function frame() {
  const now = performance.now(),
    dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!visible) return;
  time += dt;
  lenis.raf(now);
  state = read();
  if (state.index !== active || now - telemetryAt >= 100) {
    update();
    telemetryAt = now;
  }
  renderer?.render(state, time);
}
gsap.ticker.add(frame);
gsap.ticker.lagSmoothing(0);
document.addEventListener('visibilitychange', () => {
  visible = !document.hidden;
  last = performance.now();
  renderer?.resetTiming();
});
window.addEventListener('resize', () => {
  renderer?.resize();
  ScrollTrigger.refresh();
});
window.addEventListener(
  'pagehide',
  () => {
    gsap.ticker.remove(frame);
    lenis.destroy();
    renderer?.dispose();
  },
  { once: true },
);
if (location.hash && CHECKPOINTS.some((p) => `#${p.id}` === location.hash))
  requestAnimationFrame(() =>
    lenis.scrollTo(location.hash, { immediate: true }),
  );
update();
declare global {
  interface Window {
    __horizon?: {
      frames: () => number;
      state: () => JourneyState;
      textureFailures: () => number;
      visible: () => boolean;
      constants: { c: number; ly: number; au: number };
    };
  }
}
window.__horizon = {
  frames: () => renderer?.frames ?? 0,
  state: () => state,
  textureFailures: () => renderer?.textureFailures ?? 0,
  visible: () => visible,
  constants: { c: C, ly: LY, au: AU },
};
