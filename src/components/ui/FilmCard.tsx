import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type Tone = 'gen' | 'disc' | 'bone';

const toneBar: Record<Tone, string> = {
  gen: 'bg-gen',
  disc: 'bg-disc',
  bone: 'bg-bone/60',
};

const toneText: Record<Tone, string> = {
  gen: 'text-gen-glow',
  disc: 'text-disc-glow',
  bone: 'text-bone',
};

interface FilmCardProps {
  index: number;
  label: string;
  title: ReactNode;
  children?: ReactNode;
  tone?: Tone;
  className?: string;
}

/**
 * A card that slides in like a film being clipped onto a lightbox:
 * it travels in from the side with a slight tilt, then the backlight turns on.
 */
export function FilmCard({ index, label, title, children, tone = 'bone', className = '' }: FilmCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, x: -48, rotate: -2.5 }}
      whileInView={{ opacity: 1, x: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: 'spring', stiffness: 90, damping: 16, delay: index * 0.12 }}
      className={`group relative overflow-hidden rounded-xl border border-line bg-surface ${className}`}
    >
      <motion.div
        aria-hidden="true"
        className="lightbox scanlines pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, delay: index * 0.12 + 0.35 }}
      />
      <div aria-hidden="true" className={`absolute left-0 top-0 h-full w-[3px] ${toneBar[tone]}`} />
      <div className="relative p-6 lg:p-7">
        <p className={`font-sans tabular-nums text-xs ${toneText[tone]}`}>{label}</p>
        <h3 className="mt-3 text-xl font-semibold leading-snug text-bone lg:text-2xl">{title}</h3>
        {children && <div className="mt-3 text-[15px] leading-relaxed text-muted">{children}</div>}
      </div>
    </motion.article>
  );
}
