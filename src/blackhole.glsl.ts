export const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Units: the Schwarzschild radius is 1, so the horizon is r = 1, the photon
// sphere is r = 1.5 and the innermost stable orbit is r = 3.
export const fragmentShader = /* glsl */ `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uCamPos;
uniform mat3 uCamBasis;
uniform float uTanHalfFov;
uniform sampler2D uTitle;
uniform vec2 uTitleSize;
uniform float uTitleOpacity;
uniform vec3 uLensPos;
uniform float uLensMass;
uniform float uWhiteout;
uniform float uInvert;
uniform float uStepScale;

varying vec2 vUv;

const float DISK_IN = 2.4;
const float DISK_OUT = 11.0;
const float TITLE_Z = -16.0;
const float ESCAPE_R = 60.0;
const int MAX_STEPS = 220;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x),
        mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x),
        mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 4.1);
    a *= 0.5;
  }
  return v;
}

// Art-directed emission ramp: deep red, ember, gold, white-hot, blue-white.
// t is roughly temperature relative to the disk's inner edge after Doppler shift.
vec3 diskRamp(float t) {
  vec3 c = mix(vec3(0.32, 0.03, 0.01), vec3(1.0, 0.27, 0.04), smoothstep(0.08, 0.42, t));
  c = mix(c, vec3(1.0, 0.62, 0.22), smoothstep(0.38, 0.75, t));
  c = mix(c, vec3(1.0, 0.93, 0.80), smoothstep(0.75, 1.15, t));
  c = mix(c, vec3(0.70, 0.84, 1.0), smoothstep(1.2, 1.9, t));
  return c;
}

vec3 starLayer(vec3 dir, float scale, float seed) {
  vec3 p = dir * scale;
  vec3 cell = floor(p);
  vec3 local = fract(p) - 0.5;
  vec3 h = hash33(cell + seed);
  if (h.y < 0.82) return vec3(0.0);
  vec3 offset = (h - 0.5) * 0.6;
  float d = length(local - offset);
  float twinkle = 0.75 + 0.25 * sin(uTime * (1.0 + h.x * 3.0) + h.z * 40.0);
  float core = smoothstep(0.09, 0.0, d) * pow(h.x, 6.0) * 4.0 * twinkle;
  vec3 tint = mix(vec3(1.0, 0.78, 0.6), vec3(0.62, 0.78, 1.0), h.z);
  return tint * core;
}

vec3 sky(vec3 dir) {
  vec3 col = vec3(0.0);
  col += starLayer(dir, 90.0, 1.0);
  col += starLayer(dir, 170.0, 7.0) * 0.7;
  col += starLayer(dir, 320.0, 19.0) * 0.45;

  float n = fbm(dir * 2.6 + vec3(0.0, 0.0, uTime * 0.004));
  float wisps = fbm(dir * 7.0 - n * 1.5);
  float band = exp(-pow(dir.y * 2.4 - 0.35 * sin(dir.x * 2.0), 2.0));
  vec3 nebula = mix(vec3(0.05, 0.02, 0.10), vec3(0.02, 0.08, 0.13), n);
  nebula += vec3(0.20, 0.06, 0.12) * pow(wisps, 3.0) * band;
  col += nebula * (0.35 + 0.65 * band) * 0.55;
  return col;
}

// Emission and opacity where a ray pierces the disk plane at p.
vec4 diskSample(vec3 p, vec3 rayDir) {
  float r = length(p.xz);
  if (r < DISK_IN || r > DISK_OUT) return vec4(0.0);

  float angle = atan(p.z, p.x);
  float omega = 1.6 / pow(r, 1.5);
  float a = angle + uTime * omega;
  vec2 q = vec2(cos(a), sin(a)) * r;
  float turbulence = fbm(vec3(q * 1.1, r * 0.35));
  float streaks = fbm(vec3(q * 3.2, r * 2.0 + turbulence));
  float lanes = 0.72 + 0.28 * sin(r * (5.0 + 3.0 * turbulence) + turbulence * 6.0);

  float density = smoothstep(DISK_IN, DISK_IN + 0.5, r) * smoothstep(DISK_OUT, DISK_OUT - 5.5, r);
  density *= (0.25 + 0.75 * turbulence) * (0.45 + 0.55 * lanes) * (0.6 + 0.6 * streaks);

  // Keplerian orbital velocity and relativistic Doppler factor toward the camera.
  vec3 velDir = normalize(vec3(-p.z, 0.0, p.x));
  float beta = min(sqrt(0.5 / r), 0.7);
  float gamma = inversesqrt(1.0 - beta * beta);
  float doppler = 1.0 / (gamma * (1.0 - beta * dot(velDir, -rayDir)));
  float shift = doppler * sqrt(1.0 - 1.0 / r);

  float heat = pow(DISK_IN / r, 0.85);
  vec3 col = diskRamp(heat * pow(shift, 1.6) * (0.85 + 0.3 * streaks));
  float intensity = density * pow(heat, 1.15) * pow(shift, 3.0) * 5.0;
  return vec4(col * intensity, clamp(density * 1.05, 0.0, 0.94));
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  float aspect = uResolution.x / uResolution.y;
  vec3 rd = normalize(uCamBasis * vec3(ndc.x * uTanHalfFov * aspect, ndc.y * uTanHalfFov, 1.0));

  vec3 pos = uCamPos;
  vec3 vel = rd;
  vec3 angular = cross(pos, vel);
  float h2 = dot(angular, angular);

  vec3 col = vec3(0.0);
  float trans = 1.0;
  float glow = 0.0;
  float ringGlow = 0.0;
  bool captured = false;
  // Blue noise would be nicer, but a hashed start offset hides the step banding.
  float jitter = hash13(vec3(gl_FragCoord.xy, fract(uTime) * 61.0));

  for (int i = 0; i < MAX_STEPS; i++) {
    float r = length(pos);
    float dt = clamp(0.055 * r, 0.012, 1.4) * uStepScale;
    if (i == 0) dt *= jitter;

    // Exact null-geodesic bending in Cartesian form: a = -1.5 h^2 x / r^5.
    vec3 acc = -1.5 * h2 * pos / pow(r, 5.0);
    vec3 lp = pos - uLensPos;
    float lr2 = dot(lp, lp) + 0.04;
    acc -= uLensMass * lp / (lr2 * sqrt(lr2));

    vec3 prev = pos;
    vel += acc * dt;
    pos += vel * dt;
    float rNew = length(pos);

    if (rNew < 1.0) {
      captured = true;
      break;
    }

    if (prev.y * pos.y < 0.0) {
      vec3 hit = mix(prev, pos, prev.y / (prev.y - pos.y));
      vec4 d = diskSample(hit, normalize(vel));
      col += trans * d.rgb * d.a;
      trans *= 1.0 - d.a;
    }

    if (uTitleOpacity > 0.001 && prev.z > TITLE_Z && pos.z <= TITLE_Z) {
      vec3 hit = mix(prev, pos, (prev.z - TITLE_Z) / (prev.z - pos.z));
      vec2 tuv = hit.xy / uTitleSize + 0.5;
      if (tuv.x > 0.0 && tuv.x < 1.0 && tuv.y > 0.0 && tuv.y < 1.0) {
        vec4 t = texture2D(uTitle, tuv);
        float a = t.a * uTitleOpacity;
        col += trans * t.rgb * vec3(1.0, 0.94, 0.86) * a * 1.35;
        trans *= 1.0 - a * 0.92;
      }
    }

    // Thin volumetric haze hugging the disk, plus the photon ring's halo.
    float diskBand = smoothstep(DISK_IN - 0.4, DISK_IN + 1.0, rNew) * smoothstep(DISK_OUT + 2.0, DISK_IN + 2.0, rNew);
    glow += exp(-abs(pos.y) * 5.0) * diskBand * dt * 0.018 / max(rNew - 1.0, 0.3);
    ringGlow += exp(-pow((rNew - 1.5) * 7.0, 2.0)) * dt * 0.05;

    if (trans < 0.01) break;
    if (rNew > ESCAPE_R && dot(pos, vel) > 0.0) break;
  }

  if (!captured) col += trans * sky(normalize(vel)) + ringGlow * vec3(1.0, 0.7, 0.42);
  col += glow * vec3(1.0, 0.45, 0.16);

  col = aces(col * 1.1);
  col = pow(col, vec3(0.92));

  vec2 vig = vUv - 0.5;
  col *= 1.0 - dot(vig, vig) * 0.9;

  col = mix(col, vec3(1.0, 0.985, 0.96), uWhiteout);
  col = mix(col, vec3(1.0) - col, uInvert);

  gl_FragColor = vec4(col, 1.0);
}
`;
