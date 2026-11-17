# Visual realism: verification

Spec and tickets: `.scratch/visual-realism/`. Decisions made with the user:
relativistic-drift hyperdrive, the same full strength on every leg, and 8K hero
maps on desktop with 4K on mobile.

## What changed

| Area           | Before                                                                       | After                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Image pipeline | Direct to canvas, no tone mapping, started at 85% resolution                 | Half-float 4× MSAA buffer, bloom above 2.2 linear, lens/streak output pass, Neutral tone mapping, sRGB, dither; three quality tiers  |
| Earth          | Flat blue rim, 1024 px clouds                                                | Single-scattering atmosphere, 8K day and cloud maps, cloud shadows, GGX sun glint, city lights under cloud                           |
| Moon, Mars     | Colour photo used as a bump map                                              | Normal maps derived from LOLA / MOLA elevation; Lommel–Seeliger reflectance; earthshine                                              |
| Giants         | Lambert spheres with a dark outline                                          | True oblateness, limb darkening, soft terminator, band drift, haze shells                                                            |
| Saturn's rings | One-sided colour                                                             | Lit or back-lit by side, planet shadow, phase brightness, anti-aliased edges, 4096-sample profile                                    |
| Sun, Proxima   | Flat brown shell                                                             | HDR emission with streamer corona and exposure dip                                                                                   |
| Transitions    | Opacity fade from 45–90 units to a 3 px dot; global light flipped at mid-leg | Real geometry at all distances resolving from glints; per-world light; exposure adapts to glare                                      |
| Hyperdrive     | 850 lines, strength ≤ 0.16, FOV +3.5–8°                                      | Aberrated Milky Way and 9,000 stars stretched along their motion, Doppler tint, dust streaks, edge bend, FOV +14°, same on every leg |
| Camera         | Straight crossing                                                            | Gentle bank into each arc (peak ≈ 4°), slight cruise float                                                                           |

Science, itinerary, durations, units and instruments are untouched. The HUD is
unchanged except the legibility vignette, whose two-stop gradients left a
visible edge across the now-brighter worlds; it now uses eased multi-stop ramps.

## Assets

`scripts/build-textures.mjs` rebuilds every shipped texture from raw downloads
(git-ignored `assets-src/raw/`). Sources, licences and modifications are in
`public/textures/credits.json`.

- 8K: Earth day and clouds, Moon, Mars, Mercury (Solar System Scope, CC BY 4.0),
  Milky Way (NASA SVS Deep Star Maps 2020, galactic coordinates).
- Elevation: LOLA LDEM 16 px/° (Moon), MOLA MEGDR 16 px/° (Mars). The build
  checks longitude alignment against the colour map by edge correlation: Mars
  needed a 180° rotation, the Moon none; both were confirmed by eye.
- Not upgraded: Jupiter, Saturn and the Sun downloads labelled 8K are the same
  4K images already shipped; no usable Mercury elevation model was available,
  so Mercury's relief is still derived from brightness.
- `public/textures` grew from 17 MB to 64 MB, 38 MB of it 8K hero maps fetched
  only on the high tier for the world being observed.

## Results

- `npm run typecheck`, `npm run build` and `npm run format:check` pass.
- Full Playwright suite, desktop and mobile: **172 of 172 passed** (13.7 min,
  software WebGL). 9 new unit cases in `tests/warp.spec.ts` cover the warp
  envelope (zero at rest and in Reduced motion, full on every leg, monotonic,
  no steps, forward/reverse parity), aberration and Doppler maths, exposure
  bounds, tier selection, hero-map policy, heading continuity and bank limits.
  The assertions that encoded the old restraint (FOV ≤ 3.5°, small streak
  caps, desktop FOV < 44) were rewritten with the same intent (smooth,
  bounded, zero at rest) against the new full-strength numbers.
- Captured with `scripts/capture-visuals.mjs` on the high tier: all stops at
  rest and maximum zoom, plus eight-frame strips of Earth → Moon and
  Proxima → Sagittarius A* in Full and Reduced motion (`samples.json` records
  thrust, β, FOV, bank and exposure per frame). In Reduced motion every sample
  has β = 0, FOV 40 and bank 0.

## Defects found and fixed during verification

- A mid-flight adaptive downscale resized the canvas after it was drawn, so a
  slow mobile device could show one blank frame per downscale. The downscale
  now happens before drawing, and a cleared canvas is always redrawn.
- The low tier (software or very weak GPUs) was heavier than before and made a
  touch double-tap test flaky under parallel load. Low-tier spheres, atmosphere
  steps and star count are now reduced; the test also waits for textures. The
  same tests passed three times in a row under load afterwards.
- Heading was initially computed from a point-to-point tangent and flipped at
  the path's corners; it now uses a chord across a short window.

## Limits

- Everything was rendered by SwiftShader or llvmpipe (CPU). The WSL GPU was not
  reachable from Chromium here, so **no real-GPU frame rate was measured** and
  the high-tier smoothness, bloom cost and 8K memory use on actual hardware are
  unverified. Software frame times in captures are not meaningful.
- The test browser selects the low tier, so only the forced-high captures
  (`?quality=high`) exercise bloom, MSAA, lens bend and 8K maps. The default
  suite therefore does not cover the high tier's draw path beyond those
  captures and the tier-selection unit tests.
- Look parameters (bloom threshold, streak length, exposure, haze) were tuned
  by eye against stills, not against video; expect another tuning round after
  viewing motion on a real display.
- Bundle size grew (732 kB, 204 kB gzip); no before figure was recorded.
- Jupiter, Saturn, the Sun, Venus, Uranus and Neptune remain at their previous
  resolution because no higher-resolution source was available.
