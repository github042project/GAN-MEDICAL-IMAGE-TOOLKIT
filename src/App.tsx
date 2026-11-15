import { MotionConfig, motion } from 'framer-motion';
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, type ComponentType } from 'react';
import { GlowCursor } from './components/GlowCursor';
import { Nav } from './components/Nav';
import { OrganBackdrop } from './components/viz/OrganBackdrop';
import { Arrow, Button } from './components/ui/Button';
import HomePage from './pages/HomePage';
import { PresentationProvider } from './lib/presentation';
import { useSession } from './lib/auth';

const LoginPage = lazy(() => import('./pages/LoginPage'));
import { adjacentPage, pageIndex, PAGES, useRoute, type PageId } from './lib/router';

// The home page ships in the main bundle; the rest load on demand (and are prefetched when idle).
const loaders: Record<Exclude<PageId, 'home'>, () => Promise<{ default: ComponentType }>> = {
  lab: () => import('./pages/LabPage'),
  doctor: () => import('./pages/DoctorPage'),
  viewer: () => import('./pages/ViewerPage'),
  balance: () => import('./pages/BalancePage'),
  game: () => import('./pages/GamePage'),
  studio: () => import('./pages/StudioPage'),
  playground: () => import('./pages/PlaygroundPage'),
  learn: () => import('./pages/LearnPage'),
};

const PAGE_COMPONENTS: Record<PageId, ComponentType> = {
  home: HomePage,
  lab: lazy(loaders.lab),
  doctor: lazy(loaders.doctor),
  viewer: lazy(loaders.viewer),
  balance: lazy(loaders.balance),
  game: lazy(loaders.game),
  studio: lazy(loaders.studio),
  playground: lazy(loaders.playground),
  learn: lazy(loaders.learn),
};

const label = (id: PageId) => PAGES.find((p) => p.id === id)?.label ?? '';
const blurb = (id: PageId) => PAGES.find((p) => p.id === id)?.blurb ?? '';

function PageFooter({ page }: { page: PageId }) {
  const prev = adjacentPage(page, -1);
  const next = adjacentPage(page, 1);
  return (
    <footer className="border-t border-line/60">
      <nav
        aria-label="Previous and next page"
        className="mx-auto flex w-full max-w-page flex-wrap items-center justify-between gap-4 px-4 py-12 sm:px-8 lg:px-16"
      >
        {prev ? (
          <a
            href={`#${prev}`}
            className="group flex items-center gap-4 rounded-xl border border-line bg-surface/60 px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-muted"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-all group-hover:-translate-x-1 group-hover:border-muted group-hover:text-bone">
              <Arrow className="h-4 w-4 -rotate-[135deg]" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm text-muted">Previous</span>
              <span className="font-display text-lg text-bone">{label(prev)}</span>
            </span>
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a href={`#${next}`} className="next-card group ml-auto w-full sm:w-auto">
            <span className="next-card-inner">
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2 text-sm font-medium text-disc">
                  <span className="next-card-ping" aria-hidden="true" />
                  Up next · {pageIndex(next) + 1} of {PAGES.length}
                </span>
                <span className="mt-1 font-display text-2xl font-medium text-bone sm:text-3xl">{label(next)}</span>
                <span className="mt-1 max-w-xs text-sm leading-snug text-muted">{blurb(next)}</span>
              </span>
              <span className="next-card-arrow" aria-hidden="true">
                <Arrow className="h-5 w-5 rotate-45" />
              </span>
            </span>
          </a>
        ) : (
          <Button href="#home" variant="secondary">
            Back to overview
          </Button>
        )}
      </nav>
      <p className="mx-auto max-w-page px-4 pb-10 font-sans tabular-nums text-[13px] text-muted/80 sm:px-8 lg:px-16">
        GAN Medical Imaging Toolkit · Machine Learning topic seminar · all processing happens on your device
      </p>
    </footer>
  );
}

function MainApp() {
  const page = useRoute();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
  const Page = PAGE_COMPONENTS[page];

  // New page: start at the top and move keyboard focus to the content.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (first.current) {
      first.current = false;
      return;
    }
    main.current?.focus({ preventScroll: true });
  }, [page]);

  useEffect(() => {
    document.title = page === 'home' ? 'GAN Medical Imaging Toolkit' : `${label(page)} · GAN Medical Toolkit`;
  }, [page]);

  // Warm up the other pages once the first one has loaded, so switching is instant (and works offline).
  useEffect(() => {
    const warm = () => Object.values(loaders).forEach((load) => void load());
    const id = window.setTimeout(warm, 2500);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <PresentationProvider page={page}>
        <button
          type="button"
          onClick={() => main.current?.focus()}
          className="sr-only z-[70] bg-bone px-3 py-2 text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </button>
        <div className="aurora" aria-hidden="true" />
        <OrganBackdrop />
        <Nav page={page} />
        <main ref={main} tabIndex={-1} className="outline-none">
          {/* Content is visible immediately; only a short slide marks the page change. */}
          <motion.div key={page} initial={{ y: 12 }} animate={{ y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
            <Suspense fallback={<div className="min-h-screen" aria-hidden="true" />}>
              <Page />
            </Suspense>
            <PageFooter page={page} />
          </motion.div>
        </main>
        <div className="grain" aria-hidden="true" />
        <GlowCursor />
      </PresentationProvider>
    </MotionConfig>
  );
}

/** Shows the login page until someone signs in or continues as a guest. */
export default function App() {
  const session = useSession();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = session ? document.title : 'Sign in · GAN Medical Imaging Toolkit';
  }, [session]);
  return (
    <MotionConfig reducedMotion="user">
      {session ? (
        <MainApp />
      ) : (
        <Suspense fallback={<div className="min-h-screen bg-bg" aria-hidden="true" />}>
          <LoginPage />
        </Suspense>
      )}
    </MotionConfig>
  );
}
