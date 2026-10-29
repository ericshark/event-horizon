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
and mobile Earth, departure, the Moon, Saturn, the Oort Cloud, the accretion
approach, distance clustering and the interior.

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
The original luminous accretion shader is restored as a cinematic illustration
of an active black hole; Gaia BH1 is dormant. This distinction is visible in
the pinned interface and explained in Sources and Details. Tidal gradients can become destructive before the
horizon; survival thresholds are not claimed. Interior darkness is a theoretical
illustration and the interface is narrative, not a return transmission. No
physical signal or traveller can return after horizon crossing.

## Continuous flight and interface

The interface uses JetBrains Mono throughout and presents only location, local
range/next-destination distance, cumulative tour distance and light-equivalent
time. Details retains mass, size comparisons, Parker benchmarks and source
limitations. The final quote, summary and Return to Earth remain inside darkness.

`src/flight.ts` maps continuous scroll position into a 180-degree departure turn,
continuous camera poses, safe flybys, physical telemetry, travel direction/rate,
and the final pinned approach. Nearby groups persist across checkpoint boundaries;
previous/next objects are only disposed once they leave the active neighbourhood.
The authored local flight corridor is visually rescaled independently of physical
reference positions. It does not imply that the planets form a straight line.

The distance rail is linear in cumulative **tour distance**, including detours.
Its domain expands toward each new destination; earlier checkpoints compress
proportionally. Markers outside the current extent are not clamped onto a false
position. Overlapping checkpoints form selectable groups with a local linear
inset and exact checkpoint navigation. Reverse scrolling recomputes the same
model without retaining stale future positions.

Travel streaks use a separate GPU line field. Their length responds to a bounded
logarithmic mapping of journey-distance changes over time and decays when scroll
position stops. The effect represents compressed cinematic travel, not measured
physical spacecraft speed or a relativistic simulation. The Earth-to-space turn
holds physical distance until the camera has turned outward.

## Rendering, assets and verification

One Three.js WebGL context renders cached local celestial groups, a Hipparcos
star-map background, depth-based travel lines, and the restored accretion ray
marcher. A render-target blend hands the flight scene to the pinned black-hole
sequence. The final camera direction stays fixed while radius decreases through
the approach stages; the page has no whiteout, universe inversion or orbiting
final camera. The bright disk is an educational cinematic illustration.

Earth uses NASA day/night imagery, topographic normals, an ocean highlight mask,
separate clouds and approximate cloud shadows, atmospheric rim scattering and
23.44° axial tilt. Its visible rotation remains accelerated (one turn per 120
seconds), and all physical statistics remain separately labeled. Legacy NASA
giant-planet maps have limited resolution; they are not live weather or streamed
Google Earth terrain. Saturn’s ring shadow, Mercury/Uranus materials, spacecraft
geometry and distant populations are illustrative.

Earth loads first and nearby destinations preload. Adaptive resolution changes
render quality, not scientific measurements. Hidden tabs suspend rendering and
reset travel velocity on resume. Missing textures retain illustrated materials;
no-WebGL mode preserves descriptions, Details, checkpoint navigation and the
ending. Full visual motion is independent of OS reduced-motion preferences.

Asset provenance is in `public/textures/credits.json`. NASA/JPL maps come from
NASA’s public 3D Resources collection; NASA Earth, normal, ocean-mask, night,
cloud and Moon maps are distributed with Three.js examples. The distant sky uses
NASA’s Hipparcos star map, while nearby travel particles are an illustrative
depth field. All runtime assets are bundled locally.

Tests cover camera continuity/clearance, direction and warp decay, proportional
axis positions and clustering, persistent destination groups, all 21 checkpoints,
reverse navigation, pinned UI, source dialogs, scientific calculations and fallback
behaviour. Headless SwiftShader cannot establish real-GPU frame-rate smoothness.

With the dev server running, record a short full-interface motion review using
installed Chromium and ffmpeg:

```sh
PREVIEW_URL=http://127.0.0.1:5174 node scripts/capture-flight.mjs
```

The script saves `artifacts/motion/flight-review.webm`, covering Earth departure,
a planet flyby and the accretion approach. It records rendered frames with
timestamps; the software-rendered recording is a QA artifact, not a hardware
performance benchmark.
