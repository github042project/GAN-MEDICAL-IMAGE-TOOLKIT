import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary';

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  /** Renders a link (e.g. "#method") instead of a <button>. */
  href?: string;
  onClick?: () => void;
  /** Show the ↗ arrow used on navigation buttons. */
  arrow?: boolean;
  className?: string;
}

const styles: Record<Variant, string> = {
  primary: 'bg-disc text-bg hover:bg-disc-glow font-sans font-medium',
  secondary: 'border border-line bg-surface/70 text-bone hover:border-muted font-sans text-sm font-medium',
};

export function Arrow({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M5 11L11 5M6 5h5v5" />
    </svg>
  );
}

/** Call-to-action button in the two styles used across the site. */
export function Button({ children, variant = 'primary', href, onClick, arrow = false, className = '' }: ButtonProps) {
  const cls = `inline-flex shrink-0 items-center whitespace-nowrap justify-center gap-2 rounded-md px-4 py-2.5 text-sm transition-colors ${styles[variant]} ${className}`;
  const content = (
    <>
      {children}
      {arrow && <Arrow />}
    </>
  );
  return href ? (
    <a href={href} onClick={onClick} className={cls}>
      {content}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  );
}
