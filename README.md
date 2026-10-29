# Event Horizon — From Earth to the Unknown

A continuous educational scroll journey from a rotating Earth to Gaia BH1,
the nearest confirmed black hole. Twenty-one checkpoints visit the Moon, the
other planets, the Sun, distant solar-system boundaries, Voyager 1, Proxima
Centauri, and a dormant stellar-mass black hole before ending inside its horizon.

## Run and validate

Node 22.18+ (Node 24 recommended):

```sh
npm ci
npm run dev
npm run typecheck
npm run build
PW_HEADLESS=true npm test -- --workers=1
```

Browser tests use installed Chromium at `/usr/bin/chromium`; set
`CHROMIUM_PATH` for another installation. Software WebGL is much slower than
hardware and cannot establish real-GPU smoothness. Screenshots cover desktop
and mobile Earth, Venus, Saturn, Voyager, Oort Cloud, Gaia BH1 and the interior.

## Scientific model and reference data

This is a curated tour with explicit detours, enlarged bodies and compressed
presentation time. It is not a real spacecraft trajectory, live planetary map,
or navigation tool. Every displayed speed identifies its reference frame.

`src/science.ts` keeps physical quantities in km, kg and seconds. It defines
unit conversions, light/Parker-speed comparisons, an educational Newtonian
tidal estimate across two metres, and low-precision orbital positions.
`src/journey.ts` owns checkpoint content, curved-route sampling, cumulative path
length, direct Earth displacement, and local camera range. Render units are
independent of scientific units; each scene uses a local origin.

The reference date is **2026-10-29 00:00 UTC**. Direct access to JPL Horizons was
blocked by the preparation environment's network policy. The delivered snapshot
therefore explicitly uses published low-precision J2000 Kepler elements advanced
by orbital period, **not Horizons vectors**. It does not include full secular
perturbations. Moon coordinates use mean separation; Voyager's Earth-distance
estimate is propagated from NASA's 164.7 AU baseline on 2024-08-21 at 3.5 AU/year,
with an illustrative direction. Proxima/Gaia positions use approximate catalogue
RA/Dec and distances, converted to the ecliptic frame and held fixed.

Regenerate the documented snapshot with:

```sh
node scripts/build-reference.mjs
```

The static file is `public/reference-snapshot.json`. The route bends away from
celestial surfaces; it is not a gravitationally integrated flight. Distances
include detours, so cumulative tour length is greater than the approximately
1,560 ly direct Earth–Gaia BH1 separation. Light-equivalent elapsed time is
route length/c, not proper time experienced by a human. Parker comparisons
assume its record 430,000 mph can be held indefinitely and omit acceleration,
fuel and braking. No actual spacecraft can reach 1c.

Gaia BH1 uses 9.62 solar masses and a non-rotating Schwarzschild lens model.
There is no accretion disk. Tidal gradients can become destructive before the
horizon; survival thresholds are not claimed. Interior darkness is a theoretical
illustration and the interface is narrative, not a return transmission. No
physical signal or traveller can return after horizon crossing.

## Rendering, motion and assets

One Three.js WebGL context renders local celestial scenes and the dormant
black-hole ray marcher. Earth has NASA day/night imagery, a separate cloud layer,
atmospheric scattering approximation and 23.44° axial tilt. Its visible rotation
is deliberately accelerated (one turn per 120 seconds); physical rotation data
remain labeled separately. Saturn's rings, the sparse Oort Cloud, heliopause,
Voyager geometry, Mercury and Uranus materials are illustrative.

Earth loads first; the next checkpoint's imagery preloads. Adaptive render
resolution responds to slow frames without changing physical measurements.
Hidden tabs pause the render loop, bounded deltas prevent resume jumps, and
failed textures use illustrated surfaces. No-WebGL mode retains static visuals,
all checkpoint descriptions, measurements and navigation. Full visual motion
is independent of OS reduced-motion preferences, as requested.

Asset-specific credits and source URLs are in `public/textures/credits.json`.
NASA/JPL maps come from NASA's public 3D Resources collection; NASA Earth,
night, cloud and Moon maps are distributed with Three.js examples. The page's
Sources & Method dialog explains assumptions and links to NASA, ESA and JPL.
All runtime assets are local; external references open only when followed.
