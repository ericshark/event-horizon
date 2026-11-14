import {
  AU,
  RS,
  BH_MASS,
  planetPosition,
  starPosition,
  sub,
  norm,
  clamp,
  smooth,
  type Vec,
} from './science';
export interface Checkpoint {
  id: string;
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  kind: 'planet' | 'star' | 'field' | 'probe' | 'blackhole' | 'interior';
  radius: number;
  mass: number;
  texture?: string;
  color: string;
  position: Vec;
  range: number;
  facts?: [string, string][];
  bhRadius?: number;
}
const earth = planetPosition('earth');
const planet = (id: string) => sub(planetPosition(id), earth);
const bh = starPosition(266.4166667, -29.0077778, 26000);
const direction = bh.map((v) => v / norm(bh)) as Vec;
const radial = (au: number) => direction.map((v) => v * au * AU) as Vec;
const make = (
  id: string,
  name: string,
  eyebrow: string,
  title: string,
  description: string,
  note: string,
  kind: Checkpoint['kind'],
  radius: number,
  mass: number,
  color: string,
  position: Vec,
  texture?: string,
  facts?: [string, string][],
): Checkpoint => ({
  id,
  name,
  eyebrow,
  title,
  description,
  note,
  kind,
  radius,
  mass,
  color,
  position,
  texture,
  range: radius ? radius * 3.1392246 : AU,
  facts,
});
export const CHECKPOINTS: Checkpoint[] = [
  make(
    'earth',
    'Earth',
    '01 / Our point of departure',
    'How far away is the heart of the Milky Way?',
    'Start here. One blue world, a thin atmosphere, and everything we have ever called home. Scroll to leave Earth behind and follow a guided tour to Sagittarius A*, the black hole at our galaxy’s centre.',
    'A curated educational tour. Bodies are enlarged, detours are intentional, and time is compressed. This is not a straight-line flight or live tracking.',
    'planet',
    6371,
    5.9722e24,
    '#74cfff',
    [0, 0, 0],
    'earth',
    [
      ['Circumference', '40,075 km · equatorial'],
      ['Rotation', '1,674 km/h · equator'],
      ['Sidereal day', '23 h 56 m'],
      ['Orbit around Sun', '107,200 km/h'],
      ['Globe animation', '1 rotation / 120 s · accelerated'],
    ],
  ),
  make(
    'moon',
    'Moon',
    '02 / Our nearest companion',
    'A small step into the distance.',
    'The Moon is close enough for its light to reach us in about 1.3 seconds. Its battered surface records billions of years of impacts; it keeps nearly the same face turned toward Earth.',
    'Mean Earth–Moon distance: 384,400 km. The lunar position in this tour is a mean-distance illustration, not a dated ephemeris.',
    'planet',
    1737.4,
    7.342e22,
    '#d7d9de',
    [384400, 0, 0],
    'moon',
  ),
  make(
    'mercury',
    'Mercury',
    '03 / Inner-world detour',
    'A world of extremes.',
    'Small, heavily cratered Mercury circles the Sun in just 88 Earth days. With almost no atmosphere to retain heat, its day and night temperatures are dramatically different.',
    'The inner planets are a deliberate detour before we head outward. Surface imagery is a NASA-derived global map; the tour scales and lights it for illustration.',
    'planet',
    2439.7,
    3.3011e23,
    '#b0a498',
    planet('mercury'),
    'mercury',
  ),
  make(
    'venus',
    'Venus',
    '04 / Beneath the clouds',
    'Beautiful from a distance.',
    'Venus wears a thick veil of sulfuric-acid clouds. Beneath them, its carbon-dioxide atmosphere traps enough heat to make it hotter than Mercury.',
    'The visible cloud deck is not the solid surface. Size comparison uses Venus’s mean solid-body radius.',
    'planet',
    6051.8,
    4.8675e24,
    '#ead3a0',
    planet('venus'),
    'venus',
  ),
  make(
    'sun',
    'Sun',
    '05 / The star that makes home possible',
    'Everything starts with a star.',
    'The Sun holds almost all the mass of our solar system. Nuclear fusion in its core powers the sunlight that takes about eight minutes to reach Earth.',
    'This is a virtual observation, not a safe human approach. The animated glow is an artistic rendering over a NASA-derived solar map, not live solar imagery.',
    'star',
    695700,
    1.98847e30,
    '#ffd293',
    sub([0, 0, 0], earth),
    'sun',
    [
      ['Surface temperature', '≈ 5,772 K'],
      ['Mass share', '≈ 99.86% of solar system'],
    ],
  ),
  make(
    'mars',
    'Mars',
    '06 / Toward the outer worlds',
    'The next world on our horizon.',
    'Rust gives Mars its familiar colour. Beyond its orbit lies the main asteroid belt: a vast, mostly empty region of rocky bodies, not a crowded obstacle course.',
    'The asteroid belt is shown as a sparse illustrative population. Distances and object sizes are displayed on different scales.',
    'planet',
    3389.5,
    6.4171e23,
    '#e1a17a',
    planet('mars'),
    'mars',
  ),
  make(
    'jupiter',
    'Jupiter',
    '07 / The giant',
    'A planet that changes the scale.',
    'Jupiter is more than ten Earths wide. Its bands are moving cloud systems, and the Great Red Spot is a storm larger than our planet.',
    'This is a spacecraft-derived cloud map, not a live weather image.',
    'planet',
    69911,
    1.8982e27,
    '#dec4a7',
    planet('jupiter'),
    'jupiter',
  ),
  make(
    'saturn',
    'Saturn',
    '08 / Ice, rock, and empty space',
    'A thousand delicate rings.',
    'Saturn’s rings are made of countless pieces of ice and rock. They span an enormous distance but are astonishingly thin compared with their width.',
    'Ring structure comes from a radial brightness profile; transparency and brightness are enhanced for legibility.',
    'planet',
    58232,
    5.6834e26,
    '#e9d6b0',
    planet('saturn'),
    'saturn',
  ),
  make(
    'uranus',
    'Uranus',
    '09 / A sideways world',
    'An unexpected tilt.',
    'Uranus rolls around the Sun with an axial tilt of roughly 98 degrees. Methane absorbs red light in its atmosphere, leaving a pale cyan world.',
    'The cloud colour follows a NASA-derived global map with its low natural contrast. Its extreme axial tilt is retained.',
    'planet',
    25362,
    8.681e25,
    '#aedfe0',
    planet('uranus'),
    'uranus',
  ),
  make(
    'neptune',
    'Neptune',
    '10 / The last major planet',
    'Beyond the familiar planets.',
    'Neptune is an ice giant swept by powerful winds. Sunlight here is hundreds of times weaker than at Earth, and one orbit takes almost 165 Earth years.',
    'The blue cloud map is historical spacecraft imagery; colour is illustrative rather than calibrated live observation.',
    'planet',
    24622,
    1.02413e26,
    '#597fc9',
    planet('neptune'),
    'neptune',
  ),
  make(
    'voyager',
    'Voyager 1',
    '11 / Humanity’s farthest messenger',
    'A little machine. An enormous journey.',
    'Launched in 1977, Voyager 1 became the first spacecraft to reach interstellar space. It has crossed the heliopause, but the distant Oort Cloud still lies ahead.',
    'Distance is an estimate propagated from NASA’s 164.7 AU Earth-distance reference on 2024-08-21 at 3.5 AU/year. Direction and spacecraft geometry are illustrative.',
    'probe',
    0,
    0,
    '#e7d5a8',
    radial(172.36),
    undefined,
    [
      ['Launch', '5 September 1977'],
      ['Speed', '≈ 17 km/s · relative to Sun'],
      ['Reference distance', '≈ 172 AU · estimated, not live'],
      ['Light-time', 'Nearly one day'],
    ],
  ),
  make(
    'proxima',
    'Proxima Centauri',
    '12 / Our nearest stellar neighbour',
    'The next sun is years away.',
    'At about 4.25 light-years, Proxima Centauri is the nearest star beyond the Sun. This small red dwarf is too faint to see with the naked eye. A planet, Proxima b, orbits close to it.',
    'This stop is another educational detour. The star is illustrated; no resolved surface photograph is available.',
    'star',
    107280,
    2.426e29,
    '#f38965',
    starPosition(217.429, -62.68, 4.25),
    undefined,
    [
      ['Distance from Earth', '≈ 4.25 light-years'],
      ['Type', 'Red dwarf'],
      ['Planet', 'Proxima b · not a resolved image'],
    ],
  ),
  {
    ...make(
      'sagittarius-a',
      'Sagittarius A*',
      '13 / The heart of the Milky Way',
      'The invisible centre.',
      'At the centre of our galaxy, Sagittarius A* contains roughly four million solar masses. Nearby stars and glowing gas reveal this otherwise invisible supermassive black hole.',
      'Approximate J2000 RA 17h45m40s, Dec −29°00′28″; distance 26,000 ly. Nonrotating Schwarzschild model omits spin. The bright ring is an illustration, not a visible-light photograph. Observation remains at 1,000 horizon radii; descent is not available yet.',
      'blackhole',
      RS,
      BH_MASS,
      '#a8c7df',
      bh,
    ),
    bhRadius: 1000,
    range: 999 * RS,
  },
];
CHECKPOINTS[0].range = 20000;
CHECKPOINTS[4].range = 695700 * 9;
CHECKPOINTS[7].range = CHECKPOINTS[7].radius * 5.8;
/** Curve through safe observation positions; not a physically integrated trajectory. */
const positions = CHECKPOINTS.map((p): Vec =>
  p.kind === 'blackhole'
    ? (bh.map((v, j) => v - direction[j] * (p.bhRadius ?? 1000) * RS) as Vec)
    : [p.position[0], p.position[1], p.position[2] + p.radius + p.range],
);
/** Segment-local kilometre origin prevents galactic-coordinate cancellation in arc length. */
export const SCIENTIFIC_ORIGINS = positions;
export function routeLocalPoint(segment: number, t: number): Vec {
  const a = positions[segment],
    b = positions[Math.min(segment + 1, positions.length - 1)];
  const delta = sub(b, a),
    u = clamp(t);
  const v = delta.map((n) => n * u) as Vec;
  v[2] +=
    (u === 0 || u === 1 ? 0 : Math.sin(Math.PI * u)) *
    Math.max(
      norm(delta) * 0.08,
      CHECKPOINTS[segment].id === 'venus' || CHECKPOINTS[segment].id === 'sun'
        ? 7e6
        : 0,
    );
  return v;
}
export function routePoint(segment: number, t: number): Vec {
  if (t <= 0) return [...positions[segment]];
  if (t >= 1)
    return [...positions[Math.min(segment + 1, positions.length - 1)]];
  return routeLocalPoint(segment, t).map(
    (v, j) => positions[segment][j] + v,
  ) as Vec;
}
const LENGTH_TABLES = positions.slice(1).map((_, i) => {
  let total = 0,
    prev = routeLocalPoint(i, 0);
  const table = [0];
  for (let j = 1; j <= 256; j++) {
    const next = routeLocalPoint(i, j / 256);
    total += norm(sub(next, prev));
    table.push(total);
    prev = next;
  }
  return table;
});
export const LEG_LENGTHS = LENGTH_TABLES.map((table) => table.at(-1)!);
/** Invert the shared arc-length table so timed playback has the promised speed. */
export function pointAtDistance(segment: number, fraction: number): Vec {
  const table = LENGTH_TABLES[segment],
    length = table.at(-1)! * clamp(fraction);
  let lo = 0,
    hi = 256;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid] < length) lo = mid;
    else hi = mid;
  }
  const t =
    (lo + (length - table[lo]) / Math.max(1e-20, table[hi] - table[lo])) / 256;
  return routePoint(segment, t);
}

function partialLength(i: number, t: number) {
  const table = LENGTH_TABLES[i];
  if (!table) return 0;
  const at = clamp(t) * 256,
    j = Math.min(255, Math.floor(at));
  return table[j] + (table[j + 1] - table[j]) * (at - j);
}
export const CUMULATIVE = [0];
for (const length of LEG_LENGTHS) CUMULATIVE.push(CUMULATIVE.at(-1)! + length);
export const TOTAL = CUMULATIVE.at(-1)!;
export interface JourneyState {
  index: number;
  local: number;
  transition: number;
  earthKm: number;
  routeKm: number;
  remainingKm: number;
  localRangeKm: number;
  bhRadius: number;
}
export function stateAt(index: number, local: number): JourneyState {
  const i = Math.max(0, Math.min(CHECKPOINTS.length - 1, index));
  const p = CHECKPOINTS[i];
  const t = smooth((local - 0.62) / 0.38);
  const pos = routePoint(i, t);
  const routeKm = CUMULATIVE[i] + partialLength(i, t);
  const next = CHECKPOINTS[Math.min(i + 1, CHECKPOINTS.length - 1)];
  return {
    index: i,
    local: clamp(local),
    transition: t,
    earthKm: norm(pos),
    routeKm,
    remainingKm: Math.max(0, TOTAL - routeKm),
    localRangeKm:
      p.radius && p.kind !== 'blackhole'
        ? p.radius *
          (Math.hypot(
            Math.sin(t * Math.PI) * 4,
            1 +
              p.range / p.radius +
              t * 17 +
              (i > 0 ? (1 - smooth(local / 0.15)) * 9 : 0),
          ) -
            1)
        : p.range,
    bhRadius:
      (p.bhRadius ?? 1000) +
      ((next.bhRadius ?? 1000) - (p.bhRadius ?? 1000)) * t,
  };
}

/** Curated resting facts for the timed slice; keep source ownership with the catalog. */
export const OBSERVATION_FACTS: Record<
  string,
  { source: string; facts: [string, string][] }
> = {
  earth: {
    source: 'https://science.nasa.gov/earth/facts/',
    facts: [
      ['Diameter', '12,742 km'],
      ['Day length', '23 h 56 m · sidereal'],
      ['Atmosphere', '78% nitrogen · 21% oxygen'],
    ],
  },
  moon: {
    source: 'https://science.nasa.gov/moon/facts/',
    facts: [
      ['Diameter', '3,474.8 km'],
      ['Mean Earth separation', '384,400 km'],
      ['Surface gravity', '1.62 m/s²'],
    ],
  },
};

/** Authored seconds per adjacent connection; physical lengths remain independent. */
export const LEG_DURATIONS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 26, 34, 50];
export const PLAYBACK_SECONDS = LEG_DURATIONS.reduce(
  (sum, seconds) => sum + seconds,
  0,
);
const LEGACY_STOPS: Record<string, string> = {
  kuiper: 'voyager',
  heliopause: 'voyager',
  oort: 'proxima',
  interstellar: 'sagittarius-a',
  gaia: 'sagittarius-a',
  'gaia-bh1': 'sagittarius-a',
  blackhole: 'sagittarius-a',
  tides: 'sagittarius-a',
  photon: 'sagittarius-a',
  horizon: 'sagittarius-a',
  descent: 'sagittarius-a',
  interior: 'sagittarius-a',
};
export function resolveStop(id: string): number {
  const target = LEGACY_STOPS[id] ?? id;
  return Math.max(
    0,
    CHECKPOINTS.findIndex((p) => p.id === target),
  );
}

const additionalFacts: Record<string, [string, string][]> = {
  mercury: [
    ['Diameter', '4,879.4 km'],
    ['Orbital period', '88 Earth days'],
    ['Temperature', '−180 to 430 °C'],
  ],
  venus: [
    ['Diameter', '12,103.6 km'],
    ['Surface temperature', '≈ 467 °C'],
    ['Atmosphere', 'Mostly carbon dioxide'],
  ],
  sun: [
    ['Diameter', '1,391,400 km'],
    ['Photosphere temperature', '≈ 5,500 °C'],
    ['Solar system mass', '≈ 99.8%'],
  ],
  mars: [
    ['Diameter', '6,779 km'],
    ['Day length', '24.6 hours'],
    ['Surface gravity', '3.71 m/s²'],
  ],
  jupiter: [
    ['Diameter', '139,822 km · mean'],
    ['Mass', '1.8982 × 10²⁷ kg'],
    ['Great Red Spot', 'Storm larger than Earth'],
  ],
  saturn: [
    ['Diameter', '116,464 km · mean'],
    ['Rings', 'Countless pieces of ice and rock'],
    ['Mean density', 'Less dense than water'],
  ],
  uranus: [
    ['Diameter', '50,724 km · mean'],
    ['Axial tilt', '≈ 98°'],
    ['Orbital period', '84 Earth years'],
  ],
  neptune: [
    ['Diameter', '49,244 km · mean'],
    ['Orbital period', '165 Earth years'],
    ['Winds', 'Over 2,000 km/h'],
  ],
  voyager: [
    ['Launch', '5 September 1977'],
    ['Probe speed', '≈ 17 km/s · relative to Sun'],
    ['High-gain dish', '3.7 m · booms shortened in model'],
  ],
  proxima: [
    ['Earth distance', '≈ 4.25 light-years'],
    ['Star type', 'Red dwarf · surface illustrative'],
    ['Diameter', '≈ 214,560 km · model'],
  ],
  'sagittarius-a': [
    ['Earth distance', '≈ 26,000 light-years'],
    ['Mass', '≈ 4 million solar masses'],
    ['Horizon radius', `≈ ${(RS / 1e6).toFixed(1)} million km`],
  ],
};
for (const p of CHECKPOINTS) {
  if (!OBSERVATION_FACTS[p.id])
    OBSERVATION_FACTS[p.id] = {
      source:
        p.id === 'sagittarius-a'
          ? 'https://www.nasa.gov/image-article/supermassive-black-hole-sagittarius/'
          : p.id === 'voyager'
            ? 'https://science.nasa.gov/mission/voyager/voyager-1/'
            : p.id === 'proxima'
              ? 'https://science.nasa.gov/exoplanets/other-stars-other-worlds/our-nearest-celestial-neighbor-an-exotic-3-star-system/'
              : `https://science.nasa.gov/${p.id}/facts/`,
      facts: additionalFacts[p.id],
    };
}
