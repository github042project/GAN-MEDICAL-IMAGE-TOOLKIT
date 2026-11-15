import { useEffect, useRef } from 'react';

const HOT = 'a, button, input, label, [role="tab"], [role="button"]';

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number; // 0 = amber, 1 = cyan
  size: number;
}

/**
 * Login-page pointer: a rotating scanner reticle with a glowing comet trail.
 * It locks on (closes in) over anything clickable and bursts on click.
 * Mouse devices only; touch screens keep normal behaviour.
 */
export function ReticleCursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    root.classList.add('reticle-cursor');
    const canvas = trail.current!;
    const ctx = canvas.getContext('2d')!;
    const sparks: Spark[] = [];
    let x = -100;
    let y = -100;
    let rx = x;
    let ry = y;
    let lastX = x;
    let lastY = y;
    let raf = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };

    const tick = () => {
      rx += (x - rx) * (reduced ? 1 : 0.25);
      ry += (y - ry) * (reduced ? 1 : 0.25);
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.94;
        s.vy *= 0.94;
        s.life -= 0.028;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        const r = s.size * s.life;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 3);
        const rgb = s.hue < 0.5 ? '255,138,61' : '61,214,245';
        g.addColorStop(0, `rgba(${rgb},${0.9 * s.life})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(s.x - r * 3, s.y - r * 3, r * 6, r * 6);
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = sparks.length || Math.abs(x - rx) + Math.abs(y - ry) > 0.3 ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      root.classList.add('reticle-on');
      const hot = e.target instanceof Element && e.target.closest(HOT) !== null;
      root.classList.toggle('reticle-hot', hot);
      if (!reduced) {
        const dist = Math.hypot(x - lastX, y - lastY);
        const n = Math.min(4, Math.floor(dist / 6));
        for (let i = 0; i < n; i++) {
          const t = i / Math.max(1, n);
          sparks.push({
            x: lastX + (x - lastX) * t,
            y: lastY + (y - lastY) * t,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            life: 1,
            hue: (performance.now() / 900) % 1 < 0.5 ? 0 : 1,
            size: 2.5 + Math.random() * 2,
          });
        }
        if (sparks.length > 220) sparks.splice(0, sparks.length - 220);
      }
      lastX = x;
      lastY = y;
      wake();
    };
    const onDown = () => {
      root.classList.add('reticle-down');
      if (reduced) return;
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const sp = 2.5 + Math.random() * 2.5;
        sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, hue: i % 2, size: 3 + Math.random() * 2 });
      }
      wake();
    };
    const onUp = () => root.classList.remove('reticle-down');
    const onLeave = () => root.classList.remove('reticle-on');

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    document.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      root.classList.remove('reticle-cursor', 'reticle-on', 'reticle-hot', 'reticle-down');
    };
  }, []);

  return (
    <>
      <canvas ref={trail} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[89] h-full w-full" />
      <div ref={ring} aria-hidden="true" className="reticle-ring">
        <span className="reticle-ticks" />
      </div>
      <div ref={dot} aria-hidden="true" className="reticle-dot" />
    </>
  );
}
