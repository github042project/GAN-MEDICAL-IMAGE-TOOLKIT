import { useRef, useState } from 'react';
import { Section } from '../ui/Section';

const MILESTONES = [
  {
    year: '2014',
    name: 'Original GAN',
    who: 'Goodfellow et al.',
    detail:
      'Introduced the adversarial framework: a generator and a discriminator trained against each other in a two-player minimax game.',
  },
  {
    year: '2015',
    name: 'DCGAN',
    who: 'Radford et al.',
    detail:
      'Brought deep convolutional layers and batch normalisation to GANs, making image generation markedly more stable.',
  },
  {
    year: '2017',
    name: 'CycleGAN',
    who: 'Zhu et al.',
    detail:
      'Unpaired image-to-image translation using a cycle-consistency loss, so no matched before/after pairs are needed.',
  },
  {
    year: '2018',
    name: 'BigGAN',
    who: 'Brock et al.',
    detail: 'Scaled GAN training up in model and batch size for high-fidelity, class-conditional image synthesis.',
  },
  {
    year: '2019',
    name: 'StyleGAN',
    who: 'Karras et al.',
    detail: 'A style-based generator that separates coarse and fine attributes, giving control over what gets generated.',
  },
  {
    year: '2021+',
    name: 'Diffusion models',
    who: 'Successor approach',
    detail:
      'Iterative denoising models emerged as a strong alternative to GANs for image synthesis, a comparison we list as future work.',
  },
];

export function ExistingWork() {
  const [open, setOpen] = useState(0);
  const track = useRef<HTMLOListElement>(null);

  const scrollByCard = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector('li');
    el.scrollBy({ left: dir * ((card?.clientWidth ?? 300) + 20), behavior: 'smooth' });
  };

  return (
    <Section
      id="existing-work"
      title={
        <>
          A decade of <span className="text-gen">forgers</span> getting better.
        </>
      }
      lede="Landmark GAN papers we are reviewing, from the original idea to the models that followed it."
    >
      <div className="mt-10 flex justify-end gap-2">
        {([-1, 1] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            className="btn h-9 w-9 px-0"
            onClick={() => scrollByCard(dir)}
            aria-label={dir < 0 ? 'Scroll timeline left' : 'Scroll timeline right'}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d={dir < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
            </svg>
          </button>
        ))}
      </div>

      <div className="relative mt-4">
        <div aria-hidden="true" className="absolute inset-x-0 top-[10px] h-px bg-line" />
        <ol
          ref={track}
          className="relative flex snap-x snap-mandatory gap-5 overflow-x-auto pb-6"
          aria-label="Timeline of GAN research"
        >
          {MILESTONES.map((m, i) => {
            const isOpen = open === i;
            const isLast = i === MILESTONES.length - 1;
            return (
              <li key={m.year} className="w-[17rem] shrink-0 snap-start sm:w-[18.5rem]">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`milestone-${i}`}
                  onClick={() => setOpen(i)}
                  onMouseEnter={() => setOpen(i)}
                  className="group w-full text-left"
                >
                  <span className="flex items-center gap-3 font-sans tabular-nums text-sm">
                    <span
                      aria-hidden="true"
                      className={`relative z-10 block h-3 w-3 rounded-full border-2 transition-colors ${
                        isOpen ? (isLast ? 'border-disc bg-disc' : 'border-gen bg-gen') : 'border-muted bg-bg'
                      }`}
                    />
                    <span className={isOpen ? 'text-bone' : 'text-muted'}>{m.year}</span>
                  </span>
                  <span
                    className={`mt-5 block border p-5 transition-colors ${
                      isOpen ? 'border-muted/70 bg-surface' : 'border-line bg-surface/50 group-hover:border-muted/50'
                    }`}
                  >
                    <span className="block font-display text-2xl font-semibold text-bone">{m.name}</span>
                    <span className="mt-1 block font-sans tabular-nums text-xs text-muted">
                      {m.who}
                    </span>
                    <span
                      id={`milestone-${i}`}
                      className={`mt-4 block min-h-[6.5rem] text-[15px] leading-relaxed text-bone/80 transition-[opacity,transform] duration-300 ${
                        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                      }`}
                    >
                      {m.detail}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </Section>
  );
}
