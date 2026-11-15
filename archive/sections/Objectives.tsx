import { Section } from '../ui/Section';
import { FilmCard } from '../ui/FilmCard';

const OBJECTIVES = [
  {
    title: 'Understand the core architecture',
    body: 'How a generator and a discriminator are built, and how they fit together.',
    tone: 'gen',
  },
  {
    title: 'Learn the adversarial training process',
    body: 'How the two networks are trained in alternation against a shared minimax objective.',
    tone: 'disc',
  },
  {
    title: 'Apply GANs to a real data-scarcity problem',
    body: 'Generate minority-class chest X-rays and test whether they help a classifier.',
    tone: 'gen',
  },
  {
    title: 'Identify open challenges',
    body: 'Such as mode collapse and synthetic scans that could mislead a classifier.',
    tone: 'disc',
  },
] as const;

export function Objectives() {
  return (
    <Section id="objectives" title="What we set out to do">
      <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {OBJECTIVES.map((o, i) => (
          <FilmCard
            key={o.title}
            index={i}
            label={`Objective ${String(i + 1).padStart(2, '0')}`}
            title={o.title}
            tone={o.tone}
            className="min-h-[13rem]"
          >
            {o.body}
          </FilmCard>
        ))}
      </div>
    </Section>
  );
}
