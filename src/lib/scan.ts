import { rgb } from './theme';
import { clamp, gaussianTable, lerp, mulberry32 } from './random';

/**
 * Procedural, stylised chest X-ray (PA view). Nothing here is real patient
 * data: every scan is drawn from a handful of seeded shape parameters.
 */
export interface ScanParams {
  lungW: number;
  lungH: number;
  heart: number;
  ribGap: number;
  tilt: number;
  /** Framing: patient size and position on the detector */
  zoom: number;
  dx: number;
  dy: number;
  exposure: number;
  /** 0 = clear lungs, 1 = strong pneumonia-like opacity */
  opacity: number;
  patchSide: -1 | 1;
  patchSeed: number;
  vesselSeed: number;
}

export function paramsFromSeed(seed: number, opacity?: number): ScanParams {
  const r = mulberry32(seed * 9973 + 17);
  return {
    lungW: lerp(0.86, 1.1, r()),
    lungH: lerp(0.92, 1.06, r()),
    heart: lerp(0.82, 1.25, r()),
    ribGap: lerp(0.94, 1.06, r()),
    tilt: lerp(-0.06, 0.06, r()),
    zoom: lerp(0.84, 1.08, r()),
    dx: lerp(-0.05, 0.05, r()),
    dy: lerp(-0.05, 0.04, r()),
    exposure: lerp(0.8, 1, r()),
    opacity: opacity ?? lerp(0.35, 1, r()),
    patchSide: r() > 0.5 ? 1 : -1,
    patchSeed: Math.floor(r() * 1e6),
    vesselSeed: Math.floor(r() * 1e6),
  };
}

/** Seeded scan with neutral, centred framing (for single hero-style images). */
export function centredParams(seed: number, opacity?: number): ScanParams {
  return { ...paramsFromSeed(seed, opacity), zoom: 1, dx: 0, dy: 0, tilt: 0, exposure: 1 };
}

/** Nudge a parameter set slightly (used for "collapsed" near-duplicates). */
export function jitterParams(p: ScanParams, seed: number, amount = 0.015): ScanParams {
  const r = mulberry32(seed);
  const j = () => (r() - 0.5) * 2 * amount;
  return {
    ...p,
    lungW: p.lungW + j(),
    lungH: p.lungH + j(),
    heart: p.heart + j(),
    tilt: p.tilt + j() * 0.3,
    exposure: clamp(p.exposure + j(), 0.8, 1),
  };
}

const [BR, BG, BB] = rgb.bone;
const [KR, KG, KB] = rgb.bg;
const bone = (a: number) => `rgba(${BR},${BG},${BB},${a})`;
const dark = (a: number) => `rgba(${KR},${KG},${KB},${a})`;

/** Fill the current path several times at shrinking scale to fake a feathered edge. */
function feather(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  steps: number,
  shrink: number,
  build: () => void,
) {
  for (let k = 0; k < steps; k++) {
    const s = 1 - k * shrink;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    ctx.beginPath();
    build();
    ctx.fill();
    ctx.restore();
  }
}

export function drawScan(ctx: CanvasRenderingContext2D, w: number, h: number, p: ScanParams) {
  const cx = w / 2;
  ctx.save();
  ctx.fillStyle = dark(1);
  ctx.fillRect(0, 0, w, h);

  ctx.translate(cx + p.dx * w, h / 2 + p.dy * h);
  ctx.rotate(p.tilt);
  ctx.scale(p.zoom, p.zoom);
  ctx.translate(-cx, -h / 2);

  // Soft tissue: torso, shoulders, neck, abdomen
  const torso = ctx.createRadialGradient(cx, h * 0.5, 0, cx, h * 0.55, w * 0.62);
  torso.addColorStop(0, bone(0.3));
  torso.addColorStop(0.7, bone(0.22));
  torso.addColorStop(1, bone(0));
  ctx.fillStyle = torso;
  ctx.beginPath();
  ctx.ellipse(cx, h * 0.6, w * 0.5, h * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const s of [-1, 1]) {
    const sx = cx + s * w * 0.44;
    const g = ctx.createRadialGradient(sx, h * 0.26, 0, sx, h * 0.26, w * 0.16);
    g.addColorStop(0, bone(0.22));
    g.addColorStop(1, bone(0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(sx, h * 0.26, w * 0.16, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = bone(0.05);
  feather(ctx, cx, h * 0.07, 4, 0.06, () => ctx.rect(cx - w * 0.1, -h * 0.05, w * 0.2, h * 0.22));

  const abdomen = ctx.createLinearGradient(0, h * 0.66, 0, h);
  abdomen.addColorStop(0, bone(0));
  abdomen.addColorStop(0.35, bone(0.16));
  abdomen.addColorStop(1, bone(0.2));
  ctx.fillStyle = abdomen;
  ctx.fillRect(w * 0.06, h * 0.66, w * 0.88, h * 0.34);

  // Lung fields (radiolucent, so darker)
  for (const s of [-1, 1] as const) {
    const medialBase = s < 0 ? 0.08 : 0.15; // heart sits on image-right
    const baseY = h * 0.74 * p.lungH;
    const lcx = cx + s * w * 0.21;
    const lcy = h * 0.44;
    const shape = () => {
      ctx.moveTo(cx + s * w * 0.07, h * 0.21);
      ctx.bezierCurveTo(cx + s * w * 0.08, h * 0.15, cx + s * w * 0.14, h * 0.13, cx + s * w * 0.18, h * 0.135);
      ctx.bezierCurveTo(
        cx + s * w * 0.32 * p.lungW,
        h * 0.15,
        cx + s * w * 0.41 * p.lungW,
        h * 0.48,
        cx + s * w * 0.38 * p.lungW,
        baseY,
      );
      ctx.quadraticCurveTo(cx + s * w * 0.24, h * 0.6 * p.lungH, cx + s * w * medialBase, h * 0.66);
      ctx.quadraticCurveTo(cx + s * w * 0.075, h * 0.42, cx + s * w * 0.07, h * 0.21);
      ctx.closePath();
    };
    const g = ctx.createRadialGradient(lcx, lcy, 0, lcx, lcy, w * 0.3);
    g.addColorStop(0, dark(0.42));
    g.addColorStop(1, dark(0.2));
    ctx.fillStyle = g;
    feather(ctx, lcx, lcy, 5, 0.035, shape);
  }

  // Vascular markings fanning out from each hilum
  const vr = mulberry32(p.vesselSeed);
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    const hx = cx + s * w * 0.1;
    const hy = h * 0.42;
    for (let i = 0; i < 9; i++) {
      const ang = lerp(-1.1, 1.1, vr()) + (s < 0 ? Math.PI : 0);
      const len = w * lerp(0.08, 0.2, vr());
      ctx.strokeStyle = bone(lerp(0.05, 0.11, vr()));
      ctx.lineWidth = w * lerp(0.003, 0.007, vr());
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(
        hx + Math.cos(ang) * len * 0.5 + (vr() - 0.5) * w * 0.04,
        hy + Math.sin(ang) * len * 0.5,
        hx + Math.cos(ang) * len,
        hy + Math.sin(ang) * len,
      );
      ctx.stroke();
    }
  }

  // Mediastinum and heart
  ctx.fillStyle = bone(0.05);
  feather(ctx, cx, h * 0.38, 5, 0.05, () => ctx.rect(cx - w * 0.07, h * 0.12, w * 0.14, h * 0.5));
  ctx.fillStyle = bone(0.07);
  const hx = cx + w * 0.055;
  const hy = h * 0.6;
  feather(ctx, hx, hy, 5, 0.06, () =>
    ctx.ellipse(hx, hy, w * 0.16 * p.heart, h * 0.115 * p.heart, -0.32, 0, Math.PI * 2),
  );

  // Spine
  ctx.fillStyle = bone(0.1);
  for (let y = h * 0.06; y < h; y += h * 0.046) {
    ctx.beginPath();
    ctx.roundRect(cx - w * 0.038, y, w * 0.076, h * 0.036, w * 0.012);
    ctx.fill();
  }

  // Ribs: posterior arcs (brighter) and anterior arcs (fainter)
  for (let i = 0; i < 10; i++) {
    const y = h * (0.17 + i * 0.052 * p.ribGap);
    for (const s of [-1, 1]) {
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(cx + s * w * 0.045, y);
        ctx.bezierCurveTo(
          cx + s * w * 0.2,
          y - h * 0.048,
          cx + s * w * 0.36 * p.lungW,
          y - h * 0.02,
          cx + s * w * 0.41 * p.lungW,
          y + h * (0.065 + i * 0.004),
        );
      };
      path();
      ctx.strokeStyle = bone(0.1);
      ctx.lineWidth = w * 0.024;
      ctx.stroke();
      ctx.strokeStyle = bone(0.13);
      ctx.lineWidth = w * 0.007;
      ctx.stroke();

      if (i < 6) {
        ctx.beginPath();
        ctx.moveTo(cx + s * w * 0.39 * p.lungW, y + h * 0.03);
        ctx.quadraticCurveTo(cx + s * w * 0.26, y + h * 0.06, cx + s * w * 0.12, y + h * 0.13);
        ctx.strokeStyle = bone(0.055);
        ctx.lineWidth = w * 0.018;
        ctx.stroke();
      }
    }
  }

  // Clavicles
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * w * 0.05, h * 0.15);
    ctx.bezierCurveTo(cx + s * w * 0.18, h * 0.175, cx + s * w * 0.28, h * 0.1, cx + s * w * 0.42, h * 0.1);
    ctx.strokeStyle = bone(0.26);
    ctx.lineWidth = w * 0.03;
    ctx.stroke();
  }

  // Pneumonia-like consolidation patches in the lower zone of one lung
  if (p.opacity > 0.01) {
    const pr = mulberry32(p.patchSeed);
    const count = 4 + Math.floor(pr() * 3);
    for (let i = 0; i < count; i++) {
      const px = cx + p.patchSide * w * lerp(0.15, 0.32, pr());
      const py = h * lerp(0.42, 0.64, pr());
      const rad = w * lerp(0.05, 0.11, pr());
      const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, bone(0.28 * p.opacity));
      g.addColorStop(1, bone(0));
      ctx.fillStyle = g;
      ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
  }
  ctx.restore();

  // Exposure and vignette (applied in screen space)
  if (p.exposure < 1) {
    ctx.fillStyle = dark(1 - p.exposure);
    ctx.fillRect(0, 0, w, h);
  }
  const vig = ctx.createRadialGradient(cx, h / 2, Math.min(w, h) * 0.35, cx, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, dark(0));
  vig.addColorStop(1, dark(0.75));
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Film side marker
  ctx.fillStyle = bone(0.55);
  ctx.font = `600 ${Math.round(w * 0.06)}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillText('R', w * 0.06, h * 0.08);
}

/** Add monochrome film grain to whatever is on the canvas. */
function addGrain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, seed: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const r = mulberry32(seed);
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

let scratch: HTMLCanvasElement | null = null;
const NOISE_SIZE = 1 << 16;
let noise: Float32Array | null = null;

/**
 * Draw what a generator might output at a given training quality:
 * q = 0 is pure noise, q = 1 is a crisp scan. Low quality renders the scan
 * at a tiny resolution, upsamples it (blur) and mixes in Gaussian noise.
 */
export function drawGenerated(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: ScanParams,
  q: number,
  seed: number,
) {
  const quality = clamp(q);
  if (quality >= 0.995) {
    drawScan(ctx, w, h, p);
    addGrain(ctx, w, h, 10, seed);
    return;
  }
  scratch ??= document.createElement('canvas');
  const sw = Math.max(4, Math.round(lerp(5, w, Math.pow(quality, 1.7))));
  const sh = Math.max(5, Math.round((sw * h) / w));
  scratch.width = sw;
  scratch.height = sh;
  const sctx = scratch.getContext('2d');
  if (!sctx) return;
  drawScan(sctx, sw, sh, p);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(scratch, 0, 0, w, h);

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  noise ??= gaussianTable(NOISE_SIZE);
  const offset = Math.floor(mulberry32(seed)() * NOISE_SIZE);
  const mix = Math.pow(1 - quality, 1.3) * 0.92;
  for (let i = 0; i < d.length; i += 4) {
    const n = clamp(0.42 + noise[((i >> 2) + offset) & (NOISE_SIZE - 1)] * 0.22);
    d[i] = lerp(d[i], KR + (BR - KR) * n, mix);
    d[i + 1] = lerp(d[i + 1], KG + (BG - KG) * n, mix);
    d[i + 2] = lerp(d[i + 2], KB + (BB - KB) * n, mix);
  }
  ctx.putImageData(img, 0, 0);
}
