# 01: Interactive Earth–Moon flight with live telemetry

ID: EH-01
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

Explore Earth, launch a six-second journey with one scroll or Next, watch live instruments, settle at the Moon, inspect it, and return. Deliver the defining interaction through rendering, controls, scientific calculations, and tests.

## Context for a fresh agent

The current app derives flight from Lenis-smoothed page position, only turns on Earth departure, and has no inspection controls. Reuse the science/journey/flight/renderer/UI boundaries and one Three.js context. Introduce the deterministic controller additively and integrate the Earth–Moon slice first; keep later legacy destinations usable through a temporary adapter until EH-02 replaces them. Any preparatory refactor belongs here and must keep existing behavior verifiable. Do not introduce a second production renderer or leave the new behavior accessible only through test hooks.

Read the [approved specification](../spec.md). Relevant sections: State and navigation contract; Wheel, pointer, touch, and keyboard; Flight motion and pacing; Instruments and scientific quantities; Resting interface and composition; Module responsibilities and migration. User-story coverage: 1–8, 11–19, 21–22, 25. The specification controls numerical defaults and behavior where this ticket summarizes them.

## Dependencies

None. This is the initial runnable ticket.

## Acceptance criteria

- [ ] Earth and Moon are indefinitely resting observations with drag orbit, bounded +/− zoom, Reset view, touch drag/pinch, and keyboard controls. Inspection changes neither route distance nor Earth distance; light stays scene-relative, axial rotation pauses during drag, and camera poles/roll remain controlled.
- [ ] One deliberate wheel gesture or native button activation launches exactly one six-second flight in either direction. Normalize wheel deltas; start with the specified 60 px/250 ms threshold, reset on timeout/direction change, ignore horizontal/modifier/UI/dialog gestures, and rearm only after arrival plus 300 ms of wheel silence. Swipes do not launch travel.
- [ ] A single controller snapshot drives scientific progress, camera, effects, and UI. Use monotonic active time; pause, skip, duplicate input, Escape, and hidden-tab return cannot create concurrent journeys or consume paused time. A hidden tab returns paused.
- [ ] Implement the specified departure/settle allocations and normalized quintic acceleration–cruise–braking envelope. Turn from the captured inspection pose, reveal the target by braking, avoid collisions and discontinuities, and settle exactly at the target within one simulated frame.
- [ ] Virtual speed is the absolute analytic route-distance derivative; integrate it to within 0.1% of leg length. mph and ×c use the same value, speed is zero at rest/turning, and reverse travel stays positive. Direct/skip operations do not create speed spikes.
- [ ] Show 'Virtual travel speed' with actual rolling digits, readable leading digits, restrained lower-digit blur, and full integer mph. Show geocentric Earth distance in miles with AU/ly formatting support; opening Earth distance is nonzero and distinct from tour distance. Pausing freezes instruments with a Paused label.
- [ ] At rest show name, description, three sourced facts, Details, and discreet navigation/inspection controls. Fade informational chrome out around 350 ms and back during settling around 500 ms; transit retains only instruments and playback controls. Provide desktop/mobile hints and stable tabular alignment.
- [ ] Use semantic controls, visible focus, 44 px touch targets, focus transfer when controls hide, and dialog scrolling isolation. Resize preserves flight progress. Full preference/failure behavior belongs to EH-06; do not remove existing fallback behavior.
- [ ] Add numerical timing, partition-independence, continuity, clearance, conversion, pause, and duplicate-input tests plus browser Earth–Moon forward/reverse, drag/pinch, wheel-momentum, keyboard, and skip checks. Retain valid legacy tests until EH-02 migrates their behavior.

## Verification and demo

Demo Earth inspection → Next → uninterrupted flight → Moon inspection → Previous, then repeat after arbitrary drag/zoom and with pause/skip. Record a real-time six-second flight and verify desktop/mobile composition and telemetry. Run relevant type/build checks and existing plus new tests.

Use the approved browser-control acceptance boundary, supported by the existing pure flight/science tests. Test observable behavior and numerical contracts rather than mesh IDs or internal class structure. Run relevant existing checks; when browser verification is needed, use PW_HEADLESS=true near completion and stop verification processes afterward. Commit task-related working changes; do not push or deploy.

## Scope boundary

Includes correct live digit behavior and basic premium composition using existing imagery. Asset upgrades, full catalog migration, sound, final descent, and comprehensive failure modes have later owners.

## Completion record

When complete, set Status to resolved and append a comment with the commit, checks actually run, evidence, and any limitations. ready-for-agent describes preparation; blockers still govern whether work may start.

## Comments

- Breakdown and blocking graph approved by the user before publication.
