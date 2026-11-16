# Event Horizon — From Earth to the Unknown

An interactive educational journey from Earth to Sagittarius A*, with 13
observation stops and 12 timed flights totalling 236 active seconds. Inspect
worlds, travel forward or backward with Next/Previous or a deliberate wheel
gesture, and pause or skip each flight. The picker and URL history open
observations directly through a short fade. Old destination links redirect to
the next retained stop; old black-hole stage links open the safe observation.

## Run and validate

Node 22.18+ (Node 24 recommended):

```sh
npm ci
npm run dev
npm run typecheck
npm run build
PW_HEADLESS=true npm test
```

Tests use `/usr/bin/chromium` when present, otherwise Playwright's installed
Chromium. Set `CHROMIUM_PATH` to override. If necessary, install with
`npx playwright install chromium`. Verification is headless. Software WebGL
cannot establish real-device GPU frame pacing.

## Scientific model

Science uses kilometres, kilograms and seconds, independently of local visual
coordinates. Reference positions are fixed at **2026-10-29 00:00 UTC**. Published
low-precision J2000 Kepler elements are propagated by orbital period, **not
Horizons vectors**; secular perturbations are omitted. Moon coordinates use mean
separation. Voyager's Earth distance is estimated from NASA's 164.7 AU baseline
on 2024-08-21 at 3.5 AU/year; its direction is illustrative. Proxima and Sagittarius
A* use approximate catalogue RA/Dec and distances held fixed throughout playback.

Sagittarius A* uses approximately 4 million solar masses at 26,000 light-years,
J2000 RA 17h45m40s, Dec −29°00′28″. The simplified nonrotating Schwarzschild model
has a horizon radius of about 11.8 million km. The scientific observation point
is offset from the centre by **1,000 horizon radii**. Optical framing is authored
independently. The lensed sky and bright accretion disk are illustrative; spin
is omitted. Enter the event horizon explicitly starts a separate 20-second
illustrative descent, with pause and finish controls. Horizon approach shows
local radius instead of mph. The dark ending offers Return to Earth as a replay
reset, retaining sound preferences. Wheel input and old stage links never start
descent. See [EH-05 verification](docs/verification/eh-05.md).
Sources: [NASA mass and distance](https://www.nasa.gov/image-article/supermassive-black-hole-sagittarius/),
[Chandra coordinates](https://chandra.si.edu/photo/2026/sgrawind/index.html).

Regenerate the reference snapshot:

```sh
node scripts/build-reference.mjs
```

The curved scientific path includes intentional detours and clears surfaces and
Saturn's rings. Segment-local arc-length tables avoid subtracting galactic
coordinates to calculate speed. Analytic speed integrates to each leg's length;
reverse travel displays positive speed. Direct selections and skips settle at
zero. Earth distance is straight-line displacement and can decrease on a
detour. Instruments always retain miles, with AU above 0.1 AU and ly above 0.1 ly.
Route distance includes detours; its light-equivalent time is length/c, not
playback time or a traveller's proper time. Parker comparisons assume constant
record speed without acceleration, braking or fuel limits. This is not a
navigation-grade ephemeris or physically achievable spacecraft flight.

## Architecture and controls

- `science.ts`: units, physical constants, approximate reference positions.
- `journey.ts`: catalog, sourced facts, durations, route sampling, legacy links.
- `controller.ts`: monotonic active time, inspection, pause/resume/skip, immutable snapshots.
- `flight.ts`: shared frame contract and proportional distance-rail grouping.
- `renderer.ts`: one Three.js context, local scene origins, assets and camera application.
- `main.ts`: semantic UI, navigation/history, input and snapshot-driven instruments.

The complete route uses the timed controller; scroll position no longer owns
playback. Hidden tabs return paused. Inspection changes neither scientific
position nor route distance. Journey detail opens the truthful linear distance
rail at rest, grouping nearby markers with a selectable linear inset. Transit
retains instruments and playback controls; facts return during settling.

## Rendering and verification

Planetary encounters (EH-03), Voyager/Proxima and interstellar scenery with
optional audio (EH-04), the Sagittarius A* finale (EH-05) and motion modes,
keyboard/focus, load timeouts, context-loss recovery and static no-WebGL mode
(EH-06) are integrated. Asset provenance is in `public/textures/credits.json`.
All runtime assets are bundled locally; missing imagery uses illustrated
materials. Reduced motion (System/Full/Reduced) covers every effect through the
descent and ending, and sound pauses, skips and resets with playback.

Tests cover the exact itinerary and schedule, both directions on every leg,
analytic speed integration, scientific path and camera clearance, safe galactic
sampling, wheel ownership, pause/skip, inspection, direct/history/legacy links,
maximum-width telemetry, responsive layout, source dialogs and fallback.
Per-ticket evidence is in `docs/verification/eh-01.md`–`eh-06.md`; the final
integrated acceptance report is [EH-07](docs/verification/eh-07.md).

To record representative real-time Earth–Moon, Jupiter–Saturn and final
Proxima–Sagittarius A* flights, start a verification server, then run:

```sh
PREVIEW_URL=http://127.0.0.1:5174 node scripts/capture-flight.mjs
```

The capture script uses Playwright Chromium, saves
`artifacts/motion/eh-02/flight-review.webm`, and closes its browser. Stop the
verification server afterward. Recordings are software-rendered QA evidence,
not a hardware performance benchmark.
