# 06: Accessible motion modes and resilient journey playback

ID: EH-06
Status: resolved
Blocked by: 02 (EH-02)

## What to build

Complete the same route using reduced motion, keyboard or mobile input, and continue safely through loading or graphics failures without losing the journey.

## Context for a fresh agent

EH-01/EH-02 already provide native controls, basic focus behavior, touch inspection, pause and the complete route. Complete the shared capability/preference/recovery contracts now. EH-03/EH-04/EH-05 may land independently; export policies through the shared snapshot/adapters, then EH-07 verifies every later effect and finale respects them.

Read the [approved specification](../spec.md). Relevant sections: Audio, motion preference, accessibility, and failures; Wheel, pointer, touch, and keyboard; Rendering and asset requirements; Testing Decisions. User-story coverage: 17, 21–26, 31. The specification controls numerical defaults and behavior where this ticket summarizes them.

## Dependencies

- [EH-02: Complete 13-stop route, scientific model, and navigation](02-complete-route-navigation.md) must be resolved before starting.

## Acceptance criteria

- [x] Offer System/Full/Reduced motion modes, defaulting to OS preference until overridden. Persist explicit choice and change modes without resetting progress. Reduced mode retains route, authored timing, instruments and playback controls with stable framing and gentle blends.
- [x] Reduced mode disables warp tunnel/FOV acceleration, idle rotation and rolling digit blur; manual inspection uses reduced inertia and numeric updates are unblurred at up to 10 Hz. Later renderer/audio adapters can read the policy without creating another journey clock.
- [x] Every control has semantic operation, visible focus, readable contrast and ≥44 px touch targets. Focus transfers from hidden departure controls to Pause and returns to a visible destination control on arrival. Screen readers announce state/destination changes rather than rapidly updating digits.
- [x] Keyboard inspection, reset, zoom, native button activation, Escape pause, dialog trapping/restoration and internal dialog scrolling all work. Browser zoom shortcuts, pointer cancellation and gestures outside the scene remain usable.
- [x] Mobile drag/pinch/Next and resize/orientation changes retain current progress and avoid page overflow, overlapping controls and accidental travel. Verify desktop/mobile/short viewports.
- [x] Earth-first/adjacent preloading exposes usable loading status. Required assets are ready before a flight, or a 10-second timeout enables illustrated fallback with a concise notice; loading cannot freeze the moving camera midflight.
- [x] No-WebGL mode retains the full route, facts, instruments, controls and ending semantics with static illustration; unsupported inspection affordances are disabled/explained. Context loss pauses and offers recovery or fallback without resetting or duplicating travel.
- [x] Hidden-tab work and audio are suspended, return is paused, and transient gestures clear. Quality adaptation preserves scientific values/durations; repeated navigation disposes unused assets. Error messages and failed resources do not block core controls.
- [x] Automate OS/override motion behavior, keyboard/focus, missing textures, no WebGL and context loss. Run representative mobile interactions and document capabilities requiring later EH-07 final-scene integration; do not claim complete-route final acceptance before that integration.

## Verification and demo

Complete representative flights using keyboard only and reduced motion, then simulate texture failure, no WebGL, context loss and tab hiding. Verify the same destination is reachable with correct facts/instruments and clean error handling.

Use the approved browser-control acceptance boundary, supported by the existing pure flight/science tests. Test observable behavior and numerical contracts rather than mesh IDs or internal class structure. Run relevant existing checks; when browser verification is needed, use PW_HEADLESS=true near completion and stop verification processes afterward. Commit task-related working changes; do not push or deploy.

## Scope boundary

This implements user-visible resilience rather than postponing all accessibility to a final audit. EH-07 checks final audio/rendering/descent integration; avoid forcing semantic dependencies on independent visual tickets.

## Completion record

When complete, set Status to resolved and append a comment with the commit, checks actually run, evidence, and any limitations. ready-for-agent describes preparation; blockers still govern whether work may start.

## Comments

- Breakdown and blocking graph approved by the user before publication.
- 2026-11-16: Resolved. Evidence and limitations: [docs/verification/eh-06.md](../../../docs/verification/eh-06.md). Checks run: `npm run build` (`tsc --noEmit && vite build`), `npm run format:check`, `git diff --check`, full headless Playwright suite (`PW_HEADLESS=true npx playwright test`: **120 passed in 9.8m**), and post-edit `tests/accessibility-resilience.spec.ts` (**16 passed**). Captures in `artifacts/eh-06/` visually inspected. Limitations: headless Chromium uses ANGLE SwiftShader (no hardware GPU frame pacing or physical mobile touch/audio output); full combined integration with EH-03/04/05 assets, audio, and black-hole descent belongs to EH-07. Next unblocked ready ticket: EH-07.
