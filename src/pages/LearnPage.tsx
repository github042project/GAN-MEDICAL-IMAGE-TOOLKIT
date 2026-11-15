import { motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { Section } from '../components/ui/Section';
import durgaPhoto from '../assets/team/durga.png';
import garvitaPhoto from '../assets/team/garvita.webp';
import mishalPhoto from '../assets/team/mishal.webp';
import { Button } from '../components/ui/Button';
import { OversampleCompare } from '../components/viz/OversampleCompare';
import { MinimaxExplorer } from '../components/viz/MinimaxExplorer';
import { DuelVisualizer } from '../components/viz/DuelVisualizer';

const MEMBERS = [
  {
    name: 'Mohammed Mishal C',
    photo: mishalPhoto,
    focus: '50% 22%',
    zoom: 1.8,
    origin: '50% 40%',
    accent: '#FF8A3D',
    role: 'GAN method',
    summary: 'Planned the GAN method: the DCGAN architecture, the training plan and how results are evaluated.',
    areas: ['DCGAN architecture', 'Training plan', 'Evaluation'],
  },
  {
    name: 'Garvita Varshney',
    photo: garvitaPhoto,
    focus: '50% 50%',
    zoom: 1.7,
    origin: '42% 30%',
    accent: '#3DD6F5',
    role: 'Website, tools & design',
    summary: 'Designed and built the entire toolkit: all seven tools, the live GAN demos and the full visual design.',
    areas: ['Website', 'Tools + demos', 'UI / UX design'],
  },
  {
    name: 'Durga Prasad Patra',
    photo: durgaPhoto,
    focus: '50% 22%',
    zoom: 2.2,
    origin: '49% 33%',
    accent: '#C6F36B',
    role: 'Research',
    summary: 'Led the research: reviewed the landmark GAN papers and the medical image datasets behind the project.',
    areas: ['Literature review', 'GAN papers', 'Datasets'],
  },
];

const REFERENCES = [
  ['Goodfellow et al., 2014', 'Generative Adversarial Nets'],
  ['Radford, Metz & Chintala, 2015', 'DCGAN'],
  ['Zhu et al., 2017', 'CycleGAN'],
  ['Brock, Donahue & Simonyan, 2018', 'BigGAN'],
  ['Karras, Laine & Aila, 2019', 'StyleGAN'],
];

function Chapter({ n, total = 3, children }: { n: number; total?: number; children: ReactNode }) {
  return (
    <div className="mt-6 flex items-center gap-3 text-sm text-muted">
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-disc/60 text-xs text-disc">{n}</span>
      <span>
        Demo {n} of {total} · {children}
      </span>
    </div>
  );
}

export default function LearnPage() {
  return (
    <>
      <Section
        id="why"
        className="pt-32 lg:pt-36"
        title={
          <>
            More copies aren’t <span className="text-disc">more information</span>.
          </>
        }
        lede="The usual fix for a rare class is to duplicate its images. A GAN draws genuinely new ones instead."
      >
        <Chapter n={1}>drag the divider</Chapter>
        <div className="mt-8 grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <div className="mx-auto w-full max-w-[30rem] lg:col-span-7">
            <OversampleCompare />
          </div>
          <ul className="space-y-4 lg:col-span-5">
            {[
              ['Duplication', 'Same anatomy, more rows. The model memorises instead of learning.', 'text-bone'],
              ['GAN samples', 'New patients drawn from what the model learned about the rare class.', 'text-gen-glow'],
              ['Try it yourself', 'The Augmentation Lab makes classic variations of your own image.', 'text-disc'],
            ].map(([t, d, c]) => (
              <li key={t} className="rounded-xl border border-line bg-surface/70 p-5">
                <p className={`font-display text-lg ${c}`}>{t}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-muted">{d}</p>
              </li>
            ))}
            <li>
              <Button href="#lab" arrow>
                Open the Augmentation Lab
              </Button>
            </li>
          </ul>
        </div>
      </Section>

      <Section
        id="objective"
        title={
          <>
            One equation, <span className="text-gen">two</span> <span className="text-disc">opponents</span>.
          </>
        }
        lede="The Discriminator pushes this value up; the Generator pushes it down. Tap a term, then slide."
      >
        <Chapter n={2}>tap the terms, move the slider</Chapter>
        <div className="mt-8">
          <MinimaxExplorer />
        </div>
      </Section>

      <Section
        id="duel"
        title={
          <>
            Watch them <span className="text-gen">train</span>.
          </>
        }
        lede="D learns to separate real from fake, then G learns to fool the new D. Press play."
      >
        <Chapter n={3}>press play or scrub</Chapter>
        <div className="mt-8">
          <DuelVisualizer />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-gen/40 bg-gen/[0.06] p-6">
          <p className="flex-1 text-[15px] text-bone">
            Think you can beat the Discriminator? <span className="text-muted">Ten rounds, getting harder each time.</span>
          </p>
          <Button href="#game" arrow>
            Play Spot the Fake
          </Button>
        </div>
      </Section>

      <Section
        id="credits"
        title={
          <>
            Who made <span className="text-gen">this</span>
          </>
        }
        lede="Three people, one project."
        className="pb-12"
      >
        <ul className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MEMBERS.map((m, i) => (
            <motion.li
              key={m.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.2, 0.7, 0.2, 1] }}
              className="team-card group"
              style={{ '--accent': m.accent } as CSSProperties}
            >
              <div className="team-card-inner flex flex-col items-center px-6 pb-6 pt-7 text-center">
                <div className="team-avatar">
                  <div className="team-avatar-photo">
                    <img
                      src={m.photo}
                      alt={`Portrait of ${m.name}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      style={{ objectPosition: m.focus, transform: `scale(${m.zoom})`, transformOrigin: m.origin }}
                    />
                  </div>
                  <span aria-hidden="true" className="team-avatar-badge">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-brand text-lg font-medium leading-tight text-bone">{m.name}</h3>
                <p className="mt-1.5 text-sm font-medium" style={{ color: m.accent }}>
                  {m.role}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{m.summary}</p>
                <ul className="mt-4 flex flex-wrap justify-center gap-2">
                    {m.areas.map((a) => (
                      <li key={a} className="rounded-full border px-3 py-1 text-xs text-bone" style={{ borderColor: `${m.accent}66`, background: `${m.accent}14` }}>
                        {a}
                      </li>
                    ))}
                </ul>
              </div>
            </motion.li>
          ))}
        </ul>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-line bg-surface/70 p-5 lg:col-span-12">
            <p className="text-sm font-medium text-bone">Built on</p>
            <ol className="mt-3 space-y-2 text-sm text-muted">
              {REFERENCES.map(([who, what]) => (
                <li key={what}>
                  <span className="text-bone">{what}</span> · {who}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-muted">
              Demos are conceptual simulations. Every scan on this site is drawn in code; none is patient data.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
