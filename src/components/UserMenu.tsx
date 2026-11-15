import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from '../lib/auth';

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 2)
    .join('') || '?';

/** Avatar button in the header with the signed-in name and a sign-out option. */
export function UserMenu() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!session) return null;
  const first = session.name.split(' ')[0];

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account: ${session.name}`}
        className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-1 transition-colors hover:border-muted xl:pr-3"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gen to-disc font-brand text-xs font-medium text-bg">
          {session.guest ? '👤' : initials(session.name)}
        </span>
        <span className="hidden max-w-[7rem] truncate text-sm text-bone xl:inline">{first}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-64 origin-top-right rounded-xl border border-line bg-surface p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]"
          >
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-medium text-bone">{session.guest ? 'Browsing as a guest' : session.name}</p>
              <p className="truncate text-xs text-muted">{session.guest ? 'Create an account to keep a name on this device' : session.email}</p>
            </div>
            <div className="my-1 h-px bg-line" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-bone transition-colors hover:bg-bg"
            >
              {session.guest ? 'Sign in or create account' : 'Log out'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Always-visible log out button (for guests it opens the sign-in page instead). */
export function LogoutButton({ className = '', full = false }: { className?: string; full?: boolean }) {
  const session = useSession();
  if (!session) return null;
  const label = session.guest ? 'Sign in' : 'Log out';
  return (
    <button
      type="button"
      onClick={signOut}
      aria-label={label}
      title={label}
      className={`group flex items-center justify-center gap-2 rounded-md border border-line px-2.5 py-2 text-sm text-muted transition-colors hover:border-gen/70 hover:text-gen-glow ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {session.guest ? <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" /> : <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />}
      </svg>
      <span className={full ? '' : 'hidden md:inline'}>{label}</span>
    </button>
  );
}
