import { useEffect, useRef } from 'react';

/** Pre-rendered soft glow sprite for a colour, drawn scaled per point (much faster than shadows). */
function sprite(rgb: string, size = 64): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(255,255,255,1)`);
  grad.addColorStop(0.18, `rgba(${rgb},1)`);
  grad.addColorStop(0.45, `rgba(${rgb},0.35)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

const PAIRS = 46;
const STARS = 170;

/**
 * Login background: a turning DNA double helix of glowing beads, a field of
 * particles drifting toward the viewer, and a scrolling perspective grid.
 * Everything leans toward the mouse.
 */
export function HelixScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const amber = sprite('255,138,61');
    const cyan = sprite('61,214,245');
    const lime = sprite('198,243,107', 32);
    let w = 0;
    let h = 0;
    let dpr = 1;
    const aim = { x: 0, y: 0 };
    const lean = { x: 0, y: 0 };

    const stars = Array.from({ length: STARS }, () => ({ x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 5, z: Math.random() * 6 + 0.5 }));

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    const onPointer = (e: PointerEvent) => {
      aim.x = (e.clientX / w) * 2 - 1;
      aim.y = (e.clientY / h) * 2 - 1;
    };

    let raf = 0;
    let last = 0;
    const frame = (time: number) => {
      const dt = Math.min(50, time - (last || time));
      last = time;
      lean.x += (aim.x - lean.x) * 0.05;
      lean.y += (aim.y - lean.y) * 0.05;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Perspective grid floor.
      const horizon = h * 0.62 + lean.y * 20;
      ctx.lineWidth = 1;
      const scroll = (time * 0.00025) % 1;
      for (let i = 0; i < 18; i++) {
        const t = (i + scroll) / 18;
        const y = horizon + Math.pow(t, 2.2) * (h - horizon) * 1.05;
        ctx.strokeStyle = `rgba(61,214,245,${0.03 + t * 0.12})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      const vx = w / 2 - lean.x * 80;
      for (let i = -14; i <= 14; i++) {
        ctx.strokeStyle = 'rgba(61,214,245,0.07)';
        ctx.beginPath();
        ctx.moveTo(vx + i * 12, horizon);
        ctx.lineTo(vx + i * w * 0.14, h);
        ctx.stroke();
      }
      const fade = ctx.createLinearGradient(0, horizon - 10, 0, horizon + 120);
      fade.addColorStop(0, 'rgba(7,9,13,1)');
      fade.addColorStop(1, 'rgba(7,9,13,0)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, horizon - 10, w, 130);

      ctx.globalCompositeOperation = 'lighter';

      // Particles flying toward the viewer.
      const f = Math.min(w, h) * 0.9;
      for (const s of stars) {
        if (!reduced) s.z -= dt * 0.0009;
        if (s.z < 0.3) {
          s.z = 6.5;
          s.x = (Math.random() - 0.5) * 8;
          s.y = (Math.random() - 0.5) * 5;
        }
        const px = w / 2 + ((s.x - lean.x * 0.6) / s.z) * f;
        const py = h / 2 + ((s.y - lean.y * 0.4) / s.z) * f;
        const r = Math.max(0.6, 2.4 / s.z);
        ctx.globalAlpha = Math.min(1, (6.5 - s.z) / 3) * 0.7;
        ctx.drawImage(lime, px - r * 3, py - r * 3, r * 6, r * 6);
      }

      // Double helix.
      const spin = (reduced ? 0 : time * 0.00045) + lean.x * 0.9;
      const tilt = 0.42 + lean.y * 0.15;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const scale = Math.min(w * 0.15, h * 0.2);
      const cx = w * (w >= 1024 ? 0.66 : 0.5);
      const cy = h * 0.47;
      const cam = 4;
      type P = { x: number; y: number; z: number; k: number };
      const pts: P[] = [];
      const rungs: [P, P][] = [];
      for (let i = 0; i < PAIRS; i++) {
        const y = (i / (PAIRS - 1) - 0.5) * 4.2;
        const a = i * 0.36 + spin;
        const mk = (ang: number, k: number): P => {
          const x0 = Math.cos(ang) * 0.75;
          const z0 = Math.sin(ang) * 0.75;
          // Tilt the helix axis diagonally across the screen.
          const x1 = x0 * ct - y * st;
          const y1 = x0 * st + y * ct;
          const p = cam / (cam + z0);
          return { x: cx + x1 * p * scale, y: cy - y1 * p * scale * 0.82, z: z0, k };
        };
        const A = mk(a, 0);
        const B = mk(a + Math.PI, 1);
        pts.push(A, B);
        if (i % 2 === 0) rungs.push([A, B]);
      }
      for (const [A, B] of rungs) {
        const depth = 1 - (A.z + B.z + 1.5) / 3;
        const g = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
        g.addColorStop(0, `rgba(255,138,61,${0.1 + depth * 0.2})`);
        g.addColorStop(1, `rgba(61,214,245,${0.1 + depth * 0.2})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }
      pts.sort((p, q) => q.z - p.z);
      for (const p of pts) {
        const near = 1 - (p.z + 0.75) / 1.5; // 1 = nearest
        const r = 6 + near * 9;
        ctx.globalAlpha = (0.3 + near * 0.6) * (w >= 1024 ? 1 : 0.35);
        ctx.drawImage(p.k === 0 ? amber : cyan, p.x - r, p.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      if (!reduced) raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    raf = requestAnimationFrame(frame);
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === 'visible' && !reduced) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 h-full w-full" />;
}
