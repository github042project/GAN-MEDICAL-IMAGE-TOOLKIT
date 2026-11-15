import { useEffect, useMemo, useRef } from 'react';
import { centredParams, drawScan } from '../../lib/scan';
import { gaussianTable, smoothstep } from '../../lib/random';
import { rgb } from '../../lib/theme';
import { useInView, usePageLoaded, usePageVisible, useRafLoop, useReducedMotionPref } from '../../lib/hooks';

const W = 240;
const H = 288;
const CYCLE = 10000; // ms
const TABLE = 1 << 16;
const FRAME_MS = 32;

/** Resolve amount (0 = noise, 1 = scan) over one loop of the animation. */
function phase(ms: number): number {
  const t = (ms % CYCLE) / CYCLE;
  if (t < 0.1) return 0;
  if (t < 0.6) return smoothstep((t - 0.1) / 0.5);
  if (t < 0.88) return 1;
  return 1 - smoothstep((t - 0.88) / 0.12);
}

/**
 * Hero canvas: Gaussian noise gradually resolving into a procedural chest
 * X-ray, outward from the centre, the way a generator's samples sharpen.
 */
export function NoiseToScan() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotionPref();
  const inView = useInView(wrap);
  const pageVisible = usePageVisible();
  const loaded = usePageLoaded();

  const data = useMemo(() => {
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    drawScan(ctx, W, H, centredParams(3, 0.5));
    const src = ctx.getImageData(0, 0, W, H).data;
    const lum = new Float32Array(W * H);
    const delay = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      lum[i] = src[i * 4] / 255;
      const x = (i % W) / W - 0.5;
      const y = Math.floor(i / W) / H - 0.5;
      delay[i] = Math.min(1, Math.hypot(x, y * 0.9) * 1.6);
    }
    return { lum, delay, noise: gaussianTable(TABLE), image: new ImageData(W, H) };
  }, []);

  const lastFrame = useRef(-Infinity);
  const render = (ms: number) => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !data) return;
    // ~30 fps is plenty for film grain and halves the per-frame pixel work.
    if (ms - lastFrame.current < FRAME_MS) return;
    lastFrame.current = ms;
    const { lum, delay, noise, image } = data;
    const t = reduced ? 1 : phase(ms);
    const out = image.data;
    const [kr, kg, kb] = rgb.bg;
    const [br, bg, bb] = rgb.bone;
    const offset = (Math.random() * TABLE) | 0;
    for (let i = 0; i < W * H; i++) {
      // Pixels near the centre resolve first.
      const local = smoothstep(t * 1.6 - delay[i] * 0.6);
      const n = noise[(i + offset) & (TABLE - 1)];
      const v = Math.min(1, Math.max(0, lum[i] * local + (0.32 + n * 0.2) * (1 - local) + n * 0.025));
      const o = i * 4;
      out[o] = kr + (br - kr) * v;
      out[o + 1] = kg + (bg - kg) * v;
      out[o + 2] = kb + (bb - kb) * v;
      out[o + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  };

  // Animate only once the page has loaded, so the loop never competes with startup work.
  useRafLoop(render, !reduced && loaded && inView && pageVisible);

  // Paint one still frame right away: noise, or the finished scan for reduced motion.
  const renderRef = useRef(render);
  renderRef.current = render;
  useEffect(() => {
    lastFrame.current = -Infinity;
    renderRef.current(0);
  }, [reduced]);

  return (
    <div ref={wrap} className="relative overflow-hidden">
      <canvas
        ref={canvas}
        width={W}
        height={H}
        role="img"
        aria-label="Animated canvas: random noise gradually resolving into a stylised chest X-ray, illustrating how a generator turns noise into an image."
        className="aspect-[5/6] w-full"
      />
      {!reduced && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ animation: 'sweep-down 5s linear infinite' }}
        >
          <div className="absolute inset-x-0 bottom-0 h-px bg-disc/70 shadow-[0_0_12px_2px_rgba(61,214,245,0.45)]" />
        </div>
      )}
    </div>
  );
}
