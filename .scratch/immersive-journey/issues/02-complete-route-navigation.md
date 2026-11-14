# 02: Complete 13-stop route, scientific model, and navigation

ID: EH-02
Status: resolved
Blocked by: 01 (EH-01)

## What to build

Travel through every agreed destination with distinct timed legs, inspect each at rest, navigate backward or directly, and see scientifically coherent facts and instruments throughout.

## Context for a fresh agent

EH-01 supplies a working Earth–Moon controller and inspection UI. Extend that production path to the full itinerary; remove the temporary legacy flight adapter and scroll-position time source. This ticket owns Sagittarius A* catalog/science migration and a basic safe observation view, while EH-05 owns the cinematic black-hole view and descent.

Read the [approved specification](../spec.md). Relevant sections: Itinerary and duration contract; State and navigation contract; Instruments and scientific quantities; Resting interface and composition; Sagittarius A* and the ending; Module responsibilities and migration. User-story coverage: 9, 13, 16, 19–20, 27–28, 31. The specification controls numerical defaults and behavior where this ticket summarizes them.

## Dependencies

- [EH-01: Interactive Earth–Moon flight with live telemetry](01-earth-moon-flight.md) must be resolved before starting.

## Acceptance criteria

- [x] The selectable itinerary is exactly Earth → Moon → Mercury → Venus → Sun → Mars → Jupiter → Saturn → Uranus → Neptune → Voyager 1 → Proxima Centauri → Sagittarius A*. Use stable IDs and derive counts and boundaries from data.
- [x] Successive leg durations are 6, 8, 10, 12, 14, 16, 18, 20, 22, 26, 34, and 50 seconds, totaling 236 seconds. Reverse connections use the same duration; actual detour distance is not forced to grow with authored duration.
- [x] Every retained destination has safe resting framing, basic drag/zoom inspection, source-backed description and three facts matching the spec's emphasis. Existing materials may remain pending EH-03/EH-04; Sagittarius A* may use a bounded basic observation view pending EH-05. Unfinished descent is not exposed.
- [x] Scientific paths remain continuous with surface/ring clearance and accurate arc-length sampling. Retain documented epoch/approximation provenance and separate scientific km/kg/s from local visual coordinates. Add local origins and stable analytic telemetry so galactic distances yield no NaN, Infinity, or cancellation jitter.
- [x] Replace Gaia BH1 parameters with the specified approximate Sagittarius A* position, 26,000 ly distance and 4 million solar masses. Derive its roughly 11.8 million km horizon radius and incorporate the 1,000-horizon-radius observation offset. Update scientific fixtures, reference generation, sources, descriptions, metadata and summaries; legacy IDs may remain only for redirects.
- [x] Earth distance is straight-line geocentric displacement and can decrease on detours. Miles remain visible, with AU above 0.1 AU and ly above 0.1 ly. Test unit boundaries, maximum-width mph display, leading-digit growth, reverse travel, and direct jumps on desktop/mobile.
- [x] Next/Previous respect boundaries; the resting destination picker performs a short fade to an observation, clears transient input, and resets speed. Valid hashes and browser history settle directly; invalid hashes open Earth. Update URL on settled arrival.
- [x] Removed Kuiper/heliopause links resolve to Voyager, Oort/interstellar links to their next retained stops (Proxima/Sagittarius A*), and old black-hole/descent/interior links resolve to Sagittarius A* observation. No hash, wheel gesture, or direct selection initiates descent.
- [x] The expandable Journey detail retains truthful linear distance proportions and grouped selectable markers. It is hidden in flight; the picker has 13 stops and no descent stages. Sources/Details preserve source limitations and distinguish route distance, Earth distance and light-equivalent time.
- [x] Retire index-based 20/21-stop assumptions and obsolete continuous-scroll/Gaia assertions while preserving meaningful regression coverage. All-stop traversal, reverse navigation, direct/history/legacy links and 236-second numerical scheduling pass.

## Verification and demo

Use controlled-clock route tests plus representative real-time legs. Visit every destination through visible controls, including Voyager, Proxima and the basic Sagittarius A* observation. Test maximum instrument width and direct/history navigation with no console errors.

Use the approved browser-control acceptance boundary, supported by the existing pure flight/science tests. Test observable behavior and numerical contracts rather than mesh IDs or internal class structure. Run relevant existing checks; when browser verification is needed, use PW_HEADLESS=true near completion and stop verification processes afterward. Commit task-related working changes; do not push or deploy.

## Scope boundary

This ticket establishes the complete functional itinerary and physical data. It does not require final material quality, sound, or optional descent. Later visual tickets must consume this catalog rather than invent competing routes.

## Completion record

When complete, set Status to resolved and append a comment with the commit, checks actually run, evidence, and any limitations. ready-for-agent describes preparation; blockers still govern whether work may start.

## Comments

- Breakdown and blocking graph approved by the user before publication.

- 2026-11-14: Resolved in implementation commit `20ef706` (`Implement EH-02 complete timed journey and Sagittarius A* model`). All ten acceptance criteria verified; see [acceptance evidence](../../../docs/verification/eh-02.md). Final full headless desktop/mobile run reported **44 passed (2.7 minutes)**. Production build including TypeScript, changed-file Prettier checks, reference snapshot regeneration and `git diff --check` passed. Saved desktop/mobile observation and maximum-speed captures, short-viewport checks, and real-time Earth–Moon, Jupiter–Saturn and 50-second Proxima–Sagittarius A* flight recording with no collected browser errors. Earlier mocked-clock test issues were corrected; no final test cases failed. The command wrapper received SIGTERM during test-server shutdown after the successful report; verification ports 5201/5203 and project server/worker processes were confirmed released. Software WebGL cannot establish hardware GPU frame pacing; the existing large-chunk build warning remains. Materials, audio, cinematic descent and comprehensive motion/failure behavior remain assigned to EH-03–EH-06. No EH-02 blockers remain. Next unblocked ready ticket: EH-03.
