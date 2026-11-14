# 04: Voyager and Proxima encounters with immersive interstellar travel and audio

ID: EH-04
Status: resolved
Blocked by: 02 (EH-02)

## What to build

Move beyond Neptune, inspect a recognizable Voyager and distinct red dwarf, and experience sustained, varied long-distance travel with optional synchronized sound.

## Context for a fresh agent

EH-02 supplies the complete route, timing, instruments and scientific positions, including a basic Sagittarius A* arrival. Own Neptune→Voyager, Voyager→Proxima and the transit portion of Proxima→Sagittarius A*, plus optional audio across all legs. EH-05 owns black-hole arrival compositing and descent. Shared snapshot state is the integration contract.

Read the [approved specification](../spec.md). Relevant sections: Itinerary and duration contract; Flight motion and pacing; Rendering and asset requirements; Audio, motion preference, accessibility, and failures. User-story coverage: 8–10, 24–25, 27, 31. The specification controls numerical defaults and behavior where this ticket summarizes them.

## Dependencies

- [EH-02: Complete 13-stop route, scientific model, and navigation](02-complete-route-navigation.md) must be resolved before starting.

## Acceptance criteria

- [x] Voyager has recognizable dish/core/booms/antenna proportions and credible materials, with complete silhouette, safe orbit/zoom and spacecraft-specific facts. Proxima has a structured emissive red-dwarf appearance distinct from the Sun and sourced facts.
- [x] The 26-, 34- and 50-second legs preserve specified timing and speed derivation. Scenery evolves during sustained cruise; acceleration and long braking remain legible rather than repeating an identical tunnel.
- [x] Use peripheral streaks, forward star movement and restrained FOV changes without roll, repeated camera shake, abrupt whiteout or overlay jumps. The destination appears by braking, and departure starts continuously from inspection.
- [x] Incidental Kuiper/heliopause/Oort/interstellar scenery creates no additional stops. Voyager remains before Oort scenery. Do not depict an obstacle-dense asteroid field or relocate scientific boundaries for spectacle.
- [x] Audio starts off; an explicit toggle activates a restrained ambient bed, eased acceleration intensity and soft arrival. Audio follows the authoritative snapshot and works with reverse, pause, skip, direct jump and hidden tabs without spikes, leaks or autonomous timing.
- [x] Persist sound preference while honoring browser gesture restrictions on subsequent loads. Autoplay denial leaves silent playback usable and produces no uncaught error. Playback/sound controls remain discreet during transit.
- [x] Record asset/audio provenance. Use the common preload/disposal and quality interfaces, keeping later reduced-motion/fallback integration possible. No separate renderer or flight clock is introduced.
- [x] Test Voyager/Proxima inspection and all audio lifecycle actions. Capture a real-time final 50-second flight for sustained-interest review, readable instruments and smooth effects decay; final black-hole-specific appearance may be verified in EH-07 after EH-05.

## Verification and demo

Travel Neptune→Voyager→Proxima→basic Sagittarius A* with sound off and on. Exercise pause, tab hide, skip and direct jump while audio is active. Inspect maximum zoom on Voyager/Proxima at desktop/mobile sizes.

Use the approved browser-control acceptance boundary, supported by the existing pure flight/science tests. Test observable behavior and numerical contracts rather than mesh IDs or internal class structure. Run relevant existing checks; when browser verification is needed, use PW_HEADLESS=true near completion and stop verification processes afterward. Commit task-related working changes; do not push or deploy.

## Scope boundary

This ticket does not gate EH-05: agree on the shared snapshot/arrival handoff. EH-07 verifies the combined final transit, black-hole view and audio; EH-06 supplies motion-mode policy.

## Completion record

When complete, set Status to resolved and append a comment with the commit, checks actually run, evidence, and any limitations. ready-for-agent describes preparation; blockers still govern whether work may start.

## Comments

- Breakdown and blocking graph approved by the user before publication.
- 2026-11-14 resolved. Evidence: `docs/verification/eh-04.md`; captures in `artifacts/eh-04/`. Checks run: `npx tsc --noEmit`; full `PW_HEADLESS=true npx playwright test` (desktop + mobile, SwiftShader) — 93 of 94 passed; the one failure (`horizon.spec.ts:9` desktop, empty `#location` under parallel load) passed on isolated re-run. Limitations: software WebGL only (no real-GPU frame pacing, audio never heard), mobile frames not reviewed by eye. Code-review follow-ups (not done): mobile FOV stays fixed at 100° so FOV expansion is desktop-only; hidden tab cuts master gain instantly rather than fading; `thrust` was added to the shared snapshot (`TimedFrame`) and EH-05 should know; unused exports (`VOYAGER_AU`, `NEPTUNE_STOP`, `viewingRadius`, `SETTLE_SECONDS`) and per-leg tables in `scenery.ts` could become one profile record; motion-mode hooks for streaks/audio are EH-06 work.
