import { motion, useScroll, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';
import { adjacentPage, navigate, PAGES, pageIndex, type PageId } from '../lib/router';
import { usePresentation } from '../lib/presentation';
import { Button } from './ui/Button';
import { LogoutButton, UserMenu } from './UserMenu';
import { Monogram } from './ui/Monogram';

function ProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-gradient-to-r from-gen via-gen-glow to-disc"
      style={{ scaleX }}
    />
  );
}

/** Small floating controls shown instead of the header while presenting. */
function PresenterBar({ page }: { page: PageId }) {
  const { toggle } = usePresentation();
  const prev = adjacentPage(page, -1);
  const next = adjacentPage(page, 1);
  const i = pageIndex(page);
  const pad = (n: number) => String(n).padStart(2, '0');
  const control =
    'flex h-8 w-8 items-center justify-center rounded border border-line text-bone transition-colors hover:border-muted disabled:opacity-30';
  return (
    <div className="fixed bottom-4 right-5 z-50 flex items-center gap-2 rounded-md border border-line bg-bg/95 p-1.5 font-sans tabular-nums text-xs text-muted">
      <button type="button" className={control} onClick={() => prev && navigate(prev)} disabled={!prev} aria-label="Previous page">
        ←
      </button>
      <span className="px-2 text-bone" aria-live="polite">
        {PAGES[i].label} <span className="text-muted">· {pad(i + 1)} / {pad(PAGES.length)}</span>
      </span>
      <button type="button" className={control} onClick={() => next && navigate(next)} disabled={!next} aria-label="Next page">
        →
      </button>
      <button type="button" onClick={toggle} className="ml-1 rounded px-2 py-1.5 hover:text-bone">
        Exit
      </button>
    </div>
  );
}

export function Nav({ page }: { page: PageId }) {
  const { presenting, toggle } = usePresentation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [page]);

  if (presenting) {
    return (
      <>
        <ProgressBar />
        <PresenterBar page={page} />
      </>
    );
  }

  const link = (id: PageId, mobile = false) => {
    const current = id === page;
    return (
      <a
        href={`#${id}`}
        aria-current={current ? 'page' : undefined}
        className={
          mobile
            ? `block rounded-md px-3 py-3 text-base ${current ? 'bg-surface text-bone' : 'text-muted hover:text-bone'}`
            : `relative whitespace-nowrap rounded-md px-2.5 py-2 text-sm transition-colors ${
                current ? 'text-bone' : 'text-muted hover:text-bone'
              }`
        }
      >
        {PAGES.find((p) => p.id === id)?.label}
        {current && !mobile && <span aria-hidden="true" className="absolute inset-x-3 -bottom-[13px] h-[2px] bg-disc" />}
      </a>
    );
  };

  return (
    <>
      <ProgressBar />
      <header className="fixed inset-x-0 top-[2px] z-40 border-b border-line/70 bg-bg/90 backdrop-blur-sm">
        <nav aria-label="Main" className="mx-auto flex h-14 max-w-page items-center justify-between gap-4 px-4 sm:px-8 lg:px-16">
          <a href="#home" className="flex items-center gap-3">
            <Monogram className="text-lg" />
            <span className="font-display text-[15px] font-medium text-bone">
              GAN<span className="hidden sm:inline"> Medical Toolkit</span>
            </span>
          </a>

          <ul className="hidden items-center gap-1 xl:flex">
            {PAGES.map((p) => (
              <li key={p.id}>{link(p.id)}</li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-keyshortcuts="P"
              className="hidden rounded-md border border-line px-3 py-2 font-sans tabular-nums text-xs text-muted transition-colors hover:border-muted hover:text-bone sm:inline-flex"
            >
              Present
            </button>
            <Button href="#game" className="hidden px-3.5 py-2 2xl:inline-flex" arrow>
              Play the game
            </Button>
            <UserMenu />
            <LogoutButton className="hidden sm:flex" />
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-line text-bone xl:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div id="mobile-menu" className="border-t border-line bg-bg px-4 pb-5 pt-2 sm:px-8 xl:hidden">
            <ul className="grid gap-1">
              {PAGES.map((p) => (
                <li key={p.id}>{link(p.id, true)}</li>
              ))}
            </ul>
            <div className="mt-4 flex gap-3">
              <Button href="#game" arrow className="flex-1">
                Play the game
              </Button>
              <Button variant="secondary" onClick={toggle} className="flex-1">
                Present
              </Button>
              <LogoutButton full className="flex-1" />
            </div>
          </div>
        )}
      </header>
    </>
  );
}
