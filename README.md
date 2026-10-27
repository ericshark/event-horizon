# 01 · Event Horizon

A scroll-driven descent into a black hole. Every frame is ray-marched live on
the GPU: light rays bend around a Schwarzschild mass, the accretion disk is
Doppler-beamed (the side moving toward you burns blue-white, the side moving
away reddens), and the Einstein ring wraps the page's own title around the
hole.

## Run locally

Use Node.js 22.12+ and npm. From this folder:

```sh
npm install
npm run dev
```

Open the URL Vite prints. It starts on port 5174 and moves to the next free
port if 5174 is busy.

## What to try

- **Look at the title.** "Event Horizon" is drawn into the sky behind the
  hole, so you are seeing gravitationally lensed typography, not a DOM overlay.
- **Move the cursor.** It drags a second, weaker lens that warps the stars and
  disk under it.
- **Scroll.** Six chapters fly the camera from 30 Schwarzschild radii down to
  the horizon. The telemetry shows radius, gravitational redshift, and escape
  velocity, all computed from the camera's actual distance. The two clocks
  drift apart through gravitational time dilation.
- **Reach the end.** The page whites out at the singularity. Press
  _Fall again_ to return to the top with the universe inverted, and press it
  again next time to flip it back.

## How it works

- `src/blackhole.glsl.ts`: fullscreen fragment shader. Photon paths use the
  Cartesian form of the Schwarzschild null geodesic
  (`a = -1.5 h² x / r⁵`, with the Schwarzschild radius = 1). Each step tests
  for crossings of the disk plane and the title plane.
- `src/camera.ts`: one camera keyframe per chapter (distance, elevation,
  azimuth, roll, FOV), eased between.
- `src/renderer.ts`: three.js wrapper plus a frame-time governor that scales
  render resolution between 0.2× and 1× device pixels.
- `src/chapters.ts`: GSAP ScrollTrigger reveals, the orbiting ring, and the
  stretched "spaghettification" type.
- `src/main.ts`: Lenis smooth scroll, HUD physics readouts, pointer lens,
  and the finale.

Rendering pauses while the tab is hidden. With `prefers-reduced-motion`,
smooth scrolling, letter stretching, and camera sway are off, and the disk
spins slowly; scrolling still drives the descent. Without WebGL2 a CSS
illustration and the regular title are shown instead. Fonts are bundled
locally and the page makes no network requests.

## Checks

```sh
npm run typecheck
npm run build
PW_HEADLESS=true npm test
```

Tests start their own server on port 5201 (`PW_PORT` overrides it), run at
desktop 1440 × 1000 and mobile 390 × 844 in Chromium with SwiftShader WebGL,
and save screenshots to `artifacts/`. Software rendering is far slower than a
real GPU, so the governor drops the resolution during tests.
