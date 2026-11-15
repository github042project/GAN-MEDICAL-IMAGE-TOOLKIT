import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { adjacentPage, navigate, PAGES, type PageId } from './router';

interface PresentationState {
  presenting: boolean;
  toggle: () => void;
}

const PresentationContext = createContext<PresentationState>({ presenting: false, toggle: () => {} });

export const usePresentation = () => useContext(PresentationContext);

const NEXT_KEYS = new Set(['ArrowDown', 'ArrowRight', 'PageDown', ' ']);
const PREV_KEYS = new Set(['ArrowUp', 'ArrowLeft', 'PageUp']);

function pageTop(el: Element) {
  return el.getBoundingClientRect().top + window.scrollY;
}

let scrollAnim = 0;
let scrollTarget: number | null = null;

/** Eased scroll driven by rAF, so it behaves the same in every browser. */
function scrollToY(top: number) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const to = Math.round(Math.min(Math.max(0, top), max));
  cancelAnimationFrame(scrollAnim);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    scrollTarget = null;
    window.scrollTo(0, to);
    return;
  }
  const from = window.scrollY;
  const start = performance.now();
  const duration = 550;
  scrollTarget = to;
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    window.scrollTo(0, from + (to - from) * eased);
    if (t < 1) scrollAnim = requestAnimationFrame(frame);
    else scrollTarget = null;
  };
  scrollAnim = requestAnimationFrame(frame);
}

/** Current scroll position, or the destination if a scroll is in flight. */
function currentY() {
  return scrollTarget ?? window.scrollY;
}

/** Sections on the page currently shown. */
function sectionEls(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('main [data-section]'));
}

function goToPage(id: PageId | null) {
  if (!id) return;
  cancelAnimationFrame(scrollAnim);
  scrollTarget = null;
  navigate(id);
}

function currentIndex(els: HTMLElement[], y: number) {
  let cur = 0;
  els.forEach((el, i) => {
    if (pageTop(el) <= y + 8) cur = i;
  });
  return cur;
}

/**
 * Step through the deck: section by section within a page, then on to the
 * next page. Sections taller than the viewport are paged through first, so
 * no content is ever skipped.
 */
function step(dir: 1 | -1, page: PageId) {
  const els = sectionEls();
  if (!els.length) return goToPage(adjacentPage(page, dir));
  const vh = window.innerHeight;
  const y = currentY();
  const cur = currentIndex(els, y);
  const top = pageTop(els[cur]);
  const bottom = top + els[cur].offsetHeight;

  if (dir === 1) {
    if (bottom > y + vh + 8) return scrollToY(Math.min(y + vh * 0.85, bottom - vh));
    if (cur < els.length - 1) return scrollToY(pageTop(els[cur + 1]));
  } else {
    if (y > top + 8) return scrollToY(Math.max(top, y - vh * 0.85));
    if (cur > 0) return scrollToY(pageTop(els[cur - 1]));
  }
  goToPage(adjacentPage(page, dir));
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const role = target.getAttribute('role');
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
    role === 'slider' ||
    role === 'tab'
  );
}

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => undefined);
}

export function PresentationProvider({ children, page }: { children: ReactNode; page: PageId }) {
  const [presenting, setPresenting] = useState(false);
  const toggle = useCallback(() => setPresenting((p) => !p), []);

  useEffect(() => {
    document.documentElement.classList.toggle('present', presenting);
    if (presenting) {
      // Snap the section under the reading line to the top of the viewport.
      const els = sectionEls();
      const probe = window.scrollY + window.innerHeight * 0.4;
      let idx = 0;
      els.forEach((el, i) => {
        if (pageTop(el) <= probe) idx = i;
      });
      requestAnimationFrame(() => els[idx] && window.scrollTo({ top: pageTop(els[idx]) }));
    }
  }, [presenting]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const key = e.key;
      if (key === 'p' || key === 'P') {
        e.preventDefault();
        toggle();
        return;
      }
      if (key === 'f' || key === 'F') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if (!presenting) return;
      if (key === 'Escape' && !document.fullscreenElement) {
        setPresenting(false);
        return;
      }
      const onControl = e.target instanceof HTMLElement && e.target.closest('button, a, summary');
      if (key === ' ' && onControl) return;
      if (NEXT_KEYS.has(key) && !(key === ' ' && e.shiftKey)) {
        e.preventDefault();
        step(1, page);
      } else if (PREV_KEYS.has(key) || (key === ' ' && e.shiftKey)) {
        e.preventDefault();
        step(-1, page);
      } else if (key === 'Home') {
        e.preventDefault();
        goToPage(PAGES[0].id);
      } else if (key === 'End') {
        e.preventDefault();
        goToPage(PAGES[PAGES.length - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presenting, toggle, page]);

  const value = useMemo(() => ({ presenting, toggle }), [presenting, toggle]);
  return <PresentationContext.Provider value={value}>{children}</PresentationContext.Provider>;
}
