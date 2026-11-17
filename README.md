# Journey Through Space

An interactive educational journey from Earth to Sagittarius A*, with 13
observation stops and 12 timed flights totalling 356 active seconds. Inspect
worlds, travel forward or backward with Next/Previous or a deliberate wheel
gesture, and pause or skip each flight. The named bottom route and URL history open
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
distance to the horizon instead of mph, then “Inside the horizon” after crossing. The dark ending offers Return to Earth as a replay
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
detour. Miles are the initial display units; settings switches all ordinary lengths and
speeds to kilometres and km/h. AU appears above 0.1 AU and ly above 0.1 ly.
Current distance from Earth is straight-line distance from Earth’s centre, not
accumulated travel; inspecting a world does not change it.
Route distance includes detours; its light-equivalent time is length/c, not
playback time or a traveller's proper time. Parker comparisons assume constant
record speed without acceleration, braking or fuel limits. This is not a
navigation-grade ephemeris or physically achievable spacecraft flight.

## Architecture and controls

- `science.ts`: units, physical constants, approximate reference positions.
- `journey.ts`: catalog, sourced facts, durations, route sampling, legacy links.
- `controller.ts`: monotonic active time, inspection, pause/resume/skip, immutable snapshots.
- `flight.ts`: shared frame contract and legacy linear-distance utilities.
- `units.ts` / `instruments.ts`: display conversions, curated fact presentation, and speed digits.
- `renderer.ts`: one Three.js context, local scene origins, assets and camera application.
- `worlds.ts`: per-world look (tilt, flattening, authored light, surface model, atmosphere).
- `planet-materials.ts`: HDR body, atmosphere, ring, corona and glint shaders.
- `warp.ts`: pure hyperdrive envelope, aberration/Doppler maths and exposure adaptation.
- `starfield.ts`: Milky Way panorama, star quads and near-field streaks.
- `post.ts`: quality tiers and the HDR chain (bloom, lens, tone mapping).
- `main.ts`: semantic UI, navigation/history, input and snapshot-driven instruments.

The complete route uses the timed controller; scroll position no longer owns
playback. Hidden tabs return paused. Inspection changes neither scientific
position nor route distance. The bottom route is a schematic itinerary: gaps gently reflect authored flight
durations and are not physical distance ratios. Hover or keyboard-focus a name
for a short preview; activate it to jump directly. On touch, tap a name then Go.
The route scrolls horizontally on narrow screens and keeps the current stop visible.
Transit hides observation content and the route, retaining speed, distance,
Pause/Resume, Skip, and the settings icon. Facts return at arrival.

Double-click or double-tap the world to toggle normal framing and maximum
close-up without changing the viewing angle. Drag, pinch, keyboard arrows,
`+`/`−`, and Home/0 remain available; the visible zoom/reset buttons are gone.
Previous/Next plays an adjacent flight rather than jumping.

The speedometer’s number is virtual route speed in mph or km/h; its needle is
relative to that leg’s peak, rather than a shared absolute speed scale.
An analytic distance-aware ramp gives gentle early acceleration and smooth
braking, with camera departure sampled from the same active clock. Visual
space is deliberately compressed; scientific progress and speed retain their
integral relationship. See [the revised duration table and numerical evidence](docs/verification/journey-through-space-flight.md).

## Rendering and verification

### Image pipeline and quality tiers

On the **high** tier (desktop with float render targets) the scene renders into
a 4× multisampled half-float buffer, bloom picks up only very bright light
(stars, glints, city lights, the accretion disc), and one output pass applies
the hyperdrive's lens bend and radial streak blur in linear light before Khronos
Neutral tone mapping, sRGB and dither. **Medium** (phones, or after adaptive
downscaling) halves bloom and MSAA. **Low** (scale below 0.5, no float buffers,
or a software rasteriser such as the test browser) renders directly with tone
mapping in each material. The existing adaptive loop moves between tiers.
`?quality=high|medium|low` pins a tier and full resolution for captures.

### Worlds

Each body's look lives in `worlds.ts`, with its own light direction so phases
vary along the tour. Atmospheres are integrated per pixel with single scattering
(Earth's blue limb and warm terminator; Venus, Mars and the giants' haze).
Rocky worlds use a Lommel–Seeliger/Lambert blend; the Moon and Mars carry
normal maps derived from LOLA and MOLA elevation, and Mercury, without usable
elevation data, derives relief from brightness. Giants are flattened to their
real oblateness and their bands drift slowly. Saturn's rings are lit or
back-lit by side and receive the globe's shadow. The Sun and Proxima are HDR
emitters with a streamer corona. Distant bodies show as points of light that
resolve into discs; there is no cross-fade. Exposure adapts to glare, so the
Milky Way fades beside a bright world and returns in empty space.

On the high tier, 8K maps for Earth (day and clouds), the Moon, Mars, Mercury
and the Milky Way stream in at rest for the observed world only and are released
on departure; 4K base maps always load first, so loading and fallback behaviour
are unchanged. Jupiter, Saturn, the Sun, Venus, Uranus and Neptune have no
higher-resolution source and stay at 4K/2K. Every shipped texture is rebuilt
from raw downloads with:

```sh
node --max-old-space-size=8192 scripts/build-textures.mjs
```

Raw files go in the git-ignored `assets-src/raw/`; the script lists each source.

### Hyperdrive

`warp.ts` maps the flight's `thrust` logarithmically to a 0–1 envelope, the
same on every leg, so the effect builds as the departure world falls away and
drops out before arrival. At speed the sky is relativistically aberrated
towards the heading (β up to 0.62), Doppler-tinted, and each star stretches
along its own apparent motion; fine dust streams past, the frame edges bend
slightly and the field of view opens by up to 14° on desktop. The camera banks
gently through each arc. Everything derives from the flight snapshot; Reduced
motion removes all of it. Captures of every stop and of fixed-fraction flight
strips in Full and Reduced:

```sh
PREVIEW_URL=http://127.0.0.1:5174 node scripts/capture-visuals.mjs
```

See [visual realism verification](docs/verification/visual-realism.md).

### Integrated features

Planetary encounters (EH-03), Voyager/Proxima and interstellar scenery with
optional audio (EH-04), the Sagittarius A* finale (EH-05) and motion modes,
keyboard/focus, load timeouts, context-loss recovery and static no-WebGL mode
(EH-06) are integrated. Asset provenance is in `public/textures/credits.json`.
All runtime assets are bundled locally; missing imagery uses illustrated
materials. Motion starts in Full, including when the OS requests reduced motion; choose
Reduced or System in the top-right settings dropdown. Explicit motion, sound,
and unit preferences persist, including legacy preferences from before the rename.
Sound starts off. Reduced motion covers every effect through the descent and
ending, and sound pauses, skips and resets with playback.

Tests cover the exact itinerary and schedule, both directions on every leg,
analytic speed integration, scientific path and camera clearance, safe galactic
sampling, wheel ownership, pause/skip, inspection, direct/history/legacy links,
maximum-width telemetry, responsive layout, source dialogs and fallback.
Per-ticket evidence is in `docs/verification/eh-01.md`–`eh-06.md`; the final
original integrated acceptance report is [EH-07](docs/verification/eh-07.md).
The current redesign’s results are recorded in
[Journey Through Space verification](docs/verification/journey-through-space.md).

To record representative real-time Earth–Moon, Jupiter–Saturn and final
Proxima–Sagittarius A* flights, start a verification server, then run:

```sh
PREVIEW_URL=http://127.0.0.1:5174 node scripts/capture-flight.mjs
```

The capture script uses Playwright Chromium, saves
`artifacts/journey-through-space/motion/flight-review.webm`, and closes its browser. Stop the
verification server afterward. Recordings are software-rendered QA evidence,
not a hardware performance benchmark.
