import { motion, useScroll, useSpring } from 'framer-motion';
import { useRef } from 'react';
import { Section } from '../ui/Section';

const STAGES = [
  { name: 'Study the theory', body: 'Minimax objective, training dynamics, failure modes.', status: 'progress' },
  { name: 'Review landmark papers', body: 'GAN, DCGAN, CycleGAN, BigGAN, StyleGAN.', status: 'progress' },
  { name: 'Design the architecture', body: 'DCGAN generator and discriminator for 64×64 grayscale scans.', status: 'planned' },
  { name: 'Implement & train', body: 'Alternating training on minority-class chest X-rays.', status: 'planned' },
  { name: 'Evaluate & extend', body: 'Classifier on real vs real + synthetic; then extensions.', status: 'planned' },
] as const;

function StatusPill({ status }: { status: 'progress' | 'planned' }) {
  return status === 'progress' ? (
    <span className="pill border-gen/60 text-gen-glow">
      <span aria-hidden="true" className="animate-soft-pulse mr-1.5 h-1.5 w-1.5 rounded-full bg-gen" />
      In progress
    </span>
  ) : (
    <span className="pill border-dashed border-line text-muted">Planned</span>
  );
}

export function Approach() {
  const track = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: track, offset: ['start 0.85', 'end 0.55'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <Section
      id="approach"
      title={
        <>
          Five stages, from <span className="text-gen">theory</span> to <span className="text-disc">evaluation</span>.
        </>
      }
    >
      <div ref={track} className="relative mt-14 pl-10 lg:pl-0 lg:pt-12">
        {/* Path: vertical on small screens, horizontal on large */}
        <div aria-hidden="true" className="absolute bottom-2 left-[11px] top-2 w-[2px] bg-line lg:hidden">
          <motion.div className="h-full w-full origin-top bg-gradient-to-b from-gen to-disc" style={{ scaleY: progress }} />
        </div>
        <div
          aria-hidden="true"
          className="absolute left-3 right-[calc((100%-6rem)/5-12px)] top-[11px] hidden h-[2px] bg-line lg:block"
        >
          <motion.div className="h-full w-full origin-left bg-gradient-to-r from-gen to-disc" style={{ scaleX: progress }} />
        </div>

        <ol className="grid gap-10 lg:grid-cols-5 lg:gap-6">
        {STAGES.map((s, i) => (
          <li key={s.name} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-10 top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-bg font-sans tabular-nums text-[10px] lg:-top-12 lg:left-0 ${
                s.status === 'progress' ? 'border-gen text-gen' : 'border-line text-muted'
              }`}
            >
              {i + 1}
            </span>
            <p className="font-sans tabular-nums text-xs text-muted">Stage {String(i + 1).padStart(2, '0')}</p>
            <h3 className="mt-2 text-xl font-semibold text-bone lg:text-[1.35rem]">{s.name}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
            <div className="mt-4">
              <StatusPill status={s.status} />
            </div>
          </li>
        ))}
        </ol>
      </div>
    </Section>
  );
}
