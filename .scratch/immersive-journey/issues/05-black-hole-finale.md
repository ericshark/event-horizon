# 05: Sagittarius A* observation, explicit descent, and replay

ID: EH-05
Status: resolved
Blocked by: 02 (EH-02)

## What to build

Reach a dramatic black-hole observation point, inspect it safely, explicitly enter the horizon, finish in darkness, and replay from Earth.

## Context for a fresh agent

EH-02 has already migrated Sagittarius A* scientific parameters, reference position, basic observation and legacy links. Build the visual/compositing and ending experience on that model. Do not independently change the mass or reintroduce Gaia BH1 assumptions. EH-04's transit polish and sound are independent consumers of the same state.

Read the [approved specification](../spec.md). Relevant sections: Sagittarius A* and the ending; Instruments and scientific quantities; State and navigation contract; Rendering and asset requirements. User-story coverage: 28–31, 17–18. The specification controls numerical defaults and behavior where this ticket summarizes them.

## Dependencies

- [EH-02: Complete 13-stop route, scientific model, and navigation](02-complete-route-navigation.md) must be resolved before starting.

## Acceptance criteria

- [x] Blend continuously from the flight scene into a lensed star field and carefully lit illustrative accretion structure at the specified 1,000-horizon-radius observation position. Scientific observer offset remains consistent while optical framing makes the destination compelling.
- [x] Observation waits indefinitely with three facts, sourced Details, bounded view/zoom and Previous. Neither wheel, URL/hash, picker nor incidental input can initiate descent or cross the horizon.
- [x] Enter the event horizon explicitly starts a separate 20-second descent through radii 1,000/100/1.5/1/0.8 at 0/8/15/18/20 seconds. Smooth log-radius interpolation blends from inspection into a fixed inward-facing direction and reaches darkness at horizon crossing.
- [x] During descent replace virtual speed with Horizon approach and local radius in horizon radii, retaining Earth distance. Pause/Resume and Finish descent work without queued commands, frame discontinuities or fabricated relativistic mph.
- [x] Inside, present a readable ending and summary in darkness, distinguish route length/light-equivalent time/playback time, and offer Return to Earth. Explain the illustrative interior and disk in appropriate sources/details.
- [x] Return to Earth fades to observation, resets clock/progress/effects/inspection/input and retains sound/motion preferences. It is a replay action rather than a rendered physical escape.
- [x] Verify the horizon radius derives from the new mass (roughly 11.8 million km). Existing Gaia-specific mass, tide and radius assumptions are absent from current content/calculations except legacy-link mapping.
- [x] Test safe observation, explicit-only entry, descent milestones, pause/finish, legacy links and replay through visible controls and numerical state. Record handoff and descent motion on desktop/mobile; expose lifecycle hooks so EH-06 and EH-07 cover preferences, audio and failure recovery.

## Verification and demo

Directly visit Sagittarius A*, attempt scroll entry, then explicitly descend; pause before crossing, finish, inspect the ending and return to Earth. Repeat from an extreme permitted inspection pose and confirm continuous handoff.

Use the approved browser-control acceptance boundary, supported by the existing pure flight/science tests. Test observable behavior and numerical contracts rather than mesh IDs or internal class structure. Run relevant existing checks; when browser verification is needed, use PW_HEADLESS=true near completion and stop verification processes afterward. Commit task-related working changes; do not push or deploy.

## Scope boundary

Do not block on EH-03/EH-04 visual polishing. Use baseline transit for focused verification; EH-07 owns their combined arrival and sound/motion integration.

## Completion record

When complete, set Status to resolved and append a comment with the commit, checks actually run, evidence, and any limitations. ready-for-agent describes preparation; blockers still govern whether work may start.

## Comments

- Breakdown and blocking graph approved by the user before publication.

### 2026-11-16 resolution

Diagnosed and fixed the full-route `horizon.spec.ts` stall under Playwright's virtual clock (`page.clock.install()`):

- **Root cause:** Playwright's fake clock replaces native `requestAnimationFrame` with an unthrottled 16 ms `setTimeout` loop (`realTimeTimer`). Because `gl.drawElements` is asynchronous on the CPU thread, `gsap.ticker` continuously queued full 3D and ray-marched black-hole frames into the SwiftShader GPU command buffer while `page.screenshot()` and `clock.runFor()` were waiting. When a subsequent leg compiled a newly resident stop's shader and invoked `gl.getProgramInfoLog` (a synchronous GPU command-buffer barrier), the Renderer main thread stalled until the queued frame backlog drained.
- **Fix (`src/renderer.ts`):** Added a non-blocking WebGL2 fence sync (`gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)` + `gl.clientWaitSync(fence, 0, 0)`). Scene-graph and diagnostic state update on every tick, and frames render normally whenever the GPU fence has signaled; while the GPU is still rasterizing the previous frame (`TIMEOUT_EXPIRED`), redundant in-flight or identical-state draw submissions are skipped while discrete resting/paused/complete transitions still render immediately.
- **Verification:** `npm run build`, `npm run format:check`, and the full headless Playwright suite (`PW_HEADLESS=true npx playwright test`) passed (**104 passed in 7.5m**, 0 failed). `horizon.spec.ts` all-stop forward/reverse traversal passed in 29.4 s (desktop) and ~25 s (mobile). All 10 `tests/finale.spec.ts` tests passed, and desktop/mobile observation, ending, short-viewport, fallback, and real-time handoff/descent captures are recorded in `artifacts/eh-05/` and documented in [docs/verification/eh-05.md](../../../docs/verification/eh-05.md). Hardware GPU frame pacing remains unmeasured under headless SwiftShader. Verification processes were stopped and ports verified free.
