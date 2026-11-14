# 03: Photorealistic planetary encounters from Earth through Neptune

ID: EH-03
Status: ready-for-agent
Blocked by: 02 (EH-02)

## What to build

Arrive at convincing planetary worlds, inspect sharp surfaces and atmosphere/ring detail at maximum zoom, and depart naturally from each view.

## Context for a fresh agent

EH-02 provides working visits, inspection, facts and playback for every world. Own the end-to-end appearance and encounter choreography of Earth, Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn, Uranus and Neptune. This is a visual interaction slice, not an asset-only delivery. Keep physics, timing and facts unchanged.

Read the [approved specification](../spec.md). Relevant sections: Rendering and asset requirements; Resting interface and composition; Flight motion and pacing. User-story coverage: 1–3, 7–8, 15–16, 31. The specification controls numerical defaults and behavior where this ticket summarizes them.

## Dependencies

- [EH-02: Complete 13-stop route, scientific model, and navigation](02-complete-route-navigation.md) must be resolved before starting.

## Acceptance criteria

- [ ] Earth has sharp day/night imagery, separate clouds and subtle cloud shadows, ocean highlights, a restrained atmospheric rim, credible terminator and tilt. Moon/Mercury/Mars have resolved imagery and directional relief without generic normal-path placeholders.
- [ ] Venus shows a credible cloud deck rather than exposed radar terrain. Giants have credible cloud color/detail and tilt; Uranus may have realistic low contrast. Sun has a structured animated emissive surface and restrained corona.
- [ ] Saturn has transparent detailed rings, ring/body shadow relationships, complete framing, and safe orbit/zoom clearance. No tested inspection angle clips body, atmosphere, rings or near plane.
- [ ] Materials and textures stay convincing at the allowed maximum zoom. Record source, license/attribution and modifications for new assets; normal loading uses real required materials, with illustrated fallbacks clearly reserved for failures.
- [ ] Each planetary approach reveals its destination by braking and settles into consistent 60–75% scene-height framing where appropriate. Departure blends from the actual inspection pose. Vary arcs and local scenery; Earth–Moon remains visually local, with no overpowering immediate warp tunnel.
- [ ] Desktop places facts beside the object; mobile places them below. Rings and globes fit without covering controls, hiding facts or causing horizontal overflow on the specified desktop, mobile and short viewports.
- [ ] Load Earth first and preload adjacent assets using the common lifecycle. Share/dispose GPU resources correctly; rendering upgrades do not change scientific coordinates or flight duration. Maintain hooks for EH-06 fallback and adaptive-quality behavior.
- [ ] Run relevant checks and one focused headless visual/interaction pass after implementation. Capture Earth/Moon terminators, maximum-zoom surfaces, Saturn rings and a real-time outer-planet flight; document remaining asset/hardware limitations.

## Verification and demo

Inspect Earth, Moon, Mercury, Venus, Sun and at least two giants including Saturn at rest, maximum zoom and departure. Verify a complete outer-planet flight has no material pop, camera discontinuity or obstruction.

Use the approved browser-control acceptance boundary, supported by the existing pure flight/science tests. Test observable behavior and numerical contracts rather than mesh IDs or internal class structure. Run relevant existing checks; when browser verification is needed, use PW_HEADLESS=true near completion and stop verification processes afterward. Commit task-related working changes; do not push or deploy.

## Scope boundary

Voyager/Proxima and interstellar/audio design belong to EH-04. Black-hole rendering belongs to EH-05. Coordinate shared renderer edits; these tickets have no semantic dependency on each other.

## Completion record

When complete, set Status to resolved and append a comment with the commit, checks actually run, evidence, and any limitations. ready-for-agent describes preparation; blockers still govern whether work may start.

## Comments

- Breakdown and blocking graph approved by the user before publication.
