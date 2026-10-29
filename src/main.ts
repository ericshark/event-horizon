import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './styles.css';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { Vector3 } from 'three';
import { cameraAt } from './camera';
import { ScrollTrigger, setupChapters } from './chapters';
import { BlackHoleRenderer } from './renderer';
import { drawTitle } from './title';

const CHAPTERS = [
  'Approach',
  'Accretion',
  'Photon sphere',
  'Tides',
  'Time',
  'Singularity',
];
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

const root = document.documentElement;
const reduceMotion = false;
root.classList.toggle('reduce-motion', reduceMotion);

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;

const canvas = $<HTMLCanvasElement>('#sky');
const sky = BlackHoleRenderer.create(canvas);
root.classList.add(sky ? 'has-webgl' : 'no-webgl');

const lenis = reduceMotion
  ? null
  : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

setupChapters(reduceMotion);

const sections = [...document.querySelectorAll<HTMLElement>('.chapter')];

/** Maps scroll position to 0..1 with one equal slice per chapter. */
function readScroll() {
  const vh = window.innerHeight;
  for (let i = sections.length - 1; i >= 0; i--) {
    const rect = sections[i].getBoundingClientRect();
    if (rect.top <= 1 || i === 0) {
      const span = rect.height - (i === sections.length - 1 ? vh : 0);
      const local = Math.min(Math.max(-rect.top / Math.max(span, 1), 0), 1);
      return { chapter: i, local, progress: (i + local) / sections.length };
    }
  }
  return { chapter: 0, local: 0, progress: 0 };
}

const readout = {
  r: $('[data-readout="r"]'),
  z: $('[data-readout="z"]'),
  vesc: $('[data-readout="vesc"]'),
  gaugeFill: $('[data-gauge-fill]'),
  gaugeMarker: $('[data-gauge-marker]'),
  gaugeR: $('[data-gauge-r]'),
  chapterIndex: $('[data-chapter-index]'),
  chapterName: $('[data-chapter-name]'),
  clockHome: $('[data-clock="home"]'),
  clockYou: $('[data-clock="you"]'),
  bigHome: $('[data-big-clock="home"]'),
  bigYou: $('[data-big-clock="you"]'),
  temp: $('[data-stat="temp"]'),
  orbit: $('[data-stat="orbit"]'),
  boost: $('[data-stat="boost"]'),
  tide: $('[data-stat="tide"]'),
  rate: $('[data-stat="rate"]'),
  ticks: [...document.querySelectorAll<HTMLElement>('[data-tick]')],
};

const pad = (n: number, width = 2) =>
  String(Math.floor(n)).padStart(width, '0');
const formatClock = (seconds: number, centis = true) => {
  const h = seconds / 3600;
  const m = (seconds / 60) % 60;
  const s = seconds % 60;
  const base = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return centis ? `${base}.${pad((seconds % 1) * 100)}` : base;
};

const state = {
  progress: 0,
  homeTime: 0,
  youTime: 0,
  lens: { x: 0, y: 0, presence: 0, targetPresence: 0 },
  invert: { value: 0 },
  whiteout: 0,
  chapter: -1,
  descent: 1,
  lastTime: performance.now(),
  running: true,
};

const reticle = $('.reticle');
window.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch') return;
  state.lens.x = (event.clientX / window.innerWidth) * 2 - 1;
  state.lens.y = 1 - (event.clientY / window.innerHeight) * 2;
  state.lens.targetPresence = 1;
  reticle.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
  root.classList.add('has-pointer');
});
document.addEventListener('pointerleave', () => {
  state.lens.targetPresence = 0;
  root.classList.remove('has-pointer');
});

let portrait = window.innerWidth < window.innerHeight;
function applyTitle() {
  if (!sky) return;
  const art = drawTitle(portrait);
  sky.setTitle(art.canvas, art.worldWidth);
}

window.addEventListener('resize', () => {
  sky?.resize();
  const nowPortrait = window.innerWidth < window.innerHeight;
  if (nowPortrait !== portrait) {
    portrait = nowPortrait;
    applyTitle();
  }
});

document.addEventListener('visibilitychange', () => {
  state.running = document.visibilityState === 'visible';
  state.lastTime = performance.now();
  sky?.resetTiming();
});

$('[data-fall-again]').addEventListener('click', () => {
  state.descent++;
  $('[data-descent]').textContent = pad(state.descent);
  const inverted = state.descent % 2 === 0;
  root.classList.toggle('inverted', inverted);
  gsap.to(state.invert, {
    value: inverted ? 1 : 0,
    duration: reduceMotion ? 0 : 1.4,
    ease: 'expo.inOut',
  });
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
  ScrollTrigger.refresh();
});

const lensPosition = new Vector3();
const forward = new Vector3();
const right = new Vector3();
const up = new Vector3();

function tick() {
  const now = performance.now();
  const dt = Math.min((now - state.lastTime) / 1000, 0.1);
  state.lastTime = now;
  if (!state.running) return;

  const scroll = readScroll();
  const follow = reduceMotion ? 1 : 1 - Math.exp(-dt * 6);
  state.progress += (scroll.progress - state.progress) * follow;
  if (Math.abs(scroll.progress - state.progress) < 1e-5)
    state.progress = scroll.progress;

  const time = now / 1000;
  const camera = cameraAt(state.progress, reduceMotion ? 0 : time);
  const aspect = window.innerWidth / window.innerHeight;
  // Portrait screens get a slightly wider lens so the hole doesn't fill the width.
  if (aspect < 1) camera.tanHalfFov *= 1 + 0.35 * (1 - aspect);
  const r = camera.distance;

  const lens = state.lens;
  lens.presence += (lens.targetPresence - lens.presence) * Math.min(1, dt * 4);
  const basis = camera.basis.elements;
  right.set(basis[0], basis[1], basis[2]);
  up.set(basis[3], basis[4], basis[5]);
  forward.set(basis[6], basis[7], basis[8]);
  // Put the lens on the plane through the hole, directly under the cursor.
  lensPosition
    .copy(camera.position)
    .addScaledVector(forward, r)
    .addScaledVector(right, lens.x * r * camera.tanHalfFov * aspect)
    .addScaledVector(up, lens.y * r * camera.tanHalfFov);

  const last = sections.length - 1;
  const whiteTarget =
    scroll.chapter === last
      ? gsap.utils.clamp(0, 1, (scroll.local - 0.55) / 0.3)
      : 0;
  state.whiteout = whiteTarget;
  root.classList.toggle('is-white', whiteTarget > 0.5);
  root.style.setProperty('--whiteout', whiteTarget.toFixed(3));

  sky?.render({
    time: reduceMotion ? time * 0.15 : time,
    camera,
    lensPosition,
    lensMass: 0.0028 * r * lens.presence,
    titleOpacity: gsap.utils.clamp(0, 1, 1 - (state.progress - 0.03) / 0.12),
    whiteout: state.whiteout,
    invert: state.invert.value,
  });

  // Gravitational time dilation for a static observer at radius r.
  const dilation = Math.sqrt(Math.max(1 - 1 / r, 0));
  state.homeTime += dt;
  state.youTime += dt * dilation;
  updateHud(scroll.chapter, r, dilation);
}

function updateHud(chapter: number, r: number, dilation: number) {
  const z = 1 / Math.max(dilation, 1e-4) - 1;
  const vesc = Math.min(Math.sqrt(1 / r), 1);
  readout.r.textContent = r.toFixed(2);
  readout.z.textContent = z < 10 ? z.toFixed(3) : z.toFixed(1);
  readout.vesc.textContent = vesc.toFixed(2);
  readout.gaugeR.textContent = r.toFixed(1);
  readout.gaugeFill.style.transform = `scaleY(${state.progress})`;
  readout.gaugeMarker.style.top = `${state.progress * 100}%`;

  readout.clockHome.textContent = formatClock(state.homeTime);
  readout.clockYou.textContent = formatClock(state.youTime);
  readout.bigHome.textContent = formatClock(state.homeTime, false);
  readout.bigYou.textContent = formatClock(state.youTime, false);
  readout.rate.textContent = (1 / Math.max(dilation, 1e-3)).toFixed(2);

  const orbit = Math.min(Math.sqrt(0.5 / r), 0.99);
  const gamma = 1 / Math.sqrt(1 - orbit * orbit);
  readout.temp.textContent = (
    11 * Math.pow(2.4 / Math.max(r, 2.4), 0.75)
  ).toFixed(1);
  readout.orbit.textContent = orbit.toFixed(2);
  readout.boost.textContent = (1 / (gamma * (1 - orbit))).toFixed(2);
  readout.tide.textContent = Math.round(Math.pow(30 / r, 3)).toLocaleString(
    'en-US',
  );

  if (chapter !== state.chapter) {
    state.chapter = chapter;
    readout.chapterIndex.textContent = NUMERALS[chapter];
    readout.chapterName.textContent = CHAPTERS[chapter];
    root.dataset.chapter = String(chapter);
    readout.ticks.forEach((tick, i) => {
      tick.classList.toggle('is-active', i === chapter);
      tick.classList.toggle('is-past', i < chapter);
      if (i === chapter) tick.setAttribute('aria-current', 'step');
      else tick.removeAttribute('aria-current');
    });
  }
}

for (const link of document.querySelectorAll<HTMLAnchorElement>(
  'a[href^="#chapter-"]',
)) {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const target = document.querySelector<HTMLElement>(link.hash);
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { duration: 2.4 });
    else target.scrollIntoView();
  });
}

async function boot() {
  const counter = $('[data-loader-count]');
  const display = { value: 0 };
  const loaderTime = reduceMotion ? 10 : 1400;
  const started = performance.now();
  gsap.to(display, {
    value: 92,
    duration: loaderTime / 1000,
    ease: 'power3.out',
    onUpdate: () => (counter.textContent = pad(display.value, 3)),
  });
  await Promise.race([
    Promise.all([
      document.fonts.load('italic 400 100px "Instrument Serif"'),
      document.fonts.load('500 20px "JetBrains Mono Variable"'),
    ]),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ]);
  applyTitle();
  gsap.ticker.add(tick);
  // A plain timer, not the tween, so slow first frames can't hold the loader.
  const remaining = loaderTime - (performance.now() - started);
  await new Promise((resolve) => setTimeout(resolve, Math.max(remaining, 0)));
  counter.textContent = '100';
  root.classList.add('is-ready');
}

boot();

declare global {
  interface Window {
    __horizon?: { frames: () => number; progress: () => number };
  }
}
window.__horizon = {
  frames: () => sky?.frames ?? 0,
  progress: () => state.progress,
};
