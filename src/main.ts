import '@fontsource-variable/jetbrains-mono/wght.css';
import './styles.css';
import { JourneyController, WheelIntent, type TimedFrame } from './controller';
import { RollingDigits, mph, earthDistance } from './instruments';
import { inspectionInput } from './inspection-input';
import { gsap } from 'gsap';
import {
  CHECKPOINTS,
  TOTAL,
  OBSERVATION_FACTS,
  resolveStop,
  PLAYBACK_SECONDS,
  LEG_DURATIONS,
  LEG_LENGTHS,
} from './journey';
import { distanceAxis, CUMULATIVE, type FlightState } from './flight';
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
import { AudioEngine } from './audio';
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const picker = $<HTMLSelectElement>('#checkpoints');
for (const [i, p] of CHECKPOINTS.entries())
  picker.add(new Option(`${String(i + 1).padStart(2, '0')} / ${p.name}`, p.id));
const renderer = JourneyRenderer.create($<HTMLCanvasElement>('#universe'));
document.documentElement.classList.add(renderer ? 'has-webgl' : 'no-webgl');
const audio = new AudioEngine(),
  controller = new JourneyController(),
  wheel = new WheelIntent();
const digits = new RollingDigits($('#speed-digits'));
const maximumMph = Math.max(
  ...LEG_LENGTHS.map((length, i) => {
    const seconds = LEG_DURATIONS[i];
    return mph(
      length /
        (0.625 *
          (seconds -
            Math.min(2, 0.15 * seconds) -
            Math.min(1.2, 0.12 * seconds))),
    );
  }),
);
document.documentElement.style.setProperty(
  '--speed-width',
  `${Math.ceil(maximumMph).toLocaleString('en-US').length}ch`,
);
const clearInspection = inspectionInput($('#inspection'), controller);

let state: TimedFrame = controller.snapshot(),
  time = 0,
  last = performance.now(),
  visible = !document.hidden,
  uiAt = 0,
  selected = -1,
  axisKey = '';
let axisModel = distanceAxis(0, 0);
const number = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });
let navigationToken = 0;
async function go(id: string, record = true, fade = true) {
  const token = ++navigationToken;
  clearInspection();
  wheel.reset();
  controller.pause(performance.now());
  document.body.classList.toggle('direct-navigation', fade);
  if (fade) await new Promise((resolve) => setTimeout(resolve, 160));
  if (token !== navigationToken) return;
  controller.observe(resolveStop(id));
  state = controller.snapshot();
  updateUI();
  const hash = `#${CHECKPOINTS[state.now].id}`;
  if (record && location.hash !== hash) history.pushState(null, '', hash);
  else history.replaceState(null, '', hash);
  document.body.classList.remove('direct-navigation');
}
window.addEventListener(
  'hashchange',
  () => void go(location.hash.slice(1), false),
);
window.addEventListener(
  'popstate',
  () => void go(location.hash.slice(1), false),
);
picker.addEventListener('change', () => go(picker.value));
$('#begin').addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  launch(1);
});
document.addEventListener('click', (e) => {
  const link = (e.target as HTMLElement).closest<HTMLAnchorElement>(
    'a[href^="#"]',
  );
  if (link) {
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
}
function openDialog(id: string) {
  $<HTMLDialogElement>(`#${id}`).showModal();
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
    ['Light signal to Earth', duration(state.earthKm / C)],
    ['Route distance', distance(state.routeKm)],
    ['Light-equivalent route time', duration(state.routeKm / C)],
    ['Full forward playback', `${PLAYBACK_SECONDS} seconds`],
    ['At Parker’s record speed', duration(state.routeKm / PARKER)],
  ];
  if (p.radius && p.kind !== 'blackhole')
    metrics.unshift(
      ['Diameter', `${number(p.radius * 2)} km`],
      [
        'Diameter compared with Earth',
        `${(p.radius / EARTH_RADIUS).toFixed(2)} ×`,
      ],
      ['Mass', `${p.mass.toExponential(3)} kg`],
    );
  if (p.kind === 'blackhole')
    metrics.unshift(
      ['Black-hole mass', '≈ 4 million solar masses'],
      ['Horizon radius', `${RS.toFixed(1)} km`],
      ['Virtual camera radius', `${state.bhRadius.toFixed(2)} rₛ`],
      [
        'Tidal difference across 2 m',
        `${tidal(state.bhRadius * RS).toExponential(2)} m/s²`,
      ],
    );
  $('#details-content').innerHTML =
    `<p>${p.description}</p><dl>${metrics.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}${(p.facts ?? []).map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl><p class="note">${p.note}</p><p class="note">Earth distance is straight-line displacement from Earth's center, rounded to the nearest mile in the instrument. Tour distance follows the authored route. Inspection changes neither value. Virtual speed is the route-distance derivative; ×c uses the same km/s. Facts and approximate model values: see the linked source and source limitations.${` <a href="${OBSERVATION_FACTS[p.id].source}" target="_blank" rel="noreferrer">NASA · ${p.name} reference</a>`}</p><p class="note">Distances and visibility are rescaled in the visuals. Warp streaks illustrate compressed travel, not an actual faster-than-light spacecraft. Reference positions are approximations, not Horizons vectors. Parker comparisons hold its record speed constant without acceleration or braking.</p>${p.kind === 'blackhole' ? '<p class="note">The bright ring is illustrative. Optical framing is independent of the scientific observation radius; spin and relativistic orbital evolution are omitted.</p>' : ''}`;
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
    state.position === 0
      ? 0
      : Math.min(CHECKPOINTS.length - 1, Math.ceil(state.position));
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
function updateTimedUI() {
  document.body.classList.add('timed-journey');
  $('#observation-facts').hidden = false;
  $('#timed-instruments').hidden = false;
  $('#inspection').hidden = false;
  const s = state as TimedFrame,
    flying = s.playback !== 'observing';
  document.body.dataset.playback = s.playback;
  document.body.classList.toggle('in-flight', flying);
  document.body.classList.toggle('settling', s.flightPhase === 'settling');
  for (const element of [$('.masthead'), $('.flight-panel'), $('#rail')])
    element.inert = flying;
  $('#timed-navigation').hidden = flying;
  $('#inspection').inert = flying || !renderer;
  $('#playback-controls').hidden = !flying;
  $('#begin').hidden = true;
  $('#destination-marker').hidden = true;
  const observationIndex = s.flightPhase === 'settling' ? s.next : s.now;
  $('#location').textContent = CHECKPOINTS[observationIndex].name;
  $('#description').textContent = CHECKPOINTS[observationIndex].description;
  $('#phase').textContent = flying
    ? `${s.playback === 'paused' ? 'PAUSED' : s.flightPhase.toUpperCase()} / TO ${CHECKPOINTS[s.next].name.toUpperCase()}`
    : `OBSERVING / ${CHECKPOINTS[s.now].name.toUpperCase()}`;
  const observation = OBSERVATION_FACTS[CHECKPOINTS[observationIndex].id],
    facts = observation.facts;
  const key = String(observationIndex);
  if ($('#observation-facts').dataset.stop !== key) {
    $('#observation-facts').dataset.stop = key;
    $('#observation-facts').setAttribute(
      'aria-label',
      `Facts from NASA; source in Details and Sources`,
    );
    $('#observation-facts').innerHTML = facts
      .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
      .join('');
  }
  $<HTMLButtonElement>('#previous').disabled = s.now === 0;
  $<HTMLButtonElement>('#next').disabled = s.now === CHECKPOINTS.length - 1;
  $('#next').textContent =
    s.now === CHECKPOINTS.length - 1
      ? 'End of route'
      : `Next · ${CHECKPOINTS[s.now + 1].name}`;
  $('#pause-flight').textContent = s.playback === 'paused' ? 'Resume' : 'Pause';
  $('#playback-label').textContent =
    s.playback === 'paused' ? 'Paused' : flying ? 'In flight' : 'At rest';
  const earth = earthDistance(s.earthKm);
  $('#earth-miles').textContent = earth.miles;
  $('#earth-context').textContent = earth.context;
  digits.update(
    mph(s.speedKmS),
    s.playback !== 'flying',
    matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  $('#light-speed').textContent = `${(s.speedKmS / C).toFixed(2)} ×c`;
}
function updateUI() {
  const p = CHECKPOINTS[state.now];
  document.body.dataset.checkpoint = p.id;
  document.body.dataset.phase = state.phase;
  document.documentElement.dataset.kind = p.kind;
  document.documentElement.style.setProperty('--accent', p.color);
  document.documentElement.style.setProperty('--fallback-color', p.color);
  $('#next-label').textContent = `OBSERVATION / ${p.name.toUpperCase()}`;
  $('#checkpoint-count').textContent =
    `${String(state.now + 1).padStart(2, '0')} / ${CHECKPOINTS.length}`;
  $('#range-label').textContent = 'LOCAL OBSERVATION RANGE';
  $('#range-value').textContent = distance(state.rangeKm);
  $('#route-value').textContent = distance(state.routeKm);
  $('#time-value').textContent = duration(state.routeKm / C);
  $('#cinematic-note').hidden = p.kind !== 'blackhole';
  $('#ending').hidden = true;
  $('#final-stats').textContent =
    `${distance(TOTAL)} through ${CHECKPOINTS.length} stops; ${PLAYBACK_SECONDS} seconds of playback. ${duration(travelTime(TOTAL))} light-equivalent route time.`;
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
  updateTimedUI();
}
let lastPhase = '';
function frame() {
  const now = performance.now(),
    dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!visible) return;
  if (controller.snapshot().playback !== 'paused') time += dt;
  const previousPlayback = state.playback;
  state = controller.tick(now);
  if (previousPlayback !== 'observing' && state.playback === 'observing') {
    const hash = `#${CHECKPOINTS[state.now].id}`;
    if (location.hash !== hash) history.pushState(null, '', hash);
    updateUI();
    $(state.now === CHECKPOINTS.length - 1 ? '#previous' : '#next').focus();
    $('#journey-announcement').textContent =
      `Arrived at ${CHECKPOINTS[state.now].name}.`;
  }
  renderer?.render(state, time);
  audio.update(state as TimedFrame);
  if (state.now !== selected || state.phase !== lastPhase || now - uiAt >= 70) {
    updateUI();
    uiAt = now;
    lastPhase = state.phase;
  }
}
gsap.ticker.add(frame);
gsap.ticker.lagSmoothing(0);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) controller.pause(performance.now());
  visible = !document.hidden;
  audio.setHidden(document.hidden);
  clearInspection();
  wheel.reset();
  last = performance.now();
  renderer?.resetTiming();
});
window.addEventListener('resize', () => {
  renderer?.resize();
});
window.addEventListener(
  'pagehide',
  () => {
    gsap.ticker.remove(frame);
    audio.dispose();
    renderer?.dispose();
  },
  { once: true },
);
void go(location.hash.slice(1), false, false);
state = controller.snapshot();
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
      audio: () => ReturnType<AudioEngine['diagnostics']>;
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
  audio: () => audio.diagnostics(),
};

const soundToggle = $<HTMLButtonElement>('#sound-toggle');
function updateSound() {
  const status = audio.status;
  soundToggle.hidden = !audio.available;
  soundToggle.dataset.state = status;
  soundToggle.setAttribute('aria-pressed', String(status !== 'off'));
  $('#sound-label').textContent =
    status === 'off'
      ? 'Sound off'
      : status === 'on'
        ? 'Sound on'
        : 'Sound on · tap to allow';
}
audio.onchange = updateSound;
soundToggle.addEventListener('click', () => {
  // A click on a blocked "on" state is the gesture that lets playback resume.
  void audio
    .set(audio.status === 'blocked' ? true : !audio.preference)
    .then(() => {
      $('#journey-announcement').textContent = audio.preference
        ? 'Sound on.'
        : 'Sound off.';
    });
});
updateSound();

function launch(direction: number) {
  if (
    document.body.classList.contains('direct-navigation') ||
    document.querySelector('dialog[open]')
  )
    return;
  const s = controller.snapshot();
  if (s.playback !== 'observing') return;
  clearInspection();
  if (controller.launch(performance.now(), direction)) {
    wheel.reset();
    state = controller.snapshot();
    updateUI();
    $('#pause-flight').focus();
    $('#journey-announcement').textContent =
      `Flying to ${CHECKPOINTS[state.next].name}.`;
  }
}
$('#next').addEventListener('click', () => launch(1));
$('#previous').addEventListener('click', () => launch(-1));
$('#zoom-in').addEventListener('click', () => controller.zoomBy(0.95));
$('#zoom-out').addEventListener('click', () => controller.zoomBy(1.05));
$('#reset-view').addEventListener('click', () => controller.resetView());
$('#pause-flight').addEventListener('click', () => {
  if (controller.snapshot().playback === 'paused')
    controller.resume(performance.now());
  else controller.pause(performance.now());
  state = controller.snapshot();
  updateUI();
  $('#journey-announcement').textContent =
    (state as TimedFrame).playback === 'paused'
      ? 'Flight paused.'
      : 'Flight resumed.';
});
$('#skip-flight').addEventListener('click', () => {
  controller.skip();
  wheel.reset();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    controller.pause(performance.now());
    state = controller.snapshot();
    updateUI();
  }
});
document.addEventListener(
  'wheel',
  (e) => {
    const excluded = (e.target as HTMLElement).closest(
      'button,select,a,input,textarea,[contenteditable],dialog',
    );
    if (
      excluded ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      e.altKey ||
      Math.abs(e.deltaX) >= Math.abs(e.deltaY)
    ) {
      wheel.feed(0, performance.now(), false);
      return;
    }
    e.preventDefault();
    const delta =
      e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    const direction = wheel.feed(
      delta,
      performance.now(),
      controller.snapshot().playback === 'observing',
    );
    if (direction) launch(direction);
  },
  { passive: false, capture: true },
);

$('#journey-detail').addEventListener('click', () => {
  const expanded =
    $('#journey-detail').getAttribute('aria-expanded') !== 'true';
  $('#journey-detail').setAttribute('aria-expanded', String(expanded));
  document.body.classList.toggle('journey-detail-open', expanded);
});
