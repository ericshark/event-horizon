# Journey Through Space verification

Status: integration verification in progress.

## Implemented behavior

The quieter interface includes the confirmed title, anchored top-right settings,
Full initial motion, initially silent audio, remembered Miles/Kilometres, Sources,
three concise facts, discreet Details, and current distance from Earth. The bottom
route is a schematic itinerary with duration-relative spacing, all named stops,
hover/focus previews, desktop activation, and touch preview/Go. Previous/Next uses
quiet arrows and names. Double-click/double-tap toggles close-up while preserving
view angle, with keyboard and pinch alternatives retained.

Flight hides observation UI and shows a relative arc/needle speedometer with actual
virtual speed, Earth distance, and Pause/Resume/Skip. Descent shows distance to the
horizon and then Inside the horizon; its explicit entry and replay remain. Primary
copy is concise; full scientific qualifications remain in Details/Sources. Very
large ordinary-unit facts use billion/trillion/quadrillion wording to fit phones.

The [flight report](journey-through-space-flight.md) records the 356-second revised
route, analytic integration and timestamped scientific/camera samples. Scientific
speed and distance share an authoritative active-time schedule; visual coordinates
are deliberately rescaled from that schedule.

## Verification record

- Typecheck and production build passed after initial integration. The existing
  minified JavaScript chunk warning remains; no performance audit was requested.
- The controller/science/unit/legacy-axis checks passed (23 cases before the
  additional compact-fact case, which also passed separately).
- The final interface suite passed all 12 desktop/mobile cases, covering settings
  through flight, route previews/activation, AU/Sources focus restoration, zoom,
  dismissal pointer ownership, keyboard activation on touch-capable devices, and
  separation of content/metrics at 1440×1000, 1366×768, 390×844, and 844×390.
- The first broad run was interrupted after scheduling the full desktop/mobile
  set. It exposed obsolete fixed-duration/control assertions, a transient blank
  software-rendered frame, and a fixed centre-crop assumption for dark space.
  Those assertions now check the approved timings/public controls, wait for a
  visibly rendered world, and assess the full sparse starfield rather than a
  planet crossing an arbitrary crop.
- A bounded desktop regression run completed 69 cases successfully; the remaining
  route case hit a shared-output trace-file collision with a concurrent targeted
  invocation. That route case passed in the subsequent isolated 12-case suite.
  Later suites use separate result directories.
- Uranus was reproduced independently three times with visible worlds and contrast
  26.03, 26.03, and 25.99. Sparse Jupiter–Saturn space at nine seconds had contrast
  1.91 and visible stars. No rendering change was made to brighten that valid scene
  just to satisfy an old threshold.
- The bounded mobile regression suite passed all **72** cases, including all-stop
  traversal, both directions, inspection/gestures, motion settings, unit facts,
  sound lifecycle, keyboard focus, texture timeout, no-WebGL and context recovery.
- The isolated real-time suite passed all **10** desktop/mobile cases: Earth–Moon
  round trip with pause/resume, outer-planet travel, the complete interstellar legs,
  final handoff and descent, and the short desktop viewport.
- Standards review against `79a3b64...512dfd3` found no actionable findings. The
  separate specification review found one P2: the route did not recenter its current
  marker when viewport size changed without changing destination. That correction
  is tracked in ticket 05 and its verification is appended below.

## Captures and limits

Generated images and real-time videos live under `artifacts/journey-through-space/`
and are ignored by Git to avoid committing large reproducible media. The capture
script records forward Earth departure, inspected reverse Moon departure, outer
planets, the final interstellar leg, and the descent, with quarter-second scientific,
camera and displayed-instrument samples. It closes its own browser.

The real-time capture completed without browser errors: Earth forward 16 seconds,
inspected Moon reverse 16 seconds, Jupiter forward 28 seconds, Proxima forward 60
seconds, and descent 20 seconds. Quarter-second snapshots and milestone frames
were reviewed for visible departure, later peak speed, braking, arrival, and the
inside-horizon readout. Wall durations were approximately 16.7, 16.9, 28.2, 60.2,
and 20.2 seconds respectively, including screenshot/action overhead. This does not
replace a full subjective motion review on real hardware.

Verification uses headless Chromium with SwiftShader. This establishes functional
behavior and software-rendered visual evidence; real-device GPU frame pacing,
subjective motion quality on the user's hardware, and photorealism are not certified.

## Identity and release scope

Application/package branding is journey-through-space, visibly Journey Through
Space. The user explicitly deferred repository, Vercel, and domain renames to them
later. Origin and the last verified deployment remain as recorded in
[the deployment document](../DEPLOYMENT.md). No push, remote mutation, DNS change,
or production release is part of this implementation. The local folder rename
follows verification and cleanup of temporary agent worktrees and servers.
