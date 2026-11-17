/**
 * Reproducibly derives every shipped texture from raw downloads in assets-src/raw
 * (git-ignored). Run: node --max-old-space-size=8192 scripts/build-textures.mjs
 *
 * Raw inputs and where they come from are listed in RAW below and credited in
 * public/textures/credits.json. Nothing here touches scientific data.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { FloatType } from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

const RAW = 'assets-src/raw';
const OUT = 'public/textures';
const SSS = 'https://www.solarsystemscope.com/textures/download/';
export const SOURCES = {
  '8k_earth_daymap.jpg': SSS + '8k_earth_daymap.jpg',
  '8k_earth_clouds.jpg': SSS + '8k_earth_clouds.jpg',
  '8k_earth_nightmap.jpg': SSS + '8k_earth_nightmap.jpg',
  '8k_earth_normal_map.tif': SSS + '8k_earth_normal_map.tif',
  '8k_earth_specular_map.tif': SSS + '8k_earth_specular_map.tif',
  '8k_moon.jpg': SSS + '8k_moon.jpg',
  '8k_mars.jpg': SSS + '8k_mars.jpg',
  '8k_mercury.jpg': SSS + '8k_mercury.jpg',
  '8k_saturn_ring_alpha.png': SSS + '8k_saturn_ring_alpha.png',
  'ldem_16_uint.tif':
    'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_16_uint.tif',
  'megt90n000eb.img':
    'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/megt90n000eb.img',
  'milkyway_2020_8k_gal.exr':
    'https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/milkyway_2020_8k_gal.exr',
};
const raw = (name) => {
  const path = join(RAW, name);
  if (!existsSync(path))
    throw new Error(`Missing ${path}; download it from ${SOURCES[name]}`);
  return path;
};
const only = new Set(process.argv.slice(2));
const wanted = (name) => only.size === 0 || only.has(name);
const log = (name, info) =>
  console.log(
    `${name.padEnd(22)} ${info.width}x${info.height} ${(info.size / 1e6).toFixed(2)} MB`,
  );

const W4 = 4096,
  H4 = 2048;
async function jpg(src, name, width, quality = 88, extra = (s) => s) {
  if (!wanted(name)) return;
  const info = await extra(sharp(src, { limitInputPixels: false }))
    .resize(width, width / 2, { kernel: 'lanczos3' })
    .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(join(OUT, name));
  log(name, info);
}
async function webp(src, name, width, quality = 84, extra = (s) => s) {
  if (!wanted(name)) return;
  const info = await extra(sharp(src, { limitInputPixels: false }))
    .resize(width, width / 2, { kernel: 'lanczos3' })
    .webp({ quality, effort: 5, smartSubsample: true })
    .toFile(join(OUT, name));
  log(name, info);
}
const gray = (s) => s.greyscale();

/** Height grid (Float32Array) resampled to w×h with bilinear filtering. */
function resample(src, sw, sh, w, h) {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = Math.min(sh - 1.001, ((y + 0.5) * sh) / h - 0.5);
    const y0 = Math.max(0, Math.floor(fy)),
      ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = ((x + 0.5) * sw) / w - 0.5;
      const x0 = Math.floor(fx),
        tx = fx - x0;
      const a = (((x0 % sw) + sw) % sw) + y0 * sw,
        b = ((((x0 + 1) % sw) + sw) % sw) + y0 * sw;
      const top = src[a] * (1 - tx) + src[b] * tx;
      const bottom = src[a + sw] * (1 - tx) + src[b + sw] * tx;
      out[y * w + x] = top * (1 - ty) + bottom * ty;
    }
  }
  return out;
}
function roll(h, w, rows, shift) {
  if (!shift) return h;
  const out = new Float32Array(h.length);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < w; x++) out[y * w + ((x + shift) % w)] = h[y * w + x];
  return out;
}
/** Mean |∇| correlation between a height grid and the albedo's luminance edges. */
async function edgeCorrelation(height, w, h, albedoPath) {
  const { data } = await sharp(albedoPath, { limitInputPixels: false })
    .greyscale()
    .resize(w, h)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const grad = (get) => {
    const g = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++)
      for (let x = 0; x < w; x++) {
        const dx = get((x + 1) % w, y) - get((x + w - 1) % w, y),
          dy = get(x, y + 1) - get(x, y - 1);
        g[y * w + x] = Math.hypot(dx, dy);
      }
    return g;
  };
  const a = grad((x, y) => height[y * w + x]),
    b = grad((x, y) => data[y * w + x]);
  const score = (shift) => {
    let s = 0;
    for (let y = h / 8; y < (7 * h) / 8; y++)
      for (let x = 0; x < w; x++)
        s += a[y * w + ((x + shift) % w)] * b[y * w + x];
    return s;
  };
  return { none: score(0), half: score(w / 2) };
}
/**
 * Tangent-space normal map (+X east, +Y north, +Z out) from an equirectangular
 * height grid. Slopes are normalised by their 98th percentile so relief reads at
 * the scale the world is shown, then exaggerated by `strength`.
 */
async function normalMap(height, w, h, name, strength) {
  if (!wanted(name)) return;
  const slopes = new Float32Array(w * h * 2);
  const mags = [];
  for (let y = 0; y < h; y++) {
    const lat = ((y + 0.5) / h - 0.5) * Math.PI,
      c = Math.max(0.3, Math.cos(lat));
    const up = Math.max(0, y - 1),
      down = Math.min(h - 1, y + 1);
    for (let x = 0; x < w; x++) {
      const east =
        (height[y * w + ((x + 1) % w)] - height[y * w + ((x + w - 1) % w)]) /
        (2 * c);
      const north = (height[up * w + x] - height[down * w + x]) / (down - up);
      slopes[(y * w + x) * 2] = east;
      slopes[(y * w + x) * 2 + 1] = north;
      if ((x + y * 7) % 13 === 0) mags.push(Math.hypot(east, north));
    }
  }
  mags.sort((a, b) => a - b);
  const p98 = mags[Math.floor(mags.length * 0.98)] || 1;
  const k = strength / p98;
  const out = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const nx = -slopes[i * 2] * k,
      ny = -slopes[i * 2 + 1] * k,
      l = Math.hypot(nx, ny, 1);
    out[i * 3] = Math.round(((nx / l) * 0.5 + 0.5) * 255);
    out[i * 3 + 1] = Math.round(((ny / l) * 0.5 + 0.5) * 255);
    out[i * 3 + 2] = Math.round(((1 / l) * 0.5 + 0.5) * 255);
  }
  const info = await sharp(out, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toFile(join(OUT, name));
  log(name, info);
}
async function terrain(name, height, sw, sh, albedo, strength) {
  if (!wanted(name)) return;
  const w = W4,
    h = H4;
  let grid = resample(height, sw, sh, w, h);
  // Align longitude origin with the colour map instead of assuming a convention.
  const small = resample(height, sw, sh, 512, 256);
  const { none, half } = await edgeCorrelation(small, 512, 256, albedo);
  const shift = half > none * 1.05 ? w / 2 : 0;
  console.log(
    `${name}: edge correlation none=${none.toExponential(3)} half=${half.toExponential(3)} → shift ${shift}`,
  );
  grid = roll(grid, w, h, shift);
  await normalMap(grid, w, h, name, strength);
}

// Earth: one source for base and hero maps so the 8K swap never shifts colour.
await jpg(raw('8k_earth_daymap.jpg'), 'earth.jpg', W4);
await webp(raw('8k_earth_daymap.jpg'), 'earth-8k.webp', 8192, 86);
await jpg(raw('8k_earth_nightmap.jpg'), 'night.jpg', W4, 86);
await jpg(raw('8k_earth_clouds.jpg'), 'clouds.jpg', W4, 86, gray);
await webp(raw('8k_earth_clouds.jpg'), 'clouds-8k.webp', 8192, 80, gray);
await jpg(raw('8k_earth_normal_map.tif'), 'earth-normal.jpg', W4, 92);
await jpg(raw('8k_earth_specular_map.tif'), 'earth-specular.jpg', W4, 86, gray);
// Rocky worlds: 8K hero colour; 4K base files stay as shipped.
await webp(raw('8k_moon.jpg'), 'moon-8k.webp', 8192, 74);
await webp(raw('8k_mars.jpg'), 'mars-8k.webp', 8192, 84);
await webp(raw('8k_mercury.jpg'), 'mercury-8k.webp', 8192, 74);

if (wanted('moon-normal.jpg')) {
  // LOLA LDEM 16 px/deg, unsigned half-metre steps; only relative height matters.
  const { data, info } = await sharp(raw('ldem_16_uint.tif'), {
    limitInputPixels: false,
  })
    .toColourspace('grey16')
    .raw({ depth: 'ushort' })
    .toBuffer({ resolveWithObject: true });
  const u16 = new Uint16Array(
    data.buffer,
    data.byteOffset,
    info.width * info.height,
  );
  await terrain(
    'moon-normal.jpg',
    Float32Array.from(u16),
    info.width,
    info.height,
    raw('8k_moon.jpg'),
    0.55,
  );
}
if (wanted('mars-normal.jpg')) {
  // MOLA MEGDR 16 px/deg, big-endian int16 metres, longitude 0°E at the left edge.
  const buf = readFileSync(raw('megt90n000eb.img'));
  const w = 5760,
    h = 2880,
    grid = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) grid[i] = buf.readInt16BE(i * 2);
  await terrain('mars-normal.jpg', grid, w, h, raw('8k_mars.jpg'), 0.6);
}
if (wanted('saturn-rings.png')) {
  // Radial profile strip: keep full radial resolution, collapse the arbitrary height.
  const info = await sharp(raw('8k_saturn_ring_alpha.png'))
    .resize(4096, 4, { kernel: 'lanczos3', fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, 'saturn-rings.png'));
  log('saturn-rings.png', info);
}
if (wanted('milkyway.jpg') || wanted('milkyway-8k.webp')) {
  // NASA SVS Deep Star Maps 2020, diffuse Milky Way in galactic coordinates
  // (galactic centre at the image centre). Linear radiance → 8-bit sRGB with a
  // fixed gain so the shader can restore linear values and apply exposure.
  const buf = readFileSync(raw('milkyway_2020_8k_gal.exr'));
  const loader = new EXRLoader();
  loader.setDataType(FloatType);
  const exr = loader.parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  );
  const { width: w, height: h, data } = exr;
  const lum = [];
  for (let i = 0; i < w * h; i += 101)
    lum.push(data[i * 4] * 0.3 + data[i * 4 + 1] * 0.6 + data[i * 4 + 2] * 0.1);
  lum.sort((a, b) => a - b);
  const white = lum[Math.floor(lum.length * 0.9995)];
  console.log(
    `milkyway: 99.95th percentile ${white.toFixed(4)} → gain ${(1 / white).toFixed(2)} (record in MILKY_WAY_GAIN)`,
  );
  const out = Buffer.alloc(w * h * 3);
  const srgb = (v) => {
    v = Math.min(1, Math.max(0, v / white));
    return Math.round(
      255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055),
    );
  };
  // EXR rows are bottom-up; images are top-down.
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = ((h - 1 - y) * w + x) * 4,
        d = (y * w + x) * 3;
      out[d] = srgb(data[s]);
      out[d + 1] = srgb(data[s + 1]);
      out[d + 2] = srgb(data[s + 2]);
    }
  const image = () => sharp(out, { raw: { width: w, height: h, channels: 3 } });
  if (wanted('milkyway.jpg')) {
    const info = await image()
      .resize(W4, H4, { kernel: 'lanczos3' })
      .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toFile(join(OUT, 'milkyway.jpg'));
    log('milkyway.jpg', info);
  }
  if (wanted('milkyway-8k.webp')) {
    const info = await image()
      .webp({ quality: 80, effort: 5 })
      .toFile(join(OUT, 'milkyway-8k.webp'));
    log('milkyway-8k.webp', info);
  }
}
