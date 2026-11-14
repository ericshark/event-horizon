// Node 22.18+ / Node 24: run `node scripts/build-reference.mjs`.
import { writeFile } from 'node:fs/promises';
import {
  planetPosition,
  sub,
  EPOCH,
  starPosition,
  BH_MASS,
  RS,
} from '../src/science.ts';
const earth = planetPosition('earth');
const data = {
  epoch: EPOCH,
  method:
    'Low-precision published J2000 Kepler elements propagated by orbital period. Not JPL Horizons vectors. No live tracking.',
  source: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html',
  frame: 'J2000 ecliptic, Earth-centred, kilometres',
  planets: Object.fromEntries(
    [
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ].map((id) => [id, sub(planetPosition(id), earth)]),
  ),
  stars: {
    proxima: {
      position: starPosition(217.429, -62.68, 4.25),
      distanceLy: 4.25,
    },
    sagittariusA: {
      position: starPosition(266.4166667, -29.0077778, 26000),
      distanceLy: 26000,
      massKg: BH_MASS,
      horizonRadiusKm: RS,
      observationRadiusKm: 1000 * RS,
      source: 'https://chandra.si.edu/photo/2026/sgrawind/index.html',
    },
  },
  notes: [
    'Stellar RA/Dec and distances are approximate catalogue references; not propagated through the journey’s elapsed light-equivalent time.',
    'Moon position uses mean distance, not a dated orbital solution.',
    'Voyager Earth distance propagated approximately from NASA 164.7 AU (2024-08-21) at 3.5 AU/year; direction is illustrative.',
  ],
};
await writeFile(
  new URL('../public/reference-snapshot.json', import.meta.url),
  JSON.stringify(data, null, 2) + '\n',
);
