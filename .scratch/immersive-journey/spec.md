# Event Horizon: interactive worlds and cinematic travel

ID: EH-SPEC
Status: ready-for-agent

Product decisions and testing boundaries confirmed in conversation. This document specifies future behavior; it does not describe completed implementation.

## Problem Statement

The existing experience uses continuous scrolling to scrub through celestial flybys. Visitors cannot drag or zoom the worlds, most encounters do not stop for exploration, only the initial departure turns the camera, and flight duration depends on scrolling rather than authored pacing. The current destination is Gaia BH1.

The intended experience should feel premium and immersive: visitors explore a convincing world from orbit, deliberately launch a complete flight, feel acceleration and distance, and settle beside another world. Longer journeys should feel noticeably longer. The destination is Sagittarius A*, at the center of the Milky Way.

## Solution

Build a sequence of interactive observation stops joined by automatic, time-based flights. Scrolling or a discreet Next button starts exactly one flight. Dragging changes the inspection view; separate controls provide modest zoom. Each arrival waits indefinitely for the visitor.

Travel feels like unassisted flight through space, with an implied observer and an unobstructed view. The camera turns away, accelerates, cruises, brakes, and settles. During flight, the informational interface fades away, leaving virtual speed and distance from Earth, together with discreet playback controls. At rest, the world dominates and three relevant facts appear beside it.

Earth establishes the standard for photorealistic orbital rendering. Every destination receives appropriate materials, lighting, scale cues, and authored framing. Presentation time and visual scale are compressed; scientific distances and virtual travel speed remain internally consistent and labeled.

## User Stories

1. As a first-time visitor, I want to begin beside a convincing Earth, so that the experience immediately establishes its visual quality.
2. As a visitor, I want to drag around a world, so that I can inspect it from different angles.
3. As a visitor, I want modest zoom controls, so that I can examine detail while retaining a clear orbital view.
4. As a desktop visitor, I want one deliberate scroll to launch a complete flight, so that I do not have to keep scrolling through an animation.
5. As a visitor, I want a discreet Next button, so that departure is discoverable without a mouse wheel.
6. As a trackpad user, I want leftover momentum ignored, so that one gesture cannot skip multiple stops.
7. As a visitor, I want my exploration view to flow into departure, so that the camera never snaps to a preset angle.
8. As a visitor, I want a turn, acceleration, cruise, braking, and arrival, so that travel feels continuous and intentional.
9. As a visitor, I want progressively longer flights, so that the growing scope of the journey is tangible.
10. As a visitor, I want varied travel scenery, so that longer flights remain engaging.
11. As a visitor, I want a live speedometer, so that I can understand the theoretical speed required for the virtual journey.
12. As a visitor, I want rapidly rolling lower digits and readable leading digits, so that the instrument feels fast while communicating magnitude.
13. As a visitor, I want distance from Earth in familiar and astronomical units, so that I can understand how far I have gone.
14. As a visitor, I want informational panels to fade during flight, so that the view feels immersive.
15. As a visitor, I want to stop completely at each destination, so that I can explore at my own pace.
16. As a curious visitor, I want three meaningful facts and optional details, so that learning does not overwhelm the view.
17. As a visitor, I want to pause and resume a flight, so that I can control the experience.
18. As a visitor, I want to skip the remainder of a flight, so that revisiting the experience is convenient.
19. As a visitor, I want to return to the previous stop, so that exploration is reversible.
20. As a visitor, I want direct destination navigation, so that I can revisit a particular world.
21. As a mobile visitor, I want drag, pinch, and explicit navigation controls, so that gestures have predictable meanings.
22. As a keyboard user, I want all essential controls available without pointer gestures, so that I can complete the journey.
23. As a visitor sensitive to motion, I want a gentler presentation, so that I can explore the same destinations comfortably.
24. As a visitor, I want optional sound, so that I can choose whether audio contributes to immersion.
25. As a visitor who changes tabs, I want travel to pause, so that I do not miss an arrival.
26. As a visitor with limited graphics capability, I want usable navigation and information, so that a rendering failure does not block the experience.
27. As a visitor, I want to inspect Voyager 1 and a nearby star, so that the transition from planetary to interstellar distances has recognizable milestones.
28. As a visitor, I want to observe Sagittarius A* before entering it, so that reaching the destination is a satisfying moment of its own.
29. As a visitor, I want to choose the final descent explicitly, so that an accidental scroll cannot carry me through the horizon.
30. As a visitor who completes the descent, I want an ending and Return to Earth action, so that the experience has closure and can be replayed.
31. As a visitor interested in accuracy, I want sources and clear distinctions between measured data and illustration, so that I can interpret the experience correctly.

## Implementation Decisions

### Decision authority and terminology

The itinerary, durations, interaction model, flight instruments, optional sound, reduced-motion support, and explicit final descent were agreed with the user. Numerical input thresholds, animation subdivisions, zoom bounds, layout targets, and fallback mechanics below are engineering defaults that make those decisions executable. They may be tuned during verification without changing the agreed behavior.

- **Stop:** a destination with an indefinite, interactive observation state.
- **Leg:** the journey connecting two adjacent stops, including departure and arrival.
- **Flight:** automatic playback of a leg in either direction.
- **Inspection:** local camera exploration at a stop; it does not advance the journey's scientific position.
- **Route distance:** arc length along the authored scientific path, including detours.
- **Earth distance:** straight-line displacement from Earth's center to the virtual journey position.
- **Virtual travel speed:** rate of route distance change per second of active playback, not a physically achievable spacecraft speed.
- **Visual position:** local rendering coordinates, independent of scientific distance units.

### Itinerary and duration contract

There are 13 observation stops and 12 flights. Use stable destination IDs; derive ordering and counts from data rather than hardcoded indices.

| Stop             | ID            | Flight from preceding stop | Resting content emphasis                                  |
| ---------------- | ------------- | -------------------------: | --------------------------------------------------------- |
| Earth            | earth         |              Initial state | Diameter, day length, atmosphere                          |
| Moon             | moon          |                  6 seconds | Diameter, mean Earth separation, gravity                  |
| Mercury          | mercury       |                  8 seconds | Diameter, orbital period, temperature extremes            |
| Venus            | venus         |                 10 seconds | Diameter, temperature, atmosphere                         |
| Sun              | sun           |                 12 seconds | Diameter, temperature, mass share                         |
| Mars             | mars          |                 14 seconds | Diameter, day length, gravity                             |
| Jupiter          | jupiter       |                 16 seconds | Diameter, mass, Great Red Spot                            |
| Saturn           | saturn        |                 18 seconds | Diameter, rings, density                                  |
| Uranus           | uranus        |                 20 seconds | Diameter, axial tilt, orbital period                      |
| Neptune          | neptune       |                 22 seconds | Diameter, orbital period, winds                           |
| Voyager 1        | voyager       |                 26 seconds | Launch date, estimated Earth distance, actual probe speed |
| Proxima Centauri | proxima       |                 34 seconds | Earth distance, star type, size                           |
| Sagittarius A*   | sagittarius-a |                 50 seconds | Earth distance, mass, horizon scale                       |

Full forward travel totals 236 seconds (3 minutes 56 seconds), excluding loading, pauses, inspection, and optional descent. Reverse flight uses the duration assigned to that same connection. Durations are authored and increase with tour progression; they are not proportional to actual adjacent-stop distance. This resolves the conflict between monotonically increasing presentation duration and the inner-world detours.

Kuiper Belt, heliopause, Oort Cloud, and interstellar space cease to be selectable stops. They may appear as incidental scenery during the appropriate flights. Do not relocate the Oort Cloud before Voyager for visual convenience. Existing direct links to removed stops resolve to the following retained observation stop; old black-hole and interior links resolve to the Sagittarius A* observation stop without initiating descent.

### State and navigation contract

Use one authoritative journey controller. Rendering, instruments, sound, and UI consume the same immutable frame snapshot. Frame state includes active stop/leg IDs, direction, playback state, phase, elapsed active time, normalized leg progress, route distance, scientific position, Earth distance, virtual speed, camera pose, and inspection availability.

| State      | Allowed behavior                                          | Exit                           |
| ---------- | --------------------------------------------------------- | ------------------------------ |
| Loading    | Status and fallback; preload initial view                 | Earth ready or usable fallback |
| Observing  | Inspect, zoom, details, next/previous, destination picker | Explicit navigation or descent |
| Flying     | Play authored leg; pause or skip                          | Arrival, pause, or skip        |
| Paused     | Retain frame and progress; resume or skip                 | Resume or settled destination  |
| Descending | Explicit black-hole sequence; pause or finish descent     | Interior                       |
| Interior   | Ending, sources, Return to Earth                          | Earth observation              |

Departure, acceleration, cruise, braking, and settling are phases within Flying, not competing controllers. Inputs during Flying cannot enqueue additional legs. A transition token or equivalent ownership mechanism prevents double starts and stale animation callbacks.

Next and Previous are available at rest, with unavailable directions disabled at the ends. During flight, replace destination navigation with Pause/Resume and Skip flight. Escape pauses travel. Repeated actions are idempotent. At Sagittarius A*, Next becomes Enter the event horizon; wheel input alone cannot activate it.

The retained destination picker performs a deliberate short fade to an observation stop, not a series of queued flights. It is available only at rest. Direct navigation and Return to Earth are discontinuous navigation operations; they reset speed to zero rather than generating a fabricated speed spike. Update the URL on settled arrival. A valid destination hash opens that stop at rest; unknown hashes open Earth. Browser history navigation also settles directly without queuing travel.

### Wheel, pointer, touch, and keyboard

- Vertical wheel input navigates forward/backward only while Observing. Normalize delta modes to pixel equivalents. Initial threshold: 60 px of consistent-direction input over at most 250 ms. Reset on direction change or timeout; horizontal-dominant gestures do not trigger travel.
- Rearm only after arrival and at least 300 ms without wheel events. Discard all accumulated input during flight. Continued trackpad momentum cannot launch another leg. Do not add a large fixed dwell delay once a new gesture is available.
- Respect scrolling inside dialogs and native browser zoom shortcuts. Ctrl/Meta-modified wheel input never launches travel. Buttons, selects, and editable elements do not become accidental gesture targets.
- Dragging the rendered body or its inspection region orbits the camera around the target with damped inertia. Keep a stable up direction, avoid camera roll and pole flips, and capture the pointer until release/cancellation. Interacting with a UI control does not rotate the world.
- Stop automatic axial rotation while dragging and ease it back after release. Light remains in the local scene frame so inspection reveals illuminated and dark regions.
- Desktop +/− controls adjust camera range. Start at 1× canonical range; initial bounds are 0.8× to 1.2×, additionally clamped for atmosphere/ring clearance and usable framing. Wheel input never changes this range.
- Mobile uses one-finger drag, two-finger pinch, and explicit Next/Previous buttons. Swipes over the scene do not start travel. Apply gesture capture only to the interactive scene; browser accessibility zoom remains available outside it.
- Expose the scene as a focusable inspection region with a concise accessible description. Arrow keys orbit it; +/− zoom it; provide Reset view. Buttons remain the primary keyboard navigation mechanism and activate with native Enter/Space semantics.
- Hint at rest: “Drag to explore · Scroll to travel” on desktop and “Drag to explore · Pinch to zoom” on mobile. Keep Next visible even after the hint disappears.

### Flight motion and pacing

Capture the actual inspection camera pose at departure. Blend from it into the authored departure path with continuous position and orientation; never reset to the canonical pose first. Keep the old world visible as it moves out of frame. A gentle departure turn happens on every leg, with varied arcs rather than an identical 180-degree turn.

For leg duration D, allocate departure time A = min(2 seconds, 0.15D) and settling time S = min(1.2 seconds, 0.12D). Moving time is M = D − A − S. Scientific route progress is held during the departure turn and final settle. Within moving time, allocate 30% to acceleration, 25% to cruise, and 45% to braking. The longer brake phase gives the destination time to emerge and become readable.

Implement speed as a continuous eased ramp from zero to a plateau and back to zero. Use a quintic smootherstep ramp for acceleration and its reversed counterpart for braking. Normalize the integral of this speed envelope to one leg length, then sample the path by arc length. This gives continuous, nonnegative speed, exact endpoints, and no dependence on frame count. The visual camera follows the same normalized travel schedule with locally authored scale and approach offsets.

All of the following must hold:

- Position and camera orientation are continuous across phase and stop boundaries.
- Speed is zero at departure start and settled arrival. Turning in place cannot create translational travel speed.
- The destination is visible by the start of braking and grows continuously into its final framing.
- No world, ring, or near-plane geometry intersects the camera.
- Peripheral streaks, forward star motion, subtle field-of-view expansion, and optional sound communicate speed. Effects smoothly build and decay; no abrupt tunnel overlay, flashing whiteout, repeated camera shake, or roll.
- Nearby flights remain visually local; the Moon flight does not immediately become an overwhelming warp tunnel. Interstellar travel introduces a greater sense of scale and evolving star-field composition.
- After arbitrary inspection, departure remains smooth. Reverse flights depart naturally from the current view and approach the previous stop; they do not reverse-play the entire scene or spin the observer backward.
- Active elapsed time uses a monotonic clock and excludes pauses and hidden-tab time. Visible low frame rates do not stretch authored duration by clipping every frame delta. Hidden tabs suspend rendering/audio and return paused until resumed.

### Instruments and scientific quantities

Scientific calculations retain km, kg, and seconds internally. Keep local render coordinates separate and use local origins for large distances. Reuse the documented fixed reference epoch and approximate planetary positions unless a separately sourced snapshot replaces them. Never claim live ephemerides or navigation-grade accuracy.

For scientific arc-length coordinate s and active playback time t, virtual speed is the magnitude of ds/dt. Prefer the analytic derivative of the playback envelope, avoiding numerical cancellation from subtracting galactic-scale coordinates. Integrating speed over moving playback must reproduce the leg length. Reverse travel has a negative route-coordinate derivative but a positive displayed speed.

- mph = km/s × 3600 ÷ 1.609344.
- Light-speed multiple = km/s ÷ 299,792.458.
- Earth distance is the norm of the scientific journey position relative to Earth's center. It can decrease on a detour or reverse flight; do not force monotonic values.
- Earth distance is not cumulative distance traveled. Details may show both with separate labels. Inspection rotation/zoom does not change either scientific journey quantity.
- At the opening observation position, display the model's nonzero geocentric distance. Do not label a zero tour counter “distance from Earth.”

The speedometer label is “Virtual travel speed.” Show full integer mph with fixed-width tabular numerals and a smaller ×c comparison. Allocate space for the maximum itinerary value before playback; leading digit growth must not resize the instrument. Fit the full value on mobile with responsive type sizing or place the complete mph value on its own line; do not truncate it or silently relabel scaled values.

Update the numeric target from frame state. Animate digit columns toward actual values; do not invent random numbers. Lower digits can roll rapidly and receive subtle blur according to their change rate, while the most significant digits and units remain readable. Settle exactly to the target as speed decreases. In reduced-motion mode, use unblurred, nonrolling values updated at up to 10 Hz. Screen readers receive state changes, not frame-by-frame digit announcements.

Always show Earth distance in miles, with a smaller contextual equivalent: AU from 0.1 AU up to 0.1 light-year, then light-years. Use matching precision and stable alignment; describe rounding and the geocentric reference in Details. Both travel instruments remain visible during transit. Pausing freezes the values and displays “Paused”; the retained speed describes the frozen virtual frame, not continued progress. Skip and direct jumps settle to zero without counting the discontinuity as travel.

During the final horizon descent, the ordinary route-derived speed formula no longer applies to the illustrative curved-spacetime view. Replace the speedometer with “Horizon approach” and local radius in horizon radii; preserve Earth distance. Do not imply an accurate local relativistic velocity from a Euclidean route derivative.

### Resting interface and composition

Retain the restrained dark visual system and monospaced numeric typography. Make lighting, detail, camera motion, spacing, and hierarchy carry the premium impression. Avoid decorative dashboard chrome that competes with the worlds.

Desktop: place the object prominently toward the right with the fact panel beside it on the left. Mobile: place the object above a compact fact panel. Use a consistent apparent framing rather than physically proportional screen diameters. Initial target is 60–75% of the available scene height for a globe; fit rings and Voyager's silhouette into that envelope. Physical size comparisons belong in the facts and Details.

At rest show name, brief description, three curated facts, Details, Next/Previous, inspection controls, and compact access to destinations, sound, motion preference, and sources. Facts follow the itinerary's content emphasis; choose sourced values and units during implementation. Stars and Voyager have appropriate inspection framing. Sagittarius A* uses bounded view exploration and zoom that cannot cross the horizon.

Departure fades the fact panel, title, navigation rail, destination picker, and decorative masthead over roughly 350 ms. During flight retain only the two instruments and small playback/sound controls; a destination label may sit within Skip flight's accessible description. Fade the resting interface back over roughly 500 ms during the final settle. Keep the object visible throughout the transition. Controls reenable only after settling completes.

Retain the existing distance-scaled rail as an expandable Journey detail at rest rather than a permanent flight overlay. Preserve truthful linear proportions and grouped markers. The picker contains exactly the 13 observation stops; descent stages are not additional destinations.

### Rendering and asset requirements

Keep the existing single Three.js rendering context and layered Earth foundation. Upgrade deficiencies within that system before considering a renderer replacement.

| Destination family  | Required visual result                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Earth               | Sharp day/night surface, separate cloud depth, subtle cloud shadows, ocean highlights, restrained atmospheric scattering, believable terminator and axial tilt |
| Moon, Mercury, Mars | Resolved surface imagery, appropriate normal/roughness detail, directional relief and believable terminator; no generic colored placeholder in the normal path |
| Venus               | Convincing cloud-covered world; do not present radar surface imagery as an unobstructed visible-light surface                                                  |
| Gas and ice giants  | Credible cloud maps/colors, subtle material response, appropriate axial tilt; realistic low-contrast Uranus remains acceptable                                 |
| Saturn              | Detailed transparent rings, ring/body shadow relationships, safe inspection clearance and complete silhouette                                                  |
| Sun and Proxima     | Animated, structured emissive surfaces and restrained corona; retain Proxima's distinct red-dwarf identity                                                     |
| Voyager 1           | Recognizable dish, core, booms, and antenna proportions with credible materials; orbitable object, not a globe                                                 |
| Sagittarius A*      | Lensed star field and carefully lit illustrative accretion structure; coherent handoff from travel scene to black-hole rendering                               |

Use documented NASA/JPL or other appropriately licensed assets and record provenance and modifications. Select resolution from the maximum supported inspection zoom: textures must stay sharp there, not only at their default distance. Stream local assets progressively: Earth first, then adjacent destinations; reuse resources and dispose those no longer needed. Loading failures fall back to an illustrated material with a concise status message and working navigation. Required asset loading may precede a flight; it must not freeze the camera midflight. A 10-second load timeout selects fallback and enables travel.

Rendering quality may adapt to device capability without altering durations or scientific values. Target fluid 60 fps on the recorded desktop hardware used for validation, with stable 30 fps as the mobile floor after quality adaptation. These are validation targets, not claims established by software-rendered screenshots. Record browser, device/GPU, viewport, and observed frame pacing. Verify repeated traversal does not grow GPU resources indefinitely.

### Sagittarius A* and the ending

Replace Gaia BH1 throughout route data, scientific parameters, source descriptions, metadata, accessibility labels, fixtures, and summaries. Use an explicitly approximate Sagittarius A* model of 4 million solar masses at 26,000 light-years, with J2000 position approximately RA 17h45m40s, Dec −29°00′28″. Sources: [NASA mass and distance](https://www.nasa.gov/image-article/supermassive-black-hole-sagittarius/) and [Chandra position and distance](https://chandra.si.edu/photo/2026/sgrawind/index.html).

Derive the horizon radius from the chosen mass using the existing simplified nonrotating Schwarzschild model; do not retain Gaia BH1's 9.62-solar-mass parameters, approximately 28 km horizon, or tidal thresholds. Its expected horizon radius is roughly 11.8 million km. Source the visual description separately: an authored bright disk is an illustration, not a literal visible-light photograph of the current object. State the model limitation in Details/Sources.

Arrive at an observation radius of 1,000 horizon radii, with authored optical framing that makes the black hole visually compelling. The scientific observer position must incorporate that local offset consistently. The final approach is a separate explicit action, never wheel-triggered or entered automatically by a hash.

Engineering default for descent: 20 seconds through radii 1,000 → 100 → 1.5 → 1 → 0.8 horizon radii at elapsed times 0 → 8 → 15 → 18 → 20 seconds. Interpolate log-radius smoothly, keep a fixed inward-facing direction after blending from inspection, and reach darkness at the horizon. Pause and Finish descent remain available. This is an illustrative camera sequence, not a survival or geodesic simulation.

Inside, show the ending and journey summary in darkness with Return to Earth. The summary distinguishes route length, light-equivalent route time, and playback time. Return to Earth is a replay reset with a short fade, not a physical escape animation. Reset flight state, motion effects, inspection pose, and pending input, while retaining the visitor's sound and motion preferences.

### Audio, motion preference, accessibility, and failures

Audio starts off and is enabled by explicit interaction. Use a restrained ambient bed, smoothly increasing travel intensity, and a soft arrival resolution. Audio follows the same flight envelope and pauses/fades with playback. Browser audio restrictions must leave the silent experience usable; no autoplay errors or abrupt volume spikes. Persist the setting, but require a user gesture again when the browser requires one.

Motion mode defaults to the OS reduced-motion preference unless explicitly overridden. Offer System, Full, and Reduced choices. Reduced mode retains itinerary, authored durations, instruments, pause, and skip, but uses stable framing, gentle scene blends, no accelerating star tunnel/FOV changes, no idle globe spin, and no rolling digit blur. Manual inspection remains available with reduced inertia. Motion preference can change without resetting progress.

Use semantic buttons, visible focus, accessible names, readable contrast, and touch targets of at least 44×44 CSS pixels. When departure hides the focused control, move focus to Pause; on arrival, move it to a visible destination control without opening a dialog. Announce destination and playback changes politely. Keep Sources/Details dialogs keyboard-operable, restore focus on close, and prevent their scrolling from navigating the journey.

Resize/orientation changes recompute framing without resetting flight progress. No-WebGL mode uses a static illustration and the same route, facts, navigation, telemetry schedule, and ending; disable unsupported inspection affordances and explain their unavailability. WebGL context loss pauses travel and offers recovery or fallback. Browser visibility changes pause visual/audio work and clear transient input.

### Module responsibilities and migration

Preserve the existing science, journey, flight, renderer, and UI boundaries where practical:

1. Science owns units, fixed reference positions, distance conversion, and black-hole parameters. It never reads DOM or render units.
2. Journey owns the stop catalog, adjacent leg durations, physical routes and arc-length lookup, destination facts, and legacy destination mapping.
3. Flight owns commands, playback clock, phases, pause/resume/skip, inspection-to-flight handoff, and the deterministic frame snapshot. Replace scroll-position-as-time with this controller.
4. Renderer owns materials, asset lifecycle, local scene coordinates, camera application, inspection input geometry, adaptive quality, and black-hole compositing. It does not independently decide journey progress.
5. UI/input translates gestures and controls into commands and renders the snapshot. Retire Lenis-driven long-page sections as the source of travel state; keep ordinary scrolling within details. An audio adapter consumes the same snapshot.

Use existing animation libraries only where useful for presentation; independent timelines must not advance the scientific state. Derive destination counts, final-stop detection, and black-hole stage transitions from named data, replacing hardcoded 20/21 and index-based assumptions. Update source documentation, reference snapshot generation, captures, and tests with the new route and destination model. Preserve old links through the explicit mapping above.

## Testing Decisions

The user confirmed browser controls as the primary acceptance boundary, supported by the existing pure flight/science boundary for exact timing, continuity, and telemetry. Test observable outcomes and numerical contracts, not internal class layouts, mesh IDs, or incidental easing implementation.

Existing prior art includes pure tests for route continuity, camera clearance, scientific conversions, travel effects, and distance-rail grouping, plus browser tests for all destinations, reverse navigation, dialogs, hidden tabs, responsive layout, texture failures, and no-WebGL fallback. Adapt these suites rather than creating a parallel test framework. Replace assertions tied to continuous page scrolling, 21 checkpoints, Gaia BH1, and motion ignoring OS preferences.

### Deterministic numerical acceptance

- The catalog contains exactly the specified 13 stops, and the 12 durations total 236 seconds. Reverse legs use matching durations.
- Each flight reaches its target at its configured active duration within one simulated frame, independent of frame partitioning; pauses and hidden time do not consume it.
- Route progress is monotonic in the selected direction, endpoint positions match, and speed is finite, continuous, nonnegative, and zero at rest.
- Integrating speed recovers leg distance within 0.1%; mph and ×c agree with the same speed. Departure turns, inspection, direct jumps, and skips cannot create speed spikes.
- Earth displacement matches the scientific position, remains distinct from route distance, and handles decreasing distance correctly.
- Camera poses are continuous at departure from multiple inspection angles, phase boundaries, skips, and arrival. Clearance checks include atmospheres and Saturn's rings.
- Frame sampling at galactic distances produces no NaN, Infinity, catastrophic jitter, or unit overflow. Sagittarius A* horizon radius follows its new mass.
- Pause freezes the sampled state, resume continues from it, duplicate commands do not create concurrent journeys, and reset clears queued/transient input.
- Legacy hashes map correctly; no direct navigation starts a black-hole descent.

### Browser acceptance scenarios

1. Load Earth: correct content, three facts, sharp globe, working drag/zoom, visible Next, and no horizontal overflow or browser errors.
2. Trigger one wheel gesture: one Earth–Moon flight completes without further scrolling; repeat with Next and keyboard activation.
3. Send tiny, horizontal, modified, reversing, and inertial wheel events: only intentional vertical gestures navigate; continued momentum after arrival never causes a second flight.
4. Drag and zoom at Earth, Moon, Saturn, Voyager, and Sagittarius A*: view changes within bounds, UI clicks do not drag, and departure starts without a snap.
5. During flight, confirm facts/rail are hidden, instruments remain visible, digits follow actual speed, playback controls work, and extra navigation gestures are ignored.
6. Pause, change tabs, resume, and skip during acceleration and braking: progress is preserved or settled as specified, with no telemetry jump or audio leak.
7. Traverse all stops, return backward, select destinations directly, load valid/legacy/invalid hashes, and use browser history. Correct content and stable counts appear everywhere.
8. Reach Sagittarius A*: scrolling cannot enter it. Explicit descent reaches the ending; Return to Earth fully resets the journey.
9. Exercise touch drag/pinch, Next, and orientation changes at mobile sizes; exercise keyboard inspection, focus transfer, dialogs, and announcements.
10. Change sound and motion settings; simulate OS reduced motion, failed textures, no WebGL, and context loss. The journey remains operable under the documented fallback.

Use a controllable clock for broad timing tests while retaining representative real-time browser flights. Run browser verification headlessly with PW_HEADLESS=true toward the end of implementation. Cover 1440×1000 desktop, 390×844 mobile, and at least one short viewport around 1366×768. Run relevant type, production-build, and test checks. Clean up verification servers and verify their ports are released.

### Visual and motion acceptance

Capture a real-time review of Earth departure and Moon arrival, an outer-planet flight, the final 50-second leg, and the optional descent. Review turns, acceleration, readable instruments, sustained-interest scenery, long braking, and panel choreography. Still screenshots alone cannot establish smooth motion.

Inspect Earth/Moon terminators, cloud depth, surface texture at maximum zoom, Saturn's rings, Voyager's silhouette, and the black-hole handoff. Check both screen sizes for clipping, instrument width changes, unreadable text, and controls overlapping the main object. Hardware frame pacing must be reported separately from software-rendered functional verification.

Implementation is complete only when these behavior and visual checks pass, or any access/hardware limitation is explicitly reported. Do not treat a passing build as proof of photorealism or smoothness.

## Out of Scope

- Google Earth integration, streamed street/building data, ground landings, or unlimited zoom.
- A visible cockpit, spacecraft body, avatar, piloting game, or free flight between arbitrary coordinates.
- Literal real-time interstellar travel, physically achievable superluminal speeds, a relativistic mission simulator, or navigation-grade ephemerides.
- Additional selectable belt/cloud/boundary stops, exoplanet visits, or a second black-hole destination.
- Accounts, backend persistence, analytics, narration, multiplayer, or VR.
- Deployment, pushing commits, or DNS changes as part of implementing this specification.

## Further Notes

The source of product authority is the completed grilling conversation, including acceptance of the duration table and the final decision to reserve scrolling for travel. Testing boundaries were separately confirmed while preparing this specification. Engineering defaults are collected above so implementation can proceed without another product interview.

Implementation order: establish the deterministic journey/telemetry controller and Earth–Moon interaction loop; validate that motion and arrival rhythm; extend the data-driven route and destination rendering; migrate the black hole and ending; complete accessibility, fallback, audio, and full-route verification. This is sequencing of one feature, not a reduction in its delivery scope.

Published to the configured local Markdown tracker after setup. This is the implementation reference for EH-01 through EH-07; the original authored specification remains preserved in the project documentation. Product requirements are unchanged by ticket publication. See the [ticket index](README.md) for dependencies and coverage.
