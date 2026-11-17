# Journey Through Space: quieter interface and coherent flight motion

Status: ready-for-agent
Date: 2026-11-16
Scope: specification only; implementation and infrastructure changes are subsequent work.

## Problem Statement

The current experience competes with its own animation. Destination headings repeat information, controls occupy several corners, and navigation and preferences add visual weight. Distances mix miles, kilometres, and astronomical units without a visitor-controlled convention. The hidden, physically scaled distance rail is unsuitable as a simple destination navigator.

Flight instruments also feel disconnected from movement. Speed rises into millions of miles per hour while the departure world still appears close and almost stationary. A separate easing of camera escape compounds this mismatch. The visitor wants to feel a gradual departure, acceleration, cruise, braking, and arrival, with readable instruments that describe the movement honestly.

The project identity is changing from Event Horizon to journey-through-space, including its repository, local folder, package identity, and hosting identity.

## Solution

Make the world and its animation the primary experience. Show a slightly larger project name at the top left and a small settings icon at the top right. Consolidate preferences and Sources into an anchored dropdown. Replace Jump to and Journey detail with a thin, named route along the bottom, with gently relative spacing that reflects flight duration without implying a physical distance scale.

At a stop, show the destination name, a short description, three compact facts, discreet Details, current distance from Earth, and redesigned Previous/Next controls. During flight, show only the speedometer, distance with astronomical context, Pause/Resume, Skip, and settings. Use one coherent movement schedule for scientific distance, numeric speed, camera departure, and the speedometer's relative indication. Extend flight durations where needed to make that progression convincing.

## User Stories

1. As a visitor, I want the world to dominate the screen, so that the experience feels immersive.
2. As a visitor, I want one clear project name, so that redundant headings do not distract me.
3. As a returning visitor, I want consistent project branding and addresses, so that I recognize the renamed experience.
4. As a visitor, I want a small settings control, so that preferences remain available without filling the interface.
5. As a first-time visitor, I want full motion initially, so that I see the intended animation.
6. As a visitor sensitive to motion, I want an easily reached Reduced option, so that I can choose a gentler presentation.
7. As a first-time visitor, I want sound off, so that the experience does not begin with unexpected audio.
8. As a returning visitor, I want my explicit preferences remembered, so that I do not repeatedly configure the experience.
9. As a curious visitor, I want Sources inside settings, so that references remain available without another permanent button.
10. As a visitor, I want all destination names on a route, so that I understand the itinerary.
11. As a visitor, I want gently increasing route gaps, so that longer flights have a visible pacing cue.
12. As a pointer user, I want a succinct destination preview on hover, so that I can inspect a stop before selecting it.
13. As a visitor, I want clicking a route stop to jump there, so that revisiting does not require replaying intervening flights.
14. As a mobile visitor, I want a readable horizontal route, so that destination names are not squeezed together.
15. As a touch user, I want a preview and explicit Go action, so that exploring a label does not unexpectedly move me.
16. As a visitor, I want quiet Previous/Next controls with destination names, so that adjacent travel is clear.
17. As a visitor, I want a concise description and three facts, so that I can learn without obscuring the object.
18. As a visitor, I want plain-language facts, so that unfamiliar terminology does not impede understanding.
19. As a curious visitor, I want discreet Details, so that deeper explanations are optional.
20. As a visitor, I want miles or kilometres used consistently, so that I can compare ordinary distances and speeds.
21. As a visitor, I want AU and light-year context, so that astronomical distances remain understandable.
22. As a visitor unfamiliar with AU, I want a small explanation control, so that I can learn its meaning in place.
23. As a visitor, I want distance explicitly labeled as current distance from Earth, so that I know what the number measures.
24. As a visitor at rest, I want the speedometer hidden, so that a zero readout does not clutter observation.
25. As a visitor, I want double-click or double-tap to toggle close-up, so that inspection needs fewer visible controls.
26. As a visitor, I want zoom to preserve my viewing angle, so that inspecting a world feels continuous.
27. As a visitor starting a flight, I want immediate gentle movement and gradual acceleration, so that departure feels intentional.
28. As a visitor, I want speed to agree with distance and visible departure, so that the instrument feels credible.
29. As a visitor, I want smooth braking, so that arrival feels connected to travel.
30. As a visitor, I want a speedometer that expresses acceleration on every leg, so that short and long flights both read clearly.
31. As a visitor, I want Pause/Resume and Skip during flight, so that I retain control.
32. As a keyboard user, I want navigation, previews, settings, explanations, and inspection to remain operable, so that pointer gestures are optional.
33. As a visitor with limited graphics support, I want the same journey controls and information, so that rendering failure does not block exploration.
34. As a visitor at Sagittarius A*, I want to choose the descent explicitly, so that ordinary navigation cannot accidentally end the journey.
35. As a visitor completing the journey, I want Return to Earth, so that I can replay it with my preferences retained.

## Implementation Decisions

### Authority, vocabulary, and retained behavior

- This specification supersedes the earlier immersive-journey specification wherever they conflict: initial motion mode, interface composition, rail meaning, unit presentation, zoom affordances, and fixed route timings.
- Preserve the existing meanings of stop, leg, flight, inspection, route distance, Earth distance, scientific position, and visual position. Inspection changes the viewing pose, not scientific distance.
- Preserve the 13-stop order: Earth, Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn, Uranus, Neptune, Voyager 1, Proxima Centauri, Sagittarius A*.
- Preserve adjacent flights in either direction, deliberate wheel-to-travel behavior, input ownership and momentum protection, direct links, browser history, legacy destination redirects, asset fallbacks, hidden-tab pausing, and graphics recovery.
- Ordinary Next/Previous plays an adjacent flight; route selection jumps through the existing short fade. Neither direct links nor ordinary wheel navigation enters the final descent.
- Keep scientific calculations independent of display units and visual scale. The route remains a guided illustration rather than physically achievable travel or a navigation-grade ephemeris.

### Project identity and rename coordination

- The agreed project identifier is `journey-through-space`. Rename the repository, local project folder, package identity, page metadata, active branding, and applicable documentation/references consistently. Use the name slightly larger at the top left; remove the separate Journey Through Distance tagline.
- Target the renamed GitHub repository under the existing owner, the existing Vercel project renamed to match, and the custom production address `journey-through-space.ericzwierzynski.dev`. Reuse existing resources rather than creating duplicate repositories or hosting projects.
- The user said they are currently changing the name. Reinspect actual repository, folder, hosting, and domain state immediately before changes; complete missing work without racing or undoing their changes.
- Renaming preference-storage identifiers must preserve explicit saved preferences. Internal destination IDs and compatibility links continue to work.
- Distinguish obsolete project branding from valid references to the physical event horizon. Physical terminology remains scientifically correct after the branding rename.
- Infrastructure operations follow the existing deployment workflow and its branch, free-tier, DNS, and verification rules. This specification-writing task authorizes no infrastructure mutation, push, or deployment.

### Settings and preference behavior

- Place a small settings icon at the top right, available at rest, during flight, and while paused. Its visual size may be small while retaining an accessible touch target.
- Open an anchored dropdown, rather than a modal settings popup. Include motion, sound, Miles/Kilometres, and Sources.
- Initial motion is Full, including when the operating system requests reduced motion. Reduced must remain easy to select. Existing explicit saved choices remain authoritative; retaining the existing System option is compatible with this change.
- Initial sound is off. Restore explicit saved preferences across visits, subject to browser gesture requirements for audio. A blocked audio start leaves the experience operable and silent.
- Initial units are Miles. Unit, motion, and sound changes preserve current progress and viewing state. Audio continues to follow playback and visibility state.
- Sources opens from settings; its existing sourced content and methodology remain available. Settings being a dropdown does not require replacing the existing Sources or Details dialogs.
- Remove the separate bottom-right motion/sound controls and standalone top-right Sources button.
- Preserve the existing Reduced presentation across route travel, inspection inertia, ambient effects, rolling digits, descent, and ending. Change explanatory copy that currently claims System is the default.

### Bottom route and destination selection

- Replace the Jump to dropdown and Journey detail button with a thin bottom route showing every stop's name at rest. Keep a clearly distinguishable current-stop marker.
- Spacing is gently relative to authored flight duration, with a minimum gap that prevents overlap. Longer legs occupy more width, without reproducing the enormous ratios of physical distances. The exact compression formula is implementation tuning.
- Explain discreetly that the route is not to scale. It represents itinerary and pacing, replacing the existing truthful linear-distance navigation and clustered selection dialog as the visible navigation model.
- Hover or keyboard focus reveals one short destination sentence. Hover/focus alone does not navigate. Desktop click or keyboard activation jumps directly through the existing short fade.
- On mobile, use a horizontally scrollable route and keep the current stop visible. A first tap reveals the preview with an explicit Go action; Go performs the direct jump. Route scrolling and preview interaction must not launch wheel-controlled flights or drag the world.
- Hide the route during flight and paused flight. It returns for observation; there is no all-stop navigation competing with playback controls during transit.

### Observation content and controls

- Show the destination name once, one short description, three compact relevant facts, and a discreet Details link. Remove Observation / Earth-style duplication, counters, redundant phase/next labels, and additional primary readouts that compete with this composition.
- Simplify the presentation while preserving scientific meaning and qualifications in Details/Sources. For Earth, the visible day-length value is 23 hours 56 minutes; explain its sidereal meaning in Details rather than appending the unfamiliar term to the fact.
- Keep Current distance from Earth visible at rest. Hide the entire virtual-speed component at rest rather than leaving a zero or empty gauge.
- Redesign adjacent navigation as quiet thin-arrow text controls at the bottom right, with destination names, subtle Previous/Next labels, and generous activation targets. Retain valid boundary behavior at the first and last stops.
- Remove visible plus/minus zoom, Reset view, and Journey detail controls. Drag inspection, pinch zoom, and keyboard inspection/zoom/reset remain available.
- Double-click on the inspection surface toggles between the normal arrival framing and maximum existing close-up. Repeating it restores normal framing. Double-tap provides the same touch shortcut. Preserve viewing angle in both directions and retain existing surface/ring clearance limits.
- Inspection gestures apply only to the world surface at rest. UI interactions and transit do not trigger zoom, drag, or unintended navigation. Arriving or jumping to another stop retains the existing inspection reset behavior.

### Units and distance explanation

- Settings offers Miles and Kilometres, not a Metres mode and not an AU speed mode. Miles produces mi and mph; Kilometres produces km and km/h.
- Apply the selected convention to ordinary lengths and speeds in instruments, facts, and displayed detail calculations, including diameter, separation, horizon radius, probe speed, and wind speed. Convert acceleration length components consistently as agreed; temperature, mass, time, angles, percentages, and dimensionless quantities retain their existing conventions.
- Maintain numeric values independently of formatted prose so conversion does not parse rounded display strings. Preserve scientifically meaningful precision and approximate/estimated qualifications without adding visual clutter.
- AU and light-years remain secondary astronomical context alongside the selected ordinary distance. Preserve existing context thresholds unless another decision is recorded: AU from 0.1 AU, light-years from 0.1 light-year.
- Place a small, operable question-mark explanation beside AU. Explain that an astronomical unit is approximately the average Earth–Sun distance and relate its value to the selected ordinary unit. It must work by click/tap and keyboard, rather than hover alone.
- Current distance from Earth means straight-line distance from Earth's center to the scientific observer position. It is distinct from accumulated route distance and can decrease on a detour. Preserve this existing semantics: Earth's orbital observation begins at a nonzero distance, and rotating or zooming the view does not change it.

### Flight composition and speedometer

- During flight and paused flight, hide project title, destination content, route, Details, and ordinary adjacent navigation. Keep the settings icon visible independently of the hidden title.
- Show the speedometer, Current distance from Earth with astronomical context, and bottom-right Pause/Resume plus Skip flight. Remove redundant In flight/Paused phase text and the extra times-light-speed readout from this composition.
- Use a compact arc and needle with actual numeric virtual speed and mph or km/h. The gauge reflects speed relative to that leg's peak; explain this discreetly so it does not imply one universal absolute scale across flights.
- Needle and number follow the same sampled speed. Pausing freezes the indication and numeric value. Reduced motion uses a stable, readable indication without rapid digit effects.
- Preserve the distinction between virtual route speed and a real spacecraft speed in methodology/help. Numeric formatting must remain readable and bounded in layout at the largest interstellar values in either unit mode.

### Coherent acceleration, departure, and braking

- Rework the actual travel schedule and the visual departure together. The old six-second Earth–Moon duration and 236-second route total are no longer acceptance requirements.
- The user's sequence of low example speeds describes a gradual feel, not scripted numeric checkpoints. Begin gentle translational departure immediately after launch and increase through readable speed magnitudes. Avoid the current idle-looking departure followed by an abrupt jump into millions of mph.
- Peak speed belongs to visually established travel after leaving the departure framing, rather than a view that still appears stationary beside the world. Brake smoothly toward arrival, with zero speed at rest. Apply the same principles in reverse.
- Derive scientific route progress and speed from one consistent active-time schedule. Speed is the derivative of scientific route distance, not an independently eased display counter. Numeric speed integrated over a leg must recover its authored scientific length.
- Camera travel remains visually rescaled, but its progression must follow that schedule without an additional flattening that hides departure while reporting large speeds. Preserve smooth handoff from the visitor's inspection pose, safe paths, and continuous camera orientation.
- Allow longer durations where needed for readable departure, acceleration, cruise, and braking; retain the progressively longer journey rhythm. Tune and record a revised per-leg duration table and total during implementation. Reverse travel uses the corresponding authored leg duration.
- Use the revised durations as the bottom route's spacing input. Update ending totals, timing-based documentation, captures, and tests together; preserve the distinction between playback time and physical/light-equivalent time.
- Preserve frame-partition independence, finite nonnegative speed, exact endpoints, pause/resume, skip, duplicate-command protection, and hidden-tab behavior. Changes to timing must not create disconnected animation clocks.

### Finale, accessibility, and resilience

- Preserve the explicit Enter the event horizon action at Sagittarius A*, the existing separate illustrative descent, and Return to Earth. Ordinary Next/scroll/direct links never start descent automatically.
- During descent, use distance to the horizon instead of a misleading route-speed gauge, with Pause/Resume and Finish controls. Preserve the illustrative nature and safe distinction from measured physical velocity. The established twenty-second descent remains unchanged by route-duration tuning.
- Keep the quieter visual style through the ending and retain preferences on replay.
- Preserve semantic controls, visible focus, readable contrast, keyboard access, and touch targets of at least 44 by 44 CSS pixels. Dropdowns, previews, and explanations need reachable content, dismissal, and focus restoration. Escape/outside dismissal must not launch travel or manipulate the world.
- Transfer focus safely when observation controls disappear for flight and restore it to visible destination navigation on arrival. Announce destination and playback changes without streaming every speed digit to assistive technology.
- Preserve texture-loading fallback, context-loss pausing/recovery, static no-WebGL mode, and resize/orientation continuity. The redesigned navigation, settings, and facts must work in fallback mode; unsupported inspection remains explained.

## Testing Decisions

### Boundaries and prior art

Use the existing browser-facing interaction seam as the primary acceptance boundary, supported by the existing deterministic controller/science seam for exact timing and numerical invariants. Extend current tests rather than creating a new framework or test-only production architecture. Existing coverage includes controller integration, all-stop/reverse traversal, scientific conversions, inspection clearance, wheel ownership, dialogs, history, motion preferences, assets, finale, and resilience.

Tests should assert visitor-visible behavior and numerical contracts, rather than DOM styling choices, private fields, mesh identities, exact easing formulas, or screenshots alone. The user did not separately confirm these test seams during this specification request; they are carried forward from the existing project and recorded as the proposed verification approach.

### Numerical acceptance

1. The exact 13-stop itinerary and legacy-link mappings are retained. Revised durations and their total are derived consistently, with reverse-leg parity.
2. Each leg arrives at its endpoint at its revised active duration independent of frame partitioning. Paused/hidden time contributes no movement.
3. The integral of displayed underlying speed agrees with scientific leg length within the existing 0.1% tolerance. Forward/reverse speed is finite, nonnegative, continuous, and zero at rest; route progression is monotonic in the commanded direction.
4. Finite-difference scientific route progress agrees with speed throughout launch, acceleration, cruise, and braking. Unit conversion changes presentation without changing progress, scientific positions, or timing.
5. Earth distance equals scientific straight-line displacement, including nonzero orbital Earth observation, detours, and invariance under inspection.
6. Arbitrary inspected launch poses and both zoom states preserve camera continuity and clearance, including Saturn's rings and the final galactic leg. No NaN, Infinity, or unstable galactic subtraction is introduced.
7. Pause freezes state, resume continues it, skip/direct selection settles cleanly, duplicate inputs cannot start concurrent flights, and replay clears transient inputs while preserving preferences.
8. Replace tests hardcoding six-second Earth–Moon travel, the old per-leg duration array, 236 seconds, or the old System default. Retain their underlying timing/integration guarantees using the revised authored data.

### Browser acceptance

| Scenario                                                    | Required observable outcome                                                                                                                                           |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean initial visit, including OS reduced-motion preference | Full is initially selected, sound is off, Miles is selected, and Reduced is readily reachable.                                                                        |
| Saved preferences and storage migration                     | Explicit choices survive reload and renaming; unavailable storage leaves usable defaults. Audio respects gesture restrictions.                                        |
| Settings at rest, in flight, and paused                     | Anchored dropdown remains usable, preserves progress, and exposes motion, sound, units, and Sources. Closing restores focus.                                          |
| Observation on every stop                                   | One destination heading, short description, three compact facts, discreet Details, distance, and valid adjacent controls; no resting speedometer or removed controls. |
| Desktop route                                               | All names are readable with gently relative gaps; hover/focus previews without travel, activation jumps, and current marker updates.                                  |
| Mobile route                                                | Horizontal scroll keeps labels usable and current stop visible; first tap previews, Go jumps, and scrolling does not manipulate the world.                            |
| Navigation/history                                          | Previous/Next launches one adjacent flight; route/direct/history links jump safely; legacy links never trigger descent.                                               |
| Inspection                                                  | Drag works; double-click/double-tap toggles normal/close framing while preserving angle; pinch and keyboard controls work; UI activation never zooms.                 |
| Launch and braking                                          | Visible gentle departure begins promptly, numeric speed builds gradually, peak occurs during established travel, and braking agrees with arrival.                     |
| In-flight composition and pause                             | Only agreed instruments, playback controls, and settings remain; Pause freezes the gauge and Resume continues; Skip arrives without a spike.                          |
| Miles/Kilometres and extreme values                         | All applicable lengths/speeds convert, astronomical context remains, and the longest readouts do not overlap, clip, or overflow.                                      |
| AU explanation                                              | Click/tap and keyboard reveal a concise accurate explanation, with dismissal and focus behavior.                                                                      |
| Sources and Details                                         | Information and references remain accessible; specialist qualifications are preserved without cluttering primary facts.                                               |
| Finale/replay                                               | Explicit descent only, horizon-distance display, Pause/Finish, complete ending, correct revised totals, and replay with retained preferences.                         |
| Resilience                                                  | Hidden tabs pause; load failure, no WebGL, context loss/recovery, resizing, and orientation changes preserve usable navigation and state.                             |

### Visual, motion, and execution expectations

- Verify completed layouts headlessly with `PW_HEADLESS=true` at 1440 by 1000, 390 by 844, and a short desktop viewport around 1366 by 768. Cover focus, touch/pointer behavior, browser errors, overlap, clipping, and horizontal overflow outside the intentionally scrollable route.
- Record and review representative real-time Earth–Moon departure/arrival, an outer-planet flight, the longest interstellar leg, and the descent. Review both accelerating and braking instruments alongside visible motion, including reverse travel and an inspected launch pose. Still screenshots and fake-clock completion cannot establish motion quality.
- Record the revised duration table plus timestamped speed, route progress, and camera/visual samples as evidence that the launch mismatch has been corrected. Exact acceptable timing and screen-space thresholds have not been agreed; distinguish objective integration checks from qualitative motion review.
- Run existing type checks, production build, relevant controller/science tests, and browser suites affected by controls, units, timing, and identity. Use controllable time for broad coverage while retaining representative real-time verification.
- Report unavailable hardware/GPU verification plainly. Software WebGL functional checks do not establish real-device frame pacing or photorealism. Preserve existing quality goals without claiming performance measurements that were not taken.
- Clean up verification browsers and servers and verify released ports. Infrastructure verification, when subsequently performed, must confirm actual repository/hosting identity, intended deployed revision, HTTPS, and the new domain, following the deployment workflow.

## Out of Scope

- New destinations, new physical trajectories/ephemerides, altered scientific reference epochs, or a different black-hole model.
- Literal realistic spacecraft speeds, physically possible interstellar travel, or a gauge whose value is disconnected from scientific route distance.
- Metres as a preference mode, AU per hour as a speed mode, or changing temperature and mass conventions.
- New accounts, backends, analytics, narration, multiplayer, VR, streamed Earth imagery, free-flight piloting, or a broad rendering rewrite.
- Replacing the established sourced scientific model or dropping meaningful uncertainty qualifications for visual simplicity.
- Performance-skill audits unless separately requested, as required by the project instructions.
- Application implementation, remote rename, folder move, production release, DNS mutation, or pushes during this specification-writing task.

## Further Notes

### Outstanding questions and implementation tuning

1. **Rename ownership/state:** the user is changing the name, but which repository/folder/hosting/domain steps they will complete is not established. Inspect state first; coordinate only where simultaneous changes would conflict. At specification time, the local root and origin still use event-horizon. No successful remote rename or domain change is claimed.
2. **Old production address:** the new address is agreed, but redirecting, retaining as an alias, or retiring the old domain was not discussed. Do not delete or redirect it on an assumed policy; resolve before changing its behavior.
3. **Display typography:** the agreed canonical identifier is journey-through-space. Whether the visible title uses literal hyphens or the human-readable “Journey Through Space” was not explicitly settled. Record the choice before final visual acceptance; identifier/package/repository casing remains unambiguous.
4. **Timing and motion review:** permission to extend route flights is explicit, but exact durations, ramp shape, early speed milestones, and a maximum total runtime were not specified. Tune within the agreed gradual progression and record results; ask only if satisfying the visual requirement would require a consequential new runtime decision. The example numbers are not an exact sequence to implement.
5. **Finale quantity:** “distance to the horizon” was accepted, while the current descent model exposes radius relative to the black-hole center. Specify whether the new readout is height above the horizon, center radius, or signed offset once crossing it before labeling that quantity. Preserve the underlying descent and do not silently relabel a center radius as horizon separation.
6. **Verification seam confirmation:** browser behavior plus the existing deterministic numerical boundary is proposed from prior art, not separately approved in this round. This does not change product requirements; record any requested change before broad test work.

Exact spacing compression, arc dimensions, breakpoints, typography, rounded precision, and dropdown/help placement are implementation tuning rather than newly required product decisions. Tune them against the stated legibility, restraint, accessibility, and motion acceptance criteria.

### References and handoff

- [Prior immersive-journey specification](../../docs/specs/immersive-journey.md): baseline for retained science, itinerary, fallback, interaction, and finale behavior. This specification takes precedence on explicitly changed requirements.
- [Project README](../../README.md): architecture, current scripts, and implementation baseline; its old motion/timing/rail claims need updating during implementation.
- [Existing deployment record](../../docs/DEPLOYMENT.md): current recorded repository, host, and custom-domain setup; verify actual state before rename work.
- [Deployment workflow](/home/eric/.config/deployment-workflow/README.md): required operational rules for subsequent hosting/domain work.
- The authoritative product decisions are the completed grilling conversation. The task tracker is local Markdown; this spec is published there with ready-for-agent status. Unresolved points above are explicit rather than inferred decisions.
