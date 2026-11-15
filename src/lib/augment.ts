import { clamp, mulberry32 } from './random';

/** User-facing augmentation settings. Ranges are symmetric (± value). */
export interface AugSettings {
  flipH: boolean;
  flipV: boolean;
  rotate: number; // degrees, ±
  zoom: number; // fraction, ± (0.15 = 85%–115%)
  shift: number; // fraction of size, ±
  brightness: number; // fraction, ±
  contrast: number; // fraction, ±
  noise: number; // Gaussian sigma in 0–255 units (max)
  blur: number; // px (max)
  grayscale: boolean;
  size: number; // output square size, px
  count: number;
  seed: number;
}

/** One concrete draw of random values for a single output image. */
export interface AugParams {
  flipH: boolean;
  flipV: boolean;
  rotate: number;
  zoom: number;
  shiftX: number;
  shiftY: number;
  brightness: number;
  contrast: number;
  noise: number;
  blur: number;
}

export const DEFAULT_SETTINGS: AugSettings = {
  flipH: true,
  flipV: false,
  rotate: 10,
  zoom: 0.1,
  shift: 0.05,
  brightness: 0.15,
  contrast: 0.15,
  noise: 6,
  blur: 0,
  grayscale: true,
  size: 256,
  count: 12,
  seed: 42,
};

export const PRESETS: { id: string; label: string; hint: string; settings: Partial<AugSettings> }[] = [
  {
    id: 'medical',
    label: 'Medical-safe',
    hint: 'Small, realistic changes that keep anatomy plausible',
    settings: { flipH: true, flipV: false, rotate: 10, zoom: 0.1, shift: 0.05, brightness: 0.15, contrast: 0.15, noise: 6, blur: 0 },
  },
  {
    id: 'strong',
    label: 'Strong',
    hint: 'Bigger variety for robustness testing',
    settings: { flipH: true, flipV: false, rotate: 25, zoom: 0.25, shift: 0.12, brightness: 0.3, contrast: 0.3, noise: 14, blur: 1.2 },
  },
  {
    id: 'lighting',
    label: 'Lighting only',
    hint: 'Exposure and noise changes, no geometry',
    settings: { flipH: false, flipV: false, rotate: 0, zoom: 0, shift: 0, brightness: 0.3, contrast: 0.3, noise: 10, blur: 0.8 },
  },
];

function gaussian(rand: () => number): number {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Random values for image `index`, reproducible from the settings' seed. */
export function sampleParams(s: AugSettings, index: number): AugParams {
  const rand = mulberry32(s.seed * 7919 + index * 104729 + 1);
  const sym = (range: number) => (rand() * 2 - 1) * range;
  return {
    flipH: s.flipH && rand() < 0.5,
    flipV: s.flipV && rand() < 0.5,
    rotate: sym(s.rotate),
    zoom: 1 + sym(s.zoom),
    shiftX: sym(s.shift),
    shiftY: sym(s.shift),
    brightness: sym(s.brightness),
    contrast: sym(s.contrast),
    noise: s.noise * rand(),
    blur: s.blur * rand(),
  };
}

/** Human-readable summary of what was applied. */
export function describe(p: AugParams): string {
  const parts: string[] = [];
  if (p.flipH) parts.push('flipped ↔');
  if (p.flipV) parts.push('flipped ↕');
  if (Math.abs(p.rotate) >= 0.5) parts.push(`rotated ${p.rotate > 0 ? '+' : ''}${p.rotate.toFixed(0)}°`);
  if (Math.abs(p.zoom - 1) >= 0.01) parts.push(`zoom ${(p.zoom * 100).toFixed(0)}%`);
  if (Math.abs(p.shiftX) + Math.abs(p.shiftY) >= 0.01) parts.push('shifted');
  if (Math.abs(p.brightness) >= 0.01) parts.push(`brightness ${p.brightness > 0 ? '+' : ''}${(p.brightness * 100).toFixed(0)}%`);
  if (Math.abs(p.contrast) >= 0.01) parts.push(`contrast ${p.contrast > 0 ? '+' : ''}${(p.contrast * 100).toFixed(0)}%`);
  if (p.noise >= 0.5) parts.push(`noise σ${p.noise.toFixed(0)}`);
  if (p.blur >= 0.1) parts.push(`blur ${p.blur.toFixed(1)}px`);
  return parts.length ? parts.join(' · ') : 'no change';
}

const supportsFilter = (() => {
  try {
    const c = document.createElement('canvas').getContext('2d');
    return !!c && 'filter' in c;
  } catch {
    return false;
  }
})();

/**
 * Draws one augmented copy of `src` into a new square canvas.
 * Geometry (flip, rotate, zoom, shift) uses canvas transforms; tone changes
 * and noise are applied per pixel so results match across browsers.
 */
export function renderAugmented(
  src: CanvasImageSource,
  srcW: number,
  srcH: number,
  p: AugParams,
  s: AugSettings,
  index: number,
): HTMLCanvasElement {
  const size = s.size;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);

  // "Cover" fit: fill the square, cropping the longer side.
  const cover = Math.max(size / srcW, size / srcH);
  ctx.save();
  if (supportsFilter && p.blur >= 0.1) ctx.filter = `blur(${p.blur.toFixed(2)}px)`;
  ctx.translate(size / 2 + p.shiftX * size, size / 2 + p.shiftY * size);
  ctx.rotate((p.rotate * Math.PI) / 180);
  ctx.scale(cover * p.zoom * (p.flipH ? -1 : 1), cover * p.zoom * (p.flipV ? -1 : 1));
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, -srcW / 2, -srcH / 2, srcW, srcH);
  ctx.restore();

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rand = mulberry32(s.seed * 31 + index * 977 + 5);
  const b = p.brightness * 255;
  const c = 1 + p.contrast;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let bl = d[i + 2];
    if (s.grayscale) r = g = bl = 0.299 * r + 0.587 * g + 0.114 * bl;
    const n = p.noise > 0 ? gaussian(rand) * p.noise : 0;
    if (s.grayscale) {
      const v = clamp((r - 128) * c + 128 + b + n, 0, 255);
      d[i] = d[i + 1] = d[i + 2] = v;
    } else {
      d[i] = clamp((r - 128) * c + 128 + b + n, 0, 255);
      d[i + 1] = clamp((g - 128) * c + 128 + b + n, 0, 255);
      d[i + 2] = clamp((bl - 128) * c + 128 + b + n, 0, 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Shrinks very large uploads so augmenting stays fast. */
export function prepareSource(img: HTMLImageElement, max = 1024): HTMLCanvasElement {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * scale));
  c.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** CSV with one row per output image, so the dataset is reproducible. */
export function paramsCsv(rows: { name: string; p: AugParams }[]): string {
  const head = 'file,flip_h,flip_v,rotate_deg,zoom,shift_x,shift_y,brightness,contrast,noise_sigma,blur_px';
  const lines = rows.map(({ name, p }) =>
    [
      name,
      p.flipH ? 1 : 0,
      p.flipV ? 1 : 0,
      p.rotate.toFixed(2),
      p.zoom.toFixed(3),
      p.shiftX.toFixed(3),
      p.shiftY.toFixed(3),
      p.brightness.toFixed(3),
      p.contrast.toFixed(3),
      p.noise.toFixed(2),
      p.blur.toFixed(2),
    ].join(','),
  );
  return [head, ...lines].join('\n') + '\n';
}
