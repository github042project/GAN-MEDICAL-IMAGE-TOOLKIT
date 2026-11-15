import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useInView, useReducedMotionPref } from '../../lib/hooks';
import type { PageId } from '../../lib/router';
import { Button } from '../ui/Button';
import { Monogram } from '../ui/Monogram';

type Tone = 'gen' | 'disc' | 'verdict' | 'bone';

interface Step {
  id: string;
  label: string;
  lead: string;
  points: [string, string][];
  links: { label: string; to: PageId }[];
  tone: Tone;
}

const STEPS: Step[] = [
  {
    id: 'collect',
    label: 'Collect',
    lead: 'Start from the scans that are hardest to find.',
    points: [
      ['Use', 'the Chest X-Ray dataset, keeping only the minority class: pneumonia-positive.'],
      ['Expect', 'a few hundred positive scans against thousands of normal ones.'],
      ['Train', 'the GAN on minority-class scans alone.'],
    ],
    links: [{ label: 'The problem', to: 'problem' }],
    tone: 'bone',
  },
  {
    id: 'generate',
    label: 'Generate',
    lead: 'Turn random noise into a candidate scan.',
    points: [
      ['Sample', 'a 100-dimensional noise vector z.'],
      ['Upsample', 'it through transposed-convolution blocks with batch normalisation.'],
      ['Output', 'a 64×64 grayscale scan, G(z).'],
    ],
    links: [{ label: 'Architecture', to: 'method' }],
    tone: 'gen',
  },
  {
    id: 'discriminate',
    label: 'Discriminate',
    lead: 'Judge every scan: real or generated?',
    points: [
      ['Downsample', 'the scan through convolution blocks.'],
      ['Output', 'one probability that the scan is real.'],
      ['Learn', 'from real minority scans and the Generator’s fakes.'],
    ],
    links: [{ label: 'Architecture', to: 'method' }],
    tone: 'disc',
  },
  {
    id: 'train',
    label: 'Train',
    lead: 'Let the two networks compete.',
    points: [
      ['Update', 'D to separate real scans from generated ones.'],
      ['Update', 'G to fool the new D.'],
      ['Repeat', 'until D can no longer tell them apart, D ≈ 0.5.'],
    ],
    links: [
      { label: 'Watch the Duel', to: 'experiment' },
      { label: 'The objective', to: 'method' },
    ],
    tone: 'gen',
  },
  {
    id: 'evaluate',
    label: 'Evaluate',
    lead: 'Check that synthetic scans actually help.',
    points: [
      ['Retrain', 'the classifier on real + synthetic scans.'],
      ['Compare', 'accuracy, recall and F1 against a real-only baseline.'],
      ['Score', 'synthetic image quality with FID.'],
    ],
    links: [{ label: 'Evaluation plan', to: 'experiment' }],
    tone: 'verdict',
  },
  {
    id: 'safeguard',
    label: 'Safeguard',
    lead: 'Catch the ways synthetic data can go wrong.',
    points: [
      ['Watch', 'for mode collapse: many copies of one scan.'],
      ['Check', 'that the classifier learns pathology, not artefacts.'],
      ['Label', 'synthetic data clearly and protect patient privacy.'],
    ],
    links: [{ label: 'Risks & ethics', to: 'risks' }],
    tone: 'disc',
  },
];

const toneText: Record<Tone, string> = {
  gen: 'text-gen-glow',
  disc: 'text-disc-glow',
  verdict: 'text-verdict',
  bone: 'text-bone',
};
const toneNode: Record<Tone, string> = {
  gen: 'border-gen bg-gen text-bg',
  disc: 'border-disc bg-disc text-bg',
  verdict: 'border-verdict bg-verdict text-bg',
  bone: 'border-bone bg-bone text-bg',
};
const toneStroke: Record<Tone, string> = {
  gen: 'var(--gen)',
  disc: 'var(--disc)',
  verdict: 'var(--verdict)',
  bone: 'var(--bone)',
};

const RADIUS = 38; // % of the square, for node placement
const ADVANCE_MS = 6000;

const angleOf = (i: number) => -Math.PI / 2 + (i / STEPS.length) * Math.PI * 2;

/**
 * The GAN pipeline as a clickable cycle: pick a stage on the ring to see
 * what happens there and jump to the page that covers it.
 */
export function PipelineOrbit() {
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const inView = useInView(wrap);
  const reduced = useReducedMotionPref();
  const step = STEPS[active];

  // Gently cycle through the stages until the viewer picks one.
  useEffect(() => {
    if (touched || reduced || !inView) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % STEPS.length), ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [touched, reduced, inView]);

  const select = (i: number) => {
    setTouched(true);
    setActive(i);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + STEPS.length) % STEPS.length;
    select(next);
    tabs.current[next]?.focus();
  };

  const a = angleOf(active);

  return (
    <div ref={wrap} className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <div className="relative mx-auto aspect-square w-full max-w-[26rem]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--line)" strokeWidth="0.4" />
          <circle cx="50" cy="50" r={RADIUS - 9} fill="none" stroke="var(--line)" strokeWidth="0.25" strokeDasharray="0.8 1.6" />
          <line
            x1="50"
            y1="50"
            x2={50 + Math.cos(a) * RADIUS}
            y2={50 + Math.sin(a) * RADIUS}
            stroke={toneStroke[step.tone]}
            strokeWidth="0.5"
            strokeOpacity="0.8"
            style={{ transition: 'all 400ms ease' }}
          />
        </svg>

        <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-2xl shadow-[0_0_40px_-8px_rgba(61,214,245,0.35)]">
          <Monogram />
        </div>

        <div role="tablist" aria-label="GAN pipeline stages" aria-orientation="horizontal">
          {STEPS.map((s, i) => {
            const ang = angleOf(i);
            const selected = i === active;
            return (
              <button
                key={s.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`stage-tab-${s.id}`}
                aria-selected={selected}
                aria-controls="stage-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => select(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-3 py-1.5 font-sans tabular-nums text-[13px] transition-colors sm:text-xs ${
                  selected ? toneNode[s.tone] : 'border-line bg-bg text-muted hover:border-muted hover:text-bone'
                }`}
                style={{ left: `${50 + Math.cos(ang) * RADIUS}%`, top: `${50 + Math.sin(ang) * RADIUS}%` }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div id="stage-panel" role="tabpanel" aria-labelledby={`stage-tab-${step.id}`} className="min-h-[19rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <p className="font-sans tabular-nums text-xs text-muted">
              Stage {active + 1} of {STEPS.length}
            </p>
            <h3 className="mt-3 font-display text-4xl font-medium text-bone lg:text-5xl">{step.label}</h3>
            <p className={`mt-3 text-xl leading-snug ${toneText[step.tone]}`}>{step.lead}</p>
            <ul className="mt-6 space-y-2.5 text-[15px] leading-relaxed text-bone/80">
              {step.points.map(([verb, rest]) => (
                <li key={verb + rest} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-muted" />
                  <span>
                    <strong className="font-semibold text-bone">{verb}</strong> {rest}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              {step.links.map((l) => (
                <Button key={l.label} href={`#${l.to}`} variant="secondary" arrow>
                  {l.label}
                </Button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
