import type { ReactNode } from 'react';
import { SECTIONS, type SectionId } from '../../lib/theme';

interface SectionProps {
  id: SectionId;
  title: ReactNode;
  /** Overrides the default film-label text taken from the section registry. */
  tag?: string;
  lede?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function FilmTag({ children }: { children: ReactNode }) {
  return (
    <p className="film-tag">
      {children}
    </p>
  );
}

export function Section({ id, title, tag, lede, children, className = '' }: SectionProps) {
  const label = tag ?? SECTIONS.find((s) => s.id === id)?.label ?? '';
  return (
    <section
      id={id}
      data-section
      aria-labelledby={`${id}-title`}
      className={`relative border-t border-line/60 py-24 first:border-t-0 lg:py-32 ${className}`}
    >
      <div className="mx-auto w-full max-w-page px-4 sm:px-8 lg:px-16">
        <FilmTag>
          {label}
        </FilmTag>
        <h2
          id={`${id}-title`}
          className="mt-5 max-w-4xl text-[clamp(2rem,4.6vw,4.25rem)] font-medium leading-[1.02]"
        >
          {title}
        </h2>
        {lede && <div className="mt-5 max-w-2xl text-base leading-relaxed text-muted lg:text-lg">{lede}</div>}
        {children}
      </div>
    </section>
  );
}
