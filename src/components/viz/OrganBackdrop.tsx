import { useEffect, useRef } from 'react';
import { mulberry32 } from '../../lib/random';
import { usePageLoaded, usePageVisible, useRafLoop, useReducedMotionPref } from '../../lib/hooks';

/** Point kinds: lung surface (cyan) and airway tree (amber). */
const LUNG = 0;
const AIRWAY = 1;
const COLORS = ['61,214,245', '255,138,61'];
const ALPHA_LEVELS = 5;
const FRAME_MS = 33;
const BREATH_MS = 5200;
const TURN_MS = 60000;

/**
 * Builds a 3D point cloud of a pair of lungs with the bronchial tree inside.
 * Returns a flat array of [x, y, z, kind] in a roughly unit-sized space.
 */
function buildLungs(count: number): Float32Array {
  const rand = mulberry32(7);
  const pts: number[] = [];
  const lungCount = Math.round(count * 0.78);

  for (let i = 0; i < lungCount; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const cap = rand() < 0.14; // points on the diaphragm-facing base
    const u = rand() * Math.PI * 2;
    const t = cap ? 0 : Math.pow(rand(), 0.85);
    const d = cap ? Math.sqrt(rand()) : 1;
    // Wide base, rounded apex.
    const r = 0.46 * Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.4))) * (0.78 + 0.22 * (1 - t));
    let lx = Math.cos(u) * r * d;
    const lz = Math.sin(u) * r * 1.25 * d;
    const medial = lx * side < 0;
    if (medial) lx *= 0.5; // flat inner face against the heart
    if (medial && side === 1 && t < 0.5 && lz > 0) lx *= 0.45; // cardiac notch
    // The base domes upward over the diaphragm.
    const y = -1 + 2.15 * t + (cap ? 0.24 * (1 - d * d) : 0);
    pts.push(side * 0.6 + lx, y, lz, LUNG);
  }

  // Airway tree: trachea, then recursive bronchi.
  const branch = (x: number, y: number, z: number, dx: number, dy: number, dz: number, len: number, depth: number) => {
    const steps = Math.max(4, Math.round(len * 46));
    const ex = x + dx * len;
    const ey = y + dy * len;
    const ez = z + dz * len;
    for (let s = 0; s < steps; s++) {
      const k = s / steps;
      pts.push(x + (ex - x) * k, y + (ey - y) * k, z + (ez - z) * k, AIRWAY);
    }
    if (depth >= 5) return;
    for (const turn of [-1, 1]) {
      const a = turn * (0.35 + rand() * 0.35);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      let nx = dx * ca - dy * sa;
      let ny = dx * sa + dy * ca;
      let nz = dz + (rand() - 0.5) * 0.9;
      const n = Math.hypot(nx, ny, nz);
      nx /= n;
      ny /= n;
      nz /= n;
      branch(ex, ey, ez, nx, ny, nz, len * 0.7, depth + 1);
    }
  };
  for (let s = 0; s < 30; s++) pts.push(0, 1.3 - (s / 30) * 0.65, 0, AIRWAY);
  branch(0, 0.65, 0, 0.62, -0.78, 0, 0.42, 1);
  branch(0, 0.65, 0, -0.62, -0.78, 0, 0.42, 1);

  return new Float32Array(pts);
}

/**
 * Fixed, faint background: a slowly turning, breathing 3D pair of lungs drawn
 * as a point cloud on a 2D canvas (no 3D library, works offline).
 */
export function OrganBackdrop() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const points = useRef<Float32Array | null>(null);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const last = useRef(0);
  // Pointer position in -1..1, and a smoothed copy, so the lungs lean toward the mouse.
  const aim = useRef({ x: 0, y: 0 });
  const lean = useRef({ x: 0, y: 0 });
  const loaded = usePageLoaded();
  const visible = usePageVisible();
  const reduced = useReducedMotionPref();

  const draw = (time: number) => {
    const el = canvas.current;
    const pts = points.current;
    const ctx = el?.getContext('2d');
    if (!el || !pts || !ctx) return;
    const { w, h, dpr } = size.current;

    lean.current.x += (aim.current.x - lean.current.x) * 0.06;
    lean.current.y += (aim.current.y - lean.current.y) * 0.06;
    const angle = (time / TURN_MS) * Math.PI * 2 + 0.6 + lean.current.x * 0.7;
    const breath = 1 + 0.04 * Math.sin((time / BREATH_MS) * Math.PI * 2);
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const tilt = 0.18 + lean.current.y * 0.3;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const scale = Math.min(h * 0.27, w * 0.3) * dpr;
    const cx = w * 0.5 * dpr;
    const cy = h * 0.52 * dpr;
    const cam = 3.4;

    ctx.clearRect(0, 0, el.width, el.height);
    ctx.globalCompositeOperation = 'lighter';
    const n = pts.length / 4;
    const sx = new Float32Array(n);
    const sy = new Float32Array(n);
    const lvl = new Uint8Array(n);
    const sz = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      const kind = pts[o + 3];
      const swell = kind === LUNG ? breath : 1 + (breath - 1) * 0.5;
      const x0 = pts[o] * swell;
      const y0 = pts[o + 1] * (1 + (swell - 1) * 0.5);
      const z0 = pts[o + 2] * swell;
      // Turn around the vertical axis, then tilt toward the viewer.
      const x1 = x0 * ca + z0 * sa;
      const z1 = -x0 * sa + z0 * ca;
      const y2 = y0 * ct - z1 * st;
      const z2 = y0 * st + z1 * ct;
      const f = cam / (cam + z2);
      sx[i] = cx + x1 * f * scale;
      sy[i] = cy - y2 * f * scale;
      const depth = Math.min(1, Math.max(0, (1.2 - z2) / 2.4)); // 1 = nearest
      lvl[i] = Math.min(ALPHA_LEVELS - 1, Math.floor(depth * ALPHA_LEVELS));
      sz[i] = (kind === AIRWAY ? 2.2 : 1.9) * f * dpr;
    }
    for (let kind = 0; kind < 2; kind++) {
      for (let l = 0; l < ALPHA_LEVELS; l++) {
        const a = (kind === AIRWAY ? 0.35 : 0.22) + (l / (ALPHA_LEVELS - 1)) * (kind === AIRWAY ? 0.55 : 0.5);
        ctx.fillStyle = `rgba(${COLORS[kind]},${a.toFixed(3)})`;
        for (let i = 0; i < n; i++) {
          if (lvl[i] !== l || pts[i * 4 + 3] !== kind) continue;
          const s = sz[i];
          ctx.fillRect(sx[i] - s / 2, sy[i] - s / 2, s, s);
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  useEffect(() => {
    if (!loaded) return;
    const el = canvas.current;
    if (!el) return;
    points.current ??= buildLungs(window.innerWidth < 768 ? 1700 : 3200);
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = window.innerWidth;
      const h = window.innerHeight;
      size.current = { w, h, dpr };
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      draw(performance.now());
    };
    resize();
    const onPointer = (e: PointerEvent) => {
      aim.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
    };
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useRafLoop((time) => {
    if (time - last.current < FRAME_MS) return;
    last.current = time;
    draw(time);
  }, loaded && visible && !reduced);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className={`organ-backdrop pointer-events-none fixed inset-0 h-full w-full transition-opacity duration-1000 ${
        loaded ? 'opacity-60' : 'opacity-0'
      }`}
    />
  );
}
