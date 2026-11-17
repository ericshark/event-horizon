# Visual realism: real-looking worlds, physical transitions, relativistic hyperdrive

Status: in-progress
Date: 2026-11-17
Decisions (user): relativistic drift hyperdrive; full warp strength on every leg; 8K hero maps on desktop, 4K on mobile.

## Context

Journey Through Space works and its interface is quiet, but the picture itself is flat. Reading the renderer and the latest captures shows why:

- **No image pipeline.** `src/renderer.ts` draws straight to the canvas: no HDR, no tone mapping, no bloom, no offscreen anti-aliasing, and it starts at 85% resolution (`private scale = 0.85`). Limbs and Saturn's rings stair-step; nothing glows.
- **Worlds are lit like plastic balls.** Earth has a flat blue rim instead of an atmosphere, 1024 px clouds, and a hard terminator. Moon/Mercury/Mars use their colour photo as a bump map. Gas giants are plain Lambert spheres with a dark outline from `rimMaterial`. The Sun's "corona" is a flat brown shell.
- **Transitions are a cross-fade.** Bodies fade by opacity between 45 and 90 units and are replaced by a 3 px dot; the scene light flips at 50% of a leg; mid-flight is near-black with blurry star blobs.
- **Hyperdrive is deliberately restrained.** 850 thin lines in a box, strength ≤ 0.16, FOV change ≤ 3.5–8°. Tests pin those caps.

Decisions you made: **relativistic drift** (real stars stretch, bunch toward the heading, shift blue ahead/red behind, space bends softly at the edges), **full strength on every leg**, and **8K colour maps for hero worlds on desktop, 4K on mobile**.

Outcome: worlds that read as photographed, flights where you never lose the sense of a continuous physical space, and a hyperdrive you feel, all still driven by the one flight clock and fully disabled in Reduced motion.

This supersedes two lines of `.scratch/journey-through-space/spec.md`: "a broad rendering rewrite" (out of scope) and the "restrained" FOV/streak character. Everything else in that spec stays binding: single schedule, Reduced motion, fallbacks, science untouched.

## Approach

Five phases, each ends with captures you can look at. Phase 1 is the foundation; 2–4 are independent of each other once it lands.

### Phase 0: Housekeeping

- Commit the three pending files from the previous task (`docs/verification/journey-through-space.md`, `index.html`, `scripts/capture-flight.mjs`) as their own commit so new work starts clean. Stay on `codex/journey-through-space`.
- Publish the spec and one ticket per phase to `.scratch/visual-realism/` (`spec.md`, `issues/01…05-*.md`), per `docs/agents/issue-tracker.md`.

### Phase 1: HDR image pipeline (new `src/post.ts`)

- Scene renders to a half-float, 4× multisampled target → bloom (`UnrealBloomPass`) → one custom output pass (lens bend and chromatic fringe in linear light, then tone map, sRGB, fine grain/dither to kill banding). Built on three's bundled `EffectComposer`/`RenderPass`; no new runtime dependency.
- Tone mapping: Khronos Neutral by default (keeps texture hues); compare against AgX in the first capture round and keep whichever looks better on the Sun and Earth.
- The Sagittarius A* ray-march composites into the HDR buffer before bloom, so the accretion disc glows through the same chain.
- **Quality tiers**, a pure function of `scale`, viewport and GPU capability, replacing the bare scale number:
  - high: full resolution (start at 1.0, DPR cap 2), MSAA 4, full bloom, 8K hero maps
  - medium (mobile, or after adaptive drops): MSAA 2, half-res bloom, 4K maps
  - low (scale < 0.5, no float buffers, software GL): no composer, tone mapping inline in materials
- The existing adaptive loop (`slow` counter, GPU fence, `setQuality`) keeps working; `resize()` also sizes the composer. Context loss/restore path unchanged.
- Hyperdrive geometry effects (Phase 4) do not depend on post, so the low tier still warps.

### Phase 2: Worlds that look real

New pure data module `src/worlds.ts` holds per-world look parameters (surface model, atmosphere, oblateness, tilt, light direction), replacing the inline `tilt` and `rimSpec` tables in `renderer.ts`. `src/planet-materials.ts` is rewritten around one body shader with per-world features:

| World                            | What changes                                                                                                                                                                                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Earth                            | Real single-scattering atmosphere shell (blue limb, orange terminator band, forward-scatter halo when backlit) plus matching haze on the ground; ocean sun-glitter with Fresnel; 8K day map; 8K clouds with self-shading and ground shadows; city lights dimmed under cloud |
| Moon, Mercury                    | Lunar-style reflectance (no fake limb darkening, brighter near full phase); normal maps derived from real elevation data; faint earthshine on the Moon's night side                                                                                                         |
| Mars                             | Elevation-derived relief; thin dusty limb haze                                                                                                                                                                                                                              |
| Venus                            | Soft wrapped terminator, pale limb haze, slow cloud-top drift                                                                                                                                                                                                               |
| Jupiter, Saturn, Uranus, Neptune | True oblate shape (Saturn is 10% flattened), limb darkening, soft terminator, high haze, very slow differential band drift; procedural fine detail on the two 2K ice giants                                                                                                 |
| Saturn's rings                   | 8K radial profile, soft planet shadow, phase-dependent brightness, translucency (stars through thin rings), darker inverted look from the unlit side, clean anti-aliased edges                                                                                              |
| Sun, Proxima                     | HDR emissive surface so it blooms; a real corona billboard with streamers replacing the brown shell; exposure dips so granulation stays visible                                                                                                                             |
| Voyager                          | Unchanged model; benefits from bloom on foil highlights and the new sky                                                                                                                                                                                                     |

- Each world gets its own authored light direction (varied phase angles instead of identical 3/4 lighting). All body shaders take a per-node `uLight`, so the global light flip at mid-leg goes away.
- The `uVisibility` shader string-patching and forced `transparent = true` in `setCheckpoint` are removed (see Phase 3); bodies become opaque and depth-correct.

**Assets** (`src/assets.ts`, `public/textures/`, new `scripts/build-textures.mjs`):

- `AssetSpec` gains a tier and `webp`. 8K WebP albedo for Earth, Moon, Mercury, Mars, Jupiter, Saturn, Sun and the Milky Way sky; Earth clouds/night at 8K; ring profile at 8K. Venus cloud deck, Uranus and Neptune have no better source than today and stay as they are.
- **Hero policy to bound GPU memory:** every stop shows its 4K map immediately (today's behaviour, so `data-textures=ready` and tests are unaffected); the 8K map streams in only for the world you are at or approaching, on the high tier, and is released when you leave. Single-channel maps (clouds, specular, ring alpha) upload as one channel.
- Sources: Solar System Scope 8K set (CC BY 4.0, already our source), NASA SVS Deep Star Maps 2020 for the Milky Way and NASA/USGS LOLA, MOLA and MESSENGER elevation for normal maps (public domain). I will confirm each download exists at the stated resolution before relying on it; where one does not, that world stays 4K and I say so.
- `scripts/build-textures.mjs` (uses `sharp`, dev-only) reproduces every derived file from raw downloads kept in a git-ignored folder. `public/textures/credits.json` records source, licence and modifications for each.
- Expected weight: roughly 30–45 MB added to the repo and deployment. Only what a visit actually reaches is downloaded.

### Phase 3: Transitions that feel physical

- **No more cross-fade.** Every resident body is real geometry at every distance. Far away it reads as a point of light (an HDR glint sized by brightness and phase) that resolves seamlessly into a disc as it grows past a few pixels. Replaces the opacity `fade` and `PointsMaterial` proxy in `renderer.ts`.
- **Exposure adaptation** (pure function of nearest-body glare, distance from the Sun and warp): beside a bright world the stars are faint, as in real photographs; as you pull away the Milky Way comes up. Near the Sun the sky nearly vanishes.
- **Camera feel** in `src/controller.ts`, path geometry and clearances untouched: bank gently into each lateral arc (roll proportional to the arc's sideways velocity, zero at both ends), and a barely perceptible float during cruise. Both come from `elapsed`, both are zero in Reduced motion.
- Controller exposes `heading` (unit travel direction) on the frame, computed from the same path function, for the hyperdrive axis. Small refactor: lift the inline path maths in `routeSnapshot` into a `pathAt(u)` helper.
- **Sky orientation** is authored by route position: the Milky Way's bright core sits off to one side in the inner system and swings dead ahead for the final legs, so you visibly fly into the galactic centre.

### Phase 4: Relativistic hyperdrive (new `src/warp.ts`, `src/starfield.ts`)

`src/warp.ts` is a pure model: frame in, `{ beta, stretch, bend, fov, exposure }` out. It replaces the bodies of `streakStrength`/`fovExpansion` in `src/scenery.ts` (names kept for existing imports).

- **Envelope:** warp follows the logarithm of the existing `thrust` value. Speed climbs through many orders of magnitude, so a log mapping makes the stars start stretching as you clear the departure world and build steadily to the cruise plateau, instead of snapping on in the last two seconds. Still one clock; pausing freezes it.
- **Same strength on every leg**, Earth → Moon included.
- `src/starfield.ts` replaces the 1,700-point `sky`, the dim textured `background` and the line `warpField`:
  - Milky Way panorama drawn with per-pixel relativistic aberration: the whole sky visibly contracts toward where you are heading.
  - About 9,000 individual stars as instanced quads with real magnitude and colour-temperature spread. Each one is aberrated, then stretched along its own screen-space motion, so the streaks _are_ the stars. Doppler shift tints them blue ahead and red at the edges.
  - `SceneryLayers` (Kuiper, heliopause, Oort, interstellar specks) moves to the same streak shader for near-field parallax; its `weights` diagnostics stay as they are.
- Post pass adds the soft bend of space at the frame edges, a little chromatic fringe and radial blur centred on the heading; the centre (your destination) stays sharp.
- FOV opens about 14° at peak on desktop. Mobile keeps its fixed FOV.
- Drop-out: streaks relax back to points as thrust falls, with a small exposure breath as the destination resolves.
- Reduced motion: beta 0, no streaks, no bend, no FOV change, static sky.

### Phase 5: Tests, docs, verification record

- Update assertions that encode the old restraint: FOV cap ≤ 3.5 and per-step streak/FOV deltas in `tests/interstellar.spec.ts`, desktop in-flight `fov < 44`, and the initial quality value. Their intent (smooth, bounded, zero at rest, zero when reduced) is kept with new numbers.
- New unit tests on the existing pure seam: warp model (zero at rest and when reduced, monotonic build, bounded per-step change, forward/reverse parity), aberration maths (identity at beta 0, forward bunching, inverse round-trip), exposure bounds, quality-tier selection, hero-asset policy, `heading` is unit length and continuous, camera roll is zero at both ends of a leg.
- Extend `scripts/capture-flight.mjs` to shoot every world at rest and max zoom plus six-frame strips for Earth → Moon and Proxima → Sagittarius A*, in Full and Reduced.
- Update `README.md` (rendering and assets), `credits.json`, and add `docs/verification/visual-realism.md`.

## Files

- Modified: `src/renderer.ts`, `src/planet-materials.ts`, `src/assets.ts`, `src/controller.ts`, `src/flight.ts`, `src/scenery.ts`, `src/scenery-layers.ts`, `scripts/capture-flight.mjs`, `tests/interstellar.spec.ts`, `tests/accessibility-resilience.spec.ts`, `tests/planets.spec.ts`, `tests/controller.spec.ts`, `README.md`, `public/textures/credits.json`, `package.json` (dev dep `sharp`), `.gitignore`
- New: `src/post.ts`, `src/worlds.ts`, `src/warp.ts`, `src/starfield.ts`, `scripts/build-textures.mjs`, `tests/warp.spec.ts`, `public/textures/8k/*`, new normal maps, `.scratch/visual-realism/*`, `docs/verification/visual-realism.md`
- Untouched: `src/science.ts`, `src/journey.ts` (itinerary, durations, distances), `src/units.ts`, `src/instruments.ts`, `src/blackhole.glsl.ts`, HUD markup and CSS.

Reused as is: `schedule()` and its `thrust` in `src/controller.ts`; `sceneryAt()` tint and layer weights in `src/scenery.ts`; `residentStops()`/`residentAssets()` in `src/assets.ts` (extended, not replaced); the texture cache, timeout and fallback path in `JourneyRenderer.loadTexture`; `screenshotContrast`/`brightColor` in `tests/helpers.ts`.

## Verification

1. `npm run typecheck`, `npm run build`, `npm run format:check`.
2. `PW_HEADLESS=true npm test` on desktop and mobile projects, including the real-time flight suites.
3. Run the extended capture script and review every still and strip; I send you the per-phase captures as they are produced.
4. Check Reduced motion by eye and by test: no streaks, no FOV change, static sky.
5. Force each quality tier with `window.__horizon.setQuality` and confirm the picture degrades gracefully and context loss/restore still recovers.
6. Clean up every server and browser started for verification.

Limits I will state rather than paper over: the test browser renders in software, so it proves correctness and gives accurate stills but cannot certify frame rate. If a GPU-backed Chromium is reachable from WSL I will capture with it and report numbers; otherwise smoothness on your hardware needs your eyes on the dev server.

## Risks

- **GPU memory with 8K.** Bounded by the hero policy (one or two 8K maps alive). If a mid-range GPU still struggles, the tier drops to 4K automatically.
- **Software-GL test time.** MSAA and bloom are expensive on the CPU renderer; the low tier is selected there so suites stay within their timeouts, with one dedicated test forcing the high tier.
- **Deployment size.** About 30–45 MB more static files. I will check the Vercel free-tier upload limit before any deploy; nothing here deploys or pushes.
- **Look is subjective.** Strength of bunching, streak length and bloom are tuned against captures; expect a round of adjustment with you after Phase 4.
