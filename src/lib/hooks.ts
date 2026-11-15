import { useEffect, useRef, useState, type RefObject } from 'react';
import { useReducedMotion } from 'framer-motion';

/** True while the element intersects the viewport (plus margin). */
export function useInView(ref: RefObject<Element>, rootMargin = '0px', once = false): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) io.disconnect();
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, once]);
  return inView;
}

/** True while the browser tab is visible. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}

/** True once the window `load` event has fired and the main thread has had a moment to settle. */
export function usePageLoaded(): boolean {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let timer = 0;
    const settle = () => {
      timer = window.setTimeout(() => setLoaded(true), 400);
    };
    if (document.readyState === 'complete') settle();
    else window.addEventListener('load', settle, { once: true });
    return () => {
      window.removeEventListener('load', settle);
      window.clearTimeout(timer);
    };
  }, []);
  return loaded;
}

/** requestAnimationFrame loop that only runs while `active` is true. */
export function useRafLoop(callback: (time: number) => void, active: boolean) {
  const cb = useRef(callback);
  cb.current = callback;
  useEffect(() => {
    if (!active) return;
    let id = requestAnimationFrame(function tick(t) {
      cb.current(t);
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [active]);
}

/** Reduced-motion preference as a plain boolean. */
export function useReducedMotionPref(): boolean {
  return useReducedMotion() ?? false;
}

