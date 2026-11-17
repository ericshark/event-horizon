# Coherent flight progression and inspection zoom

Status: resolved
Blocked by: none

Read ../spec.md. Own controller.ts, the duration constants in journey.ts, and controller/full-route pure tests. Implement shared accurate speed/progress schedule, immediately gentle departure, gradual readable early acceleration, peak only after visible escape, smooth braking, longer progressive durations. Remove double-eased visual escape. Preserve science integration, continuity/clearance, reverse, pause, skip, descent. Full controller initial motion. Add toggleZoom preserving angle (normal 1 vs close 0.8) for interface input. Record chosen durations and numeric samples in docs/verification/journey-through-space-flight.md. Use TDD at approved existing controller/science boundary. Coordinate only journey.ts duration hunk with units ticket; do not edit catalog facts. Merge latest integration before done. No browser server required for pure tests (use playwright --no-deps with temporary config without webServer if useful). Commit.

## Answer

Implemented a shared analytic speed/progress schedule, immediately visible departure, gradual length-aware acceleration, safe radial/spherical camera handoffs, smooth braking, Full default and observing-only angle-preserving toggleZoom. Authored route is 356 seconds; numerical samples and limitations are in docs/verification/journey-through-space-flight.md. Controller/full-route pure tests: 13 passed; production build passed. Real-time motion review remains integration verification.
