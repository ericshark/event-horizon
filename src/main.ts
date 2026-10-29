import '@fontsource-variable/jetbrains-mono/wght.css';
import './styles.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { CHECKPOINTS, TOTAL } from './journey';
import {
  flightAt,
  TravelMotion,
  distanceAxis,
  CUMULATIVE,
  type FlightState,
} from './flight';
import {
  C,
  PARKER,
  RS,
  EARTH_RADIUS,
  distance,
  duration,
  tidal,
  travelTime,
} from './science';
import { JourneyRenderer } from './renderer';
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const picker = $<HTMLSelectElement>('#checkpoints'),
  main = $('#journey');
for (const [i, p] of CHECKPOINTS.entries()) {
  const el = document.createElement('section');
  el.className = 'flight-section';
  el.id = p.id;
  el.dataset.checkpoint = String(i);
  el.innerHTML = `<h2 class="sr-only">${p.name}</h2>`;
  main.append(el);
  picker.add(new Option(`${String(i + 1).padStart(2, '0')} / ${p.name}`, p.id));
}
const sections = [...document.querySelectorAll<HTMLElement>('.flight-section')];
const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.75 });
const renderer = JourneyRenderer.create($<HTMLCanvasElement>('#universe'));
document.documentElement.classList.add(renderer ? 'has-webgl' : 'no-webgl');
const motion = new TravelMotion();
let state: FlightState = flightAt(0),
  time = 0,
  last = performance.now(),
  visible = !document.hidden,
  uiAt = 0,
  selected = -1,
  axisKey = '';
let axisModel = distanceAxis(0, 0);
const number = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });
function go(id: string) {
  lenis.start();
  const section = document.getElementById(id);
  if (!section) return;
  lenis.scrollTo(section, { duration: 1.4 });
  history.replaceState(null, '', `#${id}`);
}
picker.addEventListener('change', () => go(picker.value));
$('#begin').addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  lenis.scrollTo(sections[0].offsetHeight * 0.16, { duration: 2.2 });
});
document.addEventListener('click', (e) => {
  const link = (e.target as HTMLElement).closest<HTMLAnchorElement>(
    'a[href^="#"]',
  );
  if (link && CHECKPOINTS.some((p) => `#${p.id}` === link.hash)) {
    e.preventDefault();
    for (const d of document.querySelectorAll<HTMLDialogElement>(
      'dialog[open]',
    ))
      d.close();
    go(link.hash.slice(1));
  }
});
for (const id of ['sources', 'details', 'cluster']) {
  const d = $<HTMLDialogElement>(`#${id}`);
  $(`#${id}-close`).addEventListener('click', () => d.close());
  d.addEventListener('close', () => lenis.start());
}
function openDialog(id: string) {
  $<HTMLDialogElement>(`#${id}`).showModal();
  lenis.stop();
  motion.reset();
}
$('#sources-open').addEventListener('click', () => openDialog('sources'));
$('#details-open').addEventListener('click', () => {
  updateDetails();
  openDialog('details');
});
function updateDetails() {
  const p = CHECKPOINTS[state.now];
  $('#details-title').textContent = p.name;
  const metrics: [string, string][] = [
    ['Direct distance to Earth', distance(state.earthKm)],
    [
      'Light signal to Earth',
      state.position >= 19
        ? 'Cannot escape the horizon'
        : duration(state.earthKm / C),
    ],
    ['At Parker’s record speed', duration(state.routeKm / PARKER)],
  ];
  if (p.radius && state.position < 16)
    metrics.unshift(
      ['Diameter', `${number(p.radius * 2)} km`],
      [
        'Diameter compared with Earth',
        `${(p.radius / EARTH_RADIUS).toFixed(2)} ×`,
      ],
      ['Mass', `${p.mass.toExponential(3)} kg`],
    );
  if (state.position >= 16)
    metrics.unshift(
      ['Black-hole mass', '9.62 solar masses'],
      ['Horizon radius', `${RS.toFixed(1)} km`],
      ['Virtual camera radius', `${state.bhRadius.toFixed(2)} rₛ`],
      [
        'Tidal difference across 2 m',
        `${tidal(state.bhRadius * RS).toExponential(2)} m/s²`,
      ],
    );
  $('#details-content').innerHTML =
    `<p>${p.description}</p><dl>${metrics.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}${(p.facts ?? []).map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl><p class="note">${p.note}</p><p class="note">Distances and visibility are rescaled in the visuals. Warp streaks illustrate compressed travel, not an actual faster-than-light spacecraft. Reference positions are approximations, not Horizons vectors. Parker comparisons hold its record speed constant without acceleration or braking.</p>${state.position >= 16 ? '<p class="note">The bright disk is a cinematic illustration of an active black hole. Gaia BH1 is dormant. The fixed camera continues as an imaginary observer after destructive tides.</p>' : ''}`;
}
function openCluster(indices: number[]) {
  const points = indices.map((i) => CUMULATIVE[i]),
    lo = points[0],
    hi = points.at(-1)!;
  $('#cluster-title').textContent =
    indices.length === 1
      ? CHECKPOINTS[indices[0]].name
      : `${indices.length} checkpoints on this scale`;
  $('#cluster-inset').innerHTML =
    `<span>${distance(lo)}</span><div class="inset-track">${indices.map((i) => `<i style="left:${(100 * (CUMULATIVE[i] - lo)) / Math.max(1, hi - lo)}%" title="${CHECKPOINTS[i].name}"></i>`).join('')}</div><span>${distance(hi)}</span><small>Local linear inset · ${distance(hi - lo)} span</small>`;
  $('#cluster-list').innerHTML = indices
    .map(
      (i) =>
        `<li><a href="#${CHECKPOINTS[i].id}"><span>${CHECKPOINTS[i].name}</span><small>${distance(CUMULATIVE[i])} travelled</small></a></li>`,
    )
    .join('');
  openDialog('cluster');
}
function updateAxis() {
  const revealed =
    state.position === 0 ? 0 : Math.min(20, Math.ceil(state.position));
  const width = $('#axis-track').clientWidth;
  axisModel = distanceAxis(state.routeKm, revealed, width);
  const key = axisModel.groups.map((g) => g.indices.join(',')).join('|');
  if (key !== axisKey) {
    axisKey = key;
    $('#axis-markers').replaceChildren(
      ...axisModel.groups.map((g) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'axis-marker';
        b.setAttribute(
          'aria-label',
          g.indices.length > 1
            ? `${g.indices.length} checkpoints: ${g.indices.map((i) => CHECKPOINTS[i].name).join(', ')}`
            : CHECKPOINTS[g.indices[0]].name,
        );
        b.textContent = g.indices.length > 1 ? String(g.indices.length) : '·';
        b.addEventListener('click', () =>
          g.indices.length > 1
            ? openCluster(g.indices)
            : go(CHECKPOINTS[g.indices[0]].id),
        );
        return b;
      }),
    );
  }
  [...$('#axis-markers').children].forEach((el, i) => {
    (el as HTMLElement).style.left = `${axisModel.groups[i].fraction * 100}%`;
    const active = axisModel.groups[i].indices.includes(state.now);
    el.toggleAttribute('data-active', active);
  });
  $('#axis-travel').style.width = `${axisModel.head * 100}%`;
  $('#axis-head').style.left = `${axisModel.head * 100}%`;
  $('#axis-domain').textContent =
    state.position === 0
      ? 'Earth · departure'
      : `0 → ${distance(axisModel.domain)} · linear scale`;
  $('#axis-ticks').innerHTML = axisModel.ticks
    .filter((t) => state.position > 0 || t.fraction === 0)
    .map(
      (t) => `<span style="left:${t.fraction * 100}%">${distance(t.km)}</span>`,
    )
    .join('');
}
function updateUI() {
  const p = CHECKPOINTS[state.now],
    next = CHECKPOINTS[state.next];
  const isHole = state.position >= 16;
  const localFlyby = state.phase === 'flyby' && p.radius > 0;
  document.body.dataset.checkpoint = p.id;
  document.body.dataset.phase = state.phase;
  document.documentElement.dataset.kind = p.kind;
  document.documentElement.style.setProperty('--accent', p.color);
  document.documentElement.style.setProperty('--fallback-color', p.color);
  $('#phase').textContent =
    state.phase === 'orbit'
      ? 'NOW / EARTH ORBIT'
      : state.phase === 'turn'
        ? 'DEPARTURE / TURNING OUTWARD'
        : state.phase === 'transit'
          ? `IN TRANSIT / TO ${next.name.toUpperCase()}`
          : state.phase === 'flyby'
            ? `NOW / ${p.name.toUpperCase()} FLYBY`
            : state.phase === 'interior'
              ? 'BEYOND / THE EVENT HORIZON'
              : 'GAIA BH1 / PINNED APPROACH';
  $('#location').textContent = isHole
    ? 'Gaia BH1'
    : state.phase === 'transit'
      ? next.name
      : p.name;
  $('#next-label').textContent = isHole
    ? `STAGE / ${p.name.toUpperCase()}`
    : `NOW ${p.name.toUpperCase()}  /  NEXT ${next.name.toUpperCase()}`;
  $('#checkpoint-count').textContent =
    `${String(state.now + 1).padStart(2, '0')} / 21`;
  const target = state.phase === 'transit' ? next : p;
  $('#description').textContent =
    state.phase === 'orbit'
      ? 'Our point of departure. Turn outward, then follow a 21-stop tour to the nearest confirmed black hole.'
      : state.phase === 'turn'
        ? 'Leaving home behind. Watch the Moon come into view as the camera turns outward.'
        : target.description.split('. ')[0] +
          (target.description.split('. ')[0].endsWith('.') ? '' : '.');
  $('#range-label').textContent = isHole
    ? 'DISTANCE TO THE HORIZON'
    : state.position === 0
      ? 'ALTITUDE ABOVE EARTH'
      : localFlyby
        ? `LOCAL RANGE / ${p.name.toUpperCase()}`
        : `DISTANCE TO ${next.name.toUpperCase()}`;
  const nextKm = Math.max(0, CUMULATIVE[state.next] - state.routeKm);
  $('#range-value').textContent =
    isHole && state.bhRadius <= 1
      ? 'Inside · no return'
      : distance(
          isHole
            ? state.rangeKm
            : state.position === 0
              ? 20000
              : localFlyby
                ? state.localRangeKm
                : nextKm,
        );
  $('#route-value').textContent = distance(state.routeKm);
  $('#time-value').textContent = duration(state.routeKm / C);
  $('#begin').hidden = state.position > 0.03;
  $('#cinematic-note').hidden = !isHole;
  $('#ending').hidden = state.position < 19.95;
  $('#final-stats').textContent =
    `${distance(TOTAL)} through 21 checkpoints. ${duration(travelTime(TOTAL))} at 1c; ${duration(travelTime(TOTAL, PARKER))} at Parker’s record speed.`;
  picker.value = p.id;
  if (selected !== state.now) {
    selected = state.now;
    $('#details-title').textContent = p.name;
  }
  if ($<HTMLDialogElement>('#details').open) updateDetails();
  if (renderer?.textureFailures)
    $('#render-status').textContent =
      'Some imagery unavailable · illustrated surfaces remain active.';
  else if (!renderer)
    $('#render-status').textContent =
      'Static illustration mode · navigation and science remain available.';
  updateAxis();
}
let anchors = sections.map((section) => section.offsetTop);
function readPosition() {
  let i = 0;
  for (let j = anchors.length - 1; j >= 0; j--) {
    if (scrollY + 0.5 >= anchors[j]) {
      i = j;
      break;
    }
  }
  if (i >= 20) return 20;
  return (
    i +
    Math.max(
      0,
      Math.min(1, (scrollY - anchors[i]) / (anchors[i + 1] - anchors[i])),
    )
  );
}
let lastPhase = '';
function frame() {
  const now = performance.now(),
    dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!visible) return;
  time += dt;
  lenis.raf(now);
  const q = readPosition();
  const base = flightAt(q);
  const warp = motion.update(base.routeKm, dt);
  state = flightAt(q, warp, motion.direction);
  renderer?.render(state, time);
  if (state.now !== selected || state.phase !== lastPhase || now - uiAt >= 70) {
    updateUI();
    uiAt = now;
    lastPhase = state.phase;
  }
  const marker = $('#destination-marker'),
    d = renderer?.diagnostics.target;
  marker.hidden =
    !d?.visible ||
    state.position >= 16 ||
    state.position < 0.12 ||
    state.phase === 'flyby';
  if (d) {
    marker.style.left = `${d.x * 100}%`;
    marker.style.top = `${d.y * 100}%`;
    $('#destination-name').textContent = CHECKPOINTS[state.next].name;
  }
}
gsap.ticker.add(frame);
gsap.ticker.lagSmoothing(0);
document.addEventListener('visibilitychange', () => {
  visible = !document.hidden;
  last = performance.now();
  motion.reset();
  renderer?.resetTiming();
});
window.addEventListener('resize', () => {
  anchors = sections.map((section) => section.offsetTop);
  renderer?.resize();
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
updateUI();
declare global {
  interface Window {
    __horizon?: {
      frames: () => number;
      state: () => FlightState;
      textureFailures: () => number;
      visible: () => boolean;
      axis: () => ReturnType<typeof distanceAxis>;
      render: () => JourneyRenderer['diagnostics'] | undefined;
    };
  }
}
window.__horizon = {
  frames: () => renderer?.frames ?? 0,
  state: () => state,
  textureFailures: () => renderer?.textureFailures ?? 0,
  visible: () => visible,
  axis: () => axisModel,
  render: () => renderer?.diagnostics,
};
