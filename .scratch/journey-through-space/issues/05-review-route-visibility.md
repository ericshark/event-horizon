# Keep the current route stop visible after viewport changes

Status: resolved
Blocked by: 01, 02, 03

The route scrolls the current marker into view when the destination changes, but
resize currently calls updateUI with the same selected stop. A desktop→phone
resize at Sagittarius A* may therefore leave the current marker offscreen.
Verify this through the existing browser seam, add a regression, and correct
viewport-change behavior without resetting inspection or progress. Review the
final spec-axis report from root for any additional concrete findings before
finishing. Use TDD, commit the correction, and merge latest integration first.

## Verification

Reproduced first: `tests/route-visibility.spec.ts` resizes 1440×1000 → 390×844 while parked at Sagittarius A*. Before the fix it failed (current marker outside `#route-scroll`); after the fix it passes. The resize handler in `src/main.ts` now calls `revealCurrentStop` (also used by `updateUI`) when observing, leaving selection, inspection and flight progress untouched.

- `PW_HEADLESS=true npx playwright test tests/route-visibility.spec.ts --project=desktop` — failed before the fix, passed after.
- `npm run typecheck` — pass.
- `npm run build` — pass (only the existing >500 kB chunk warning).
- `npx prettier --check src/main.ts tests/route-visibility.spec.ts` — pass.
- `PW_HEADLESS=true npx playwright test` (full suite, desktop + mobile) — first run: 125 passed, 1 skipped, 48 failed (mostly mobile; cause not diagnosed, tests I sampled passed when run alone, e.g. `tests/flight.spec.ts:4` mobile). Clean re-run: 173 passed, 1 skipped, 0 failed, no browser errors.
