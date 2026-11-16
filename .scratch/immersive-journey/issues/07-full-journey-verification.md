# 07: Integrate and verify the complete immersive journey

ID: EH-07
Status: resolved
Blocked by: 03 (EH-03), 04 (EH-04), 05 (EH-05), 06 (EH-06)

## What to build

Deliver a coherent, fully verified journey from Earth to the interior, fixing integration defects across the completed slices and providing reproducible evidence for behavior, motion and device limitations.

## Context for a fresh agent

All feature tickets own implementation and local verification. This final ticket integrates their contracts and resolves cross-feature defects; it must not merely list tests or become a catch-all for features omitted upstream. The approved browser boundary plus pure flight/science checks remains the testing approach.

Read the [approved specification](../spec.md). Relevant sections: Testing Decisions; Deterministic numerical acceptance; Browser acceptance scenarios; Visual and motion acceptance; Further Notes. User-story coverage: All 31 stories; final acceptance across preceding owners. The specification controls numerical defaults and behavior where this ticket summarizes them.

## Dependencies

- [EH-03: Photorealistic planetary encounters from Earth through Neptune](03-photorealistic-planets.md) must be resolved before starting.
- [EH-04: Voyager and Proxima encounters with immersive interstellar travel and audio](04-interstellar-travel-audio.md) must be resolved before starting.
- [EH-05: Sagittarius A* observation, explicit descent, and replay](05-black-hole-finale.md) must be resolved before starting.
- [EH-06: Accessible motion modes and resilient journey playback](06-accessible-resilient-journey.md) must be resolved before starting.

## Acceptance criteria

- [ ] Confirm all 13 observation stops, exact 12 durations/236-second total, reverse durations, optional separate 20-second descent, three facts per stop, metadata, sources, and legacy links. No old full-route behavior or obsolete Gaia numerical assertions survive outside redirects.
- [ ] Run all applicable type/build/test checks. Exercise deterministic frame partitions, pause/hidden time, analytic speed integration (≤0.1% error), Earth displacement, unit thresholds, galactic precision, collision clearance and reset/idempotency contracts.
- [ ] Use the actual browser controls for the spec's ten browser acceptance scenarios, including gesture momentum, drag/zoom, navigation/history, playback, final descent/replay, sound, OS/override motion, keyboard focus, asset failures and graphics fallback.
- [ ] Verify reduced motion and fallback cover the final planetary/interstellar effects, Voyager/Proxima, Sagittarius A* descent and ending; verify sound pauses/skips/resets correctly through all of them. Fix interface conflicts rather than weakening assertions.
- [ ] Capture real-time Earth→Moon, outer-planet, final 50-second transit and 20-second descent reviews. Inspect acceleration/braking, arbitrary-pose departures, persistent readability, varied long-flight scenery, compositing and panel fades. Still screenshots are supplementary.
- [ ] Inspect material detail at maximum zoom, Earth/Moon terminators/clouds, Saturn rings, Voyager silhouette and black-hole framing at 1440×1000, 390×844 and roughly 1366×768. Fix clipping, overlaps, layout shifts and browser errors.
- [ ] Check repeated full traversal/direct navigation for unbounded CPU/GPU resource growth. Measure frame pacing on available recorded hardware against desktop 60 fps/mobile stable 30 fps targets; record device/GPU/browser/viewport and separate real hardware from SwiftShader evidence. If hardware is unavailable, state the unverified target explicitly.
- [ ] Update project usage/reference/capture documentation to match final behavior and provide a concise acceptance report linking reproducible evidence. Record any blocked hardware/access checks without claiming they passed.
- [ ] Run Playwright headlessly with PW_HEADLESS=true toward the end, clean up every verification process and verify its port is released. No deployment, push, unrelated refactor or speculative performance-skill work is included.
- [ ] Close implementation only after required behavior and visual checks pass or concrete access/hardware limits are explicitly reported. Bugs discovered here are fixed and relevant checks rerun; do not silently defer required product behavior.

## Verification and demo

Perform the full acceptance run after all blockers are resolved, inspect motion artifacts, and write an evidence report distinguishing functional, visual and hardware findings. Preserve a clean repository and no running verification services.

Use the approved browser-control acceptance boundary, supported by the existing pure flight/science tests. Test observable behavior and numerical contracts rather than mesh IDs or internal class structure. Run relevant existing checks; when browser verification is needed, use PW_HEADLESS=true near completion and stop verification processes afterward. Commit task-related working changes; do not push or deploy.

## Scope boundary

This is integration and verification work, including fixes required by the spec. It does not authorize deployment or expand the itinerary.

## Completion record

When complete, set Status to resolved and append a comment with the commit, checks actually run, evidence, and any limitations. ready-for-agent describes preparation; blockers still govern whether work may start.

## Comments

- Breakdown and blocking graph approved by the user before publication.
- Resolved 2026-11-16. Checks: build, format:check, full Playwright (118/120; 2 SwiftShader-load flakes in planets.spec passed on isolated reruns). Evidence: [docs/verification/eh-07.md](../../../docs/verification/eh-07.md). Limitation: real-hardware frame pacing and physical-device checks unverified (software rendering only).
