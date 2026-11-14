# 05: Sagittarius A* observation, explicit descent, and replay

ID: EH-05
Status: ready-for-agent
Blocked by: 02 (EH-02)

## What to build

Reach a dramatic black-hole observation point, inspect it safely, explicitly enter the horizon, finish in darkness, and replay from Earth.

## Context for a fresh agent

EH-02 has already migrated Sagittarius A* scientific parameters, reference position, basic observation and legacy links. Build the visual/compositing and ending experience on that model. Do not independently change the mass or reintroduce Gaia BH1 assumptions. EH-04's transit polish and sound are independent consumers of the same state.

Read the [approved specification](../spec.md). Relevant sections: Sagittarius A* and the ending; Instruments and scientific quantities; State and navigation contract; Rendering and asset requirements. User-story coverage: 28–31, 17–18. The specification controls numerical defaults and behavior where this ticket summarizes them.

## Dependencies

- [EH-02: Complete 13-stop route, scientific model, and navigation](02-complete-route-navigation.md) must be resolved before starting.

## Acceptance criteria

- [ ] Blend continuously from the flight scene into a lensed star field and carefully lit illustrative accretion structure at the specified 1,000-horizon-radius observation position. Scientific observer offset remains consistent while optical framing makes the destination compelling.
- [ ] Observation waits indefinitely with three facts, sourced Details, bounded view/zoom and Previous. Neither wheel, URL/hash, picker nor incidental input can initiate descent or cross the horizon.
- [ ] Enter the event horizon explicitly starts a separate 20-second descent through radii 1,000/100/1.5/1/0.8 at 0/8/15/18/20 seconds. Smooth log-radius interpolation blends from inspection into a fixed inward-facing direction and reaches darkness at horizon crossing.
- [ ] During descent replace virtual speed with Horizon approach and local radius in horizon radii, retaining Earth distance. Pause/Resume and Finish descent work without queued commands, frame discontinuities or fabricated relativistic mph.
- [ ] Inside, present a readable ending and summary in darkness, distinguish route length/light-equivalent time/playback time, and offer Return to Earth. Explain the illustrative interior and disk in appropriate sources/details.
- [ ] Return to Earth fades to observation, resets clock/progress/effects/inspection/input and retains sound/motion preferences. It is a replay action rather than a rendered physical escape.
- [ ] Verify the horizon radius derives from the new mass (roughly 11.8 million km). Existing Gaia-specific mass, tide and radius assumptions are absent from current content/calculations except legacy-link mapping.
- [ ] Test safe observation, explicit-only entry, descent milestones, pause/finish, legacy links and replay through visible controls and numerical state. Record handoff and descent motion on desktop/mobile; expose lifecycle hooks so EH-06 and EH-07 cover preferences, audio and failure recovery.

## Verification and demo

Directly visit Sagittarius A*, attempt scroll entry, then explicitly descend; pause before crossing, finish, inspect the ending and return to Earth. Repeat from an extreme permitted inspection pose and confirm continuous handoff.

Use the approved browser-control acceptance boundary, supported by the existing pure flight/science tests. Test observable behavior and numerical contracts rather than mesh IDs or internal class structure. Run relevant existing checks; when browser verification is needed, use PW_HEADLESS=true near completion and stop verification processes afterward. Commit task-related working changes; do not push or deploy.

## Scope boundary

Do not block on EH-03/EH-04 visual polishing. Use baseline transit for focused verification; EH-07 owns their combined arrival and sound/motion integration.

## Completion record

When complete, set Status to resolved and append a comment with the commit, checks actually run, evidence, and any limitations. ready-for-agent describes preparation; blockers still govern whether work may start.

## Comments

- Breakdown and blocking graph approved by the user before publication.
