import { Section } from '../ui/Section';
import { FilmCard } from '../ui/FilmCard';

const ITEMS = [
  {
    title: 'Working prototype',
    body: 'Implement and train the DCGAN, then run the real vs real + synthetic evaluation.',
    tone: 'gen',
  },
  {
    title: 'GANs vs Diffusion',
    body: 'Compare GAN-generated scans with those from diffusion models on the same task.',
    tone: 'disc',
  },
  {
    title: 'Conditional GANs',
    body: 'Controlled generation: ask for a specific class or attribute instead of a random sample.',
    tone: 'gen',
  },
  {
    title: 'Clinical validation & ethics',
    body: 'Expert review of synthetic scans and a clear policy for using synthetic patient data.',
    tone: 'disc',
  },
] as const;

export function FutureWork() {
  return (
    <Section id="future-work" title="Where this goes next">
      <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {ITEMS.map((item, i) => (
          <FilmCard
            key={item.title}
            index={i}
            label={`Next ${String(i + 1).padStart(2, '0')}`}
            title={item.title}
            tone={item.tone}
            className="min-h-[12rem]"
          >
            {item.body}
          </FilmCard>
        ))}
      </div>
    </Section>
  );
}
