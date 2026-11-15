import { useEffect, useRef } from 'react';

const INTERACTIVE = 'a, button, [role="button"], [role="slider"], [role="tab"], input, label, select, textarea, summary';

/**
 * Replaces the mouse pointer with a glowing dot and a soft halo that trails
 * behind it and grows over anything clickable. Only on devices with a real
 * mouse; touch screens keep their normal behaviour.
 */
export function GlowCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!fine.matches) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    root.classList.add('glow-cursor');

    let x = -100;
    let y = -100;
    let hx = x;
    let hy = y;
    let raf = 0;
    let shown = false;

    const tick = () => {
      // The halo eases toward the pointer; the dot follows exactly.
      const k = reduced ? 1 : 0.2;
      hx += (x - hx) * k;
      hy += (y - hy) * k;
      if (halo.current) halo.current.style.transform = `translate3d(${hx}px, ${hy}px, 0) translate(-50%, -50%)`;
      raf = Math.abs(x - hx) + Math.abs(y - hy) > 0.3 ? requestAnimationFrame(tick) : 0;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      if (!shown) {
        shown = true;
        hx = x;
        hy = y;
        root.classList.add('glow-cursor-on');
      }
      const hot = e.target instanceof Element && e.target.closest(INTERACTIVE) !== null;
      root.classList.toggle('glow-cursor-hot', hot);
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      shown = false;
      root.classList.remove('glow-cursor-on');
    };
    const onDown = () => root.classList.add('glow-cursor-down');
    const onUp = () => root.classList.remove('glow-cursor-down');

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    document.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      root.classList.remove('glow-cursor', 'glow-cursor-on', 'glow-cursor-hot', 'glow-cursor-down');
    };
  }, []);

  return (
    <>
      <div ref={halo} className="cursor-halo" aria-hidden="true" />
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
