import { useEffect, useState } from 'react';

/** Top-level pages, in presentation order. Each lives at a plain #hash. */
export const PAGES = [
  { id: 'home', label: 'Home', blurb: 'Your toolkit for working with medical images' },
  { id: 'lab', label: 'Augment', blurb: 'Turn one image into a labelled training set' },
  { id: 'doctor', label: 'Doctor', blurb: 'Find duplicates, odd sizes and class imbalance in a folder of images' },
  { id: 'viewer', label: 'Viewer', blurb: 'Zoom, enhance and measure any scan' },
  { id: 'balance', label: 'Balance', blurb: 'Plan synthetic data, splits and class weights' },
  { id: 'studio', label: 'Studio', blurb: 'Design synthetic X-rays and morph between them' },
  { id: 'playground', label: 'Playground', blurb: 'Watch a real GAN learn, live in your browser' },
  { id: 'game', label: 'Game', blurb: 'Play the Discriminator: can you catch the generated scan?' },
  { id: 'learn', label: 'Learn', blurb: 'How GANs work, in three hands-on demos' },
] as const;

export type PageId = (typeof PAGES)[number]['id'];

const isPage = (value: string): value is PageId => PAGES.some((p) => p.id === value);

/** The page named in the URL hash, or null for an unknown or empty hash. */
export function pageFromHash(): PageId | null {
  const hash = window.location.hash.slice(1);
  return isPage(hash) ? hash : null;
}

export function pageIndex(id: PageId): number {
  return PAGES.findIndex((p) => p.id === id);
}

/** The page before (-1) or after (1) the given one, if any. */
export function adjacentPage(id: PageId, dir: 1 | -1): PageId | null {
  return PAGES[pageIndex(id) + dir]?.id ?? null;
}

export function navigate(id: PageId) {
  if (pageFromHash() === id) window.scrollTo({ top: 0, behavior: 'instant' });
  else window.location.hash = id;
}

/** Current page, kept in sync with the URL hash. Unknown hashes leave the page unchanged. */
export function useRoute(): PageId {
  const [page, setPage] = useState<PageId>(() => pageFromHash() ?? 'home');
  useEffect(() => {
    const onHash = () => {
      const next = pageFromHash();
      if (next) setPage(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return page;
}
