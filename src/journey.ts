import {
  AU,
  RS,
  planetPosition,
  starPosition,
  sub,
  norm,
  mix,
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
const bh = starPosition(262.17, -0.58, 1560);
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
    'How far away is the nearest black hole?',
    'Start here. One blue world, a thin atmosphere, and everything we have ever called home. Scroll to leave Earth behind and follow a guided tour to Gaia BH1, the nearest confirmed black hole.',
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
    'The inner planets are a deliberate detour before we head outward. Mercury’s crater shading here is illustrative, not a surface map.',
    'planet',
    2439.7,
    3.3011e23,
    '#b0a498',
    planet('mercury'),
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
    'This is a virtual observation, not a safe human approach. The glowing surface is a procedural illustration.',
    'star',
    695700,
    1.98847e30,
    '#ffd293',
    sub([0, 0, 0], earth),
    undefined,
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
    'Rings are an illustrative rendering. Their brightness is enhanced to reveal their structure.',
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
    'The cloud colour is an illustrative atmospheric material. Its extreme axial tilt is retained.',
    'planet',
    25362,
    8.681e25,
    '#aedfe0',
    planet('uranus'),
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
    'kuiper',
    'Kuiper Belt',
    '11 / Beyond Neptune',
    'The worlds we are still discovering.',
    'The Kuiper Belt contains icy remnants from the solar system’s formation. Pluto is one of its best-known inhabitants, a dwarf planet about 0.19 times Earth’s diameter.',
    'Main belt: roughly 30–50 AU from the Sun. Particle sizes and density are exaggerated for visibility.',
    'field',
    0,
    0,
    '#a5c9db',
    radial(45),
    undefined,
    [
      ['Region', '30–50 AU from Sun'],
      ['Pluto diameter', '2,377 km'],
      ['Population', 'Icy bodies · not a solid shell'],
    ],
  ),
  make(
    'heliopause',
    'Heliopause',
    '12 / A changing boundary',
    'Where the solar wind gives way.',
    'The Sun blows a bubble into the interstellar medium. At the heliopause, the outward solar wind meets pressure from the space between stars.',
    'About 120 AU is a representative crossing distance. This boundary changes shape and does not mark the end of the Sun’s gravity.',
    'field',
    0,
    0,
    '#7ac9d0',
    radial(120),
    undefined,
    [
      ['Boundary', 'Solar wind / interstellar medium'],
      ['Shape', 'Variable, asymmetric'],
      ['Distance', '≈ 120 AU · representative'],
    ],
  ),
  make(
    'voyager',
    'Voyager 1',
    '13 / Humanity’s farthest messenger',
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
    'oort',
    'Oort Cloud',
    '14 / The solar system’s distant reservoir',
    'A cloud we have never photographed.',
    'Long-period comets suggest a distant, roughly spherical reservoir of icy objects surrounding the Sun. We infer its existence; we have not directly mapped its members as a cloud.',
    'Estimated inner edge: 2,000–5,000 AU. Outer estimates extend to 100,000 AU or more. This sparse shell is an explanatory illustration, not an observed image.',
    'field',
    0,
    0,
    '#c8bde2',
    radial(50000),
    undefined,
    [
      ['Inner boundary', '≈ 2,000–5,000 AU'],
      ['Outer boundary', '≈ 100,000 AU · uncertain'],
      ['Known', 'Comet orbits support a reservoir'],
      ['Unknown', 'Population, shape, precise extent'],
    ],
  ),
  make(
    'proxima',
    'Proxima Centauri',
    '15 / Our nearest stellar neighbour',
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
  make(
    'interstellar',
    'Interstellar space',
    '16 / The space between',
    'Distance becomes the story.',
    'Stars are islands in a very large ocean. Barnard’s Star is about 6 light-years from Earth; Sirius is about 8.6. Gaia BH1 lies much farther away, in the direction of Ophiuchus.',
    'Those stars are distance comparisons, not additional flybys. The star field is illustrative, not a live navigational catalogue.',
    'field',
    0,
    0,
    '#9cb5dc',
    mix(starPosition(217.429, -62.68, 4.25), bh, 0.45),
    undefined,
    [
      ['Barnard’s Star', '≈ 6 ly from Earth'],
      ['Sirius', '≈ 8.6 ly from Earth'],
      ['Destination', '≈ 1,560 ly from Earth'],
      ['Comparison speed', '1c · light-equivalent only'],
    ],
  ),
  ...[
    [
      'gaia',
      'Gaia BH1',
      '17 / The nearest confirmed black hole',
      'The invisible destination.',
      'Gaia BH1 is about 9.62 times the mass of the Sun, paired with a Sun-like star. Its companion’s motion revealed the unseen mass. It is dormant: there is no bright accretion disk to illuminate this arrival.',
      1000,
    ],
    [
      'tides',
      'Tidal approach',
      '18 / A difference that matters',
      'Gravity pulls unevenly.',
      'The side of a body closer to the hole accelerates more strongly than the far side. Around this stellar-mass black hole, that difference becomes destructive well before the event horizon. The viewpoint now continues as a virtual camera.',
      100,
    ],
    [
      'photon',
      'Photon sphere',
      '19 / Light on a knife edge',
      'Even light can orbit.',
      'At 1.5 Schwarzschild radii, light can follow an unstable circular path. Background starlight bends into distorted arcs. A small change in direction decides whether a photon escapes or falls inward.',
      1.5,
    ],
    [
      'horizon',
      'Event horizon',
      '20 / The point of no return',
      'A boundary, not a surface.',
      'Once inside the event horizon, no future-directed signal can reach the outside universe. There is no solid shell to hit. The numerical boundary here belongs to a simplified, non-rotating black-hole model.',
      1,
    ],
    [
      'interior',
      'Interior',
      '21 / The journey ends here',
      'Beyond the last return signal.',
      'Our virtual camera has crossed the horizon. The darkness is a theoretical illustration, not a photograph of the interior. Classical relativity predicts an inward future; the full physics of the deepest interior remains unknown.',
      0.8,
    ],
  ].map(([id, name, eyebrow, title, description, r]) => ({
    ...make(
      String(id),
      String(name),
      String(eyebrow),
      String(title),
      String(description),
      'Schwarzschild model; spin and the companion’s gravity are omitted. There is no stationary observer inside the horizon.',
      id === 'interior' ? 'interior' : 'blackhole',
      RS,
      9.62 * 1.98847e30,
      '#a8c7df',
      bh,
    ),
    bhRadius: Number(r),
    range: Math.max(0, (Number(r) - 1) * RS),
  })),
];
CHECKPOINTS[0].range = 20000;
CHECKPOINTS[4].range = 695700 * 9;
CHECKPOINTS[7].range = CHECKPOINTS[7].radius * 5.8;
/** Curve through safe observation positions; not a physically integrated trajectory. */
const positions = CHECKPOINTS.map((p, i): Vec =>
  i >= 16
    ? (bh.map((v, j) => v - direction[j] * (p.bhRadius ?? 1000) * RS) as Vec)
    : [p.position[0], p.position[1], p.position[2] + p.radius + p.range],
);
export function routePoint(segment: number, t: number): Vec {
  const a = positions[segment],
    b = positions[Math.min(segment + 1, positions.length - 1)];
  const v = mix(a, b, clamp(t));
  if (segment < 15)
    v[2] +=
      Math.sin(Math.PI * clamp(t)) *
      Math.max(
        norm(sub(a, b)) * 0.08,
        segment === 3 || segment === 4 ? 7e6 : 0,
      );
  return v;
}
const LENGTH_TABLES = positions.slice(1).map((_, i) => {
  let total = 0,
    prev = routePoint(i, 0);
  const table = [0];
  for (let j = 1; j <= 256; j++) {
    const next = routePoint(i, j / 256);
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
      p.radius && i < 16
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
