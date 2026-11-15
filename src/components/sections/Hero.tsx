import { motion } from 'framer-motion';
import { TEAM } from '../../lib/theme';
import { useSession } from '../../lib/auth';
import { FilmTag } from '../ui/Section';
import { PulseLine } from '../ui/PulseLine';
import { NoiseToScan } from '../viz/NoiseToScan';
import { Button } from '../ui/Button';

function ForceBadge({ letter, name, role, tone }: { letter: string; name: string; role: string; tone: 'gen' | 'disc' }) {
  const color = tone === 'gen' ? 'border-gen text-gen' : 'border-disc text-disc';
  const glow =
    tone === 'gen' ? 'shadow-[0_0_28px_-4px_rgba(255,138,61,0.55)]' : 'shadow-[0_0_28px_-4px_rgba(61,214,245,0.55)]';
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-lg border font-display text-2xl font-bold sm:h-14 sm:w-14 sm:text-3xl ${color} ${glow}`}
      >
        {letter}
      </span>
      <span className="text-xs text-muted">
        <span className="hidden sm:block">{name}</span>
        <span className="block text-bone/70">{role}</span>
      </span>
    </div>
  );
}

export function Hero() {
  const session = useSession();
  const greeting = session && !session.guest ? `Welcome, ${session.name.split(' ')[0]}` : 'GAN Medical Imaging Toolkit';
  return (
    <section
      id="intro"
      data-section
      aria-labelledby="intro-title"
      className="relative flex min-h-[92vh] items-center overflow-hidden pb-16 pt-28 lg:pt-24"
    >
      <div className="mx-auto grid w-full max-w-page items-center gap-14 px-4 sm:px-8 lg:grid-cols-12 lg:gap-10 lg:px-16">
        <motion.div
          className="lg:col-span-7"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <FilmTag>{greeting}</FilmTag>
          <h1
            id="intro-title"
            className="mt-6 text-[clamp(2.5rem,5.6vw,5.75rem)] font-medium leading-[0.98] tracking-[-0.035em]"
          >
            Do more with <span className="text-gen">every scan</span> you{' '}
            <span className="relative whitespace-nowrap">
              have
              <span aria-hidden="true" className="absolute -bottom-1 left-0 h-[3px] w-full bg-disc/70" />
            </span>
            .
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-bone/80 lg:text-xl">
            Medical images are rare and expensive to collect. These free tools help you stretch, clean, inspect and
            balance the ones you have, using the ideas behind Generative Adversarial Networks.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="#tools" arrow>
              Explore the tools
            </Button>
            <Button href="#game" variant="secondary" arrow>
              Play Spot the Fake
            </Button>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            {['Runs in your browser', 'Nothing is uploaded', 'Works offline'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-verdict shadow-[0_0_8px_rgba(198,243,107,0.8)]" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-10 border-t border-line pt-5 text-sm text-muted">
            Built by <span className="text-bone">{TEAM.join(' · ')}</span>
          </p>
        </motion.div>

        <motion.figure
          className="lg:col-span-5"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className="flex items-center">
            <ForceBadge letter="G" name="Generator" role="forger" tone="gen" />
            <PulseLine className="min-w-4 flex-1" />
            <div className="w-[54%] max-w-[22rem] shrink-0 rounded-xl border border-line bg-bg p-2 shadow-[0_0_80px_-20px_rgba(61,214,245,0.35)]">
              <NoiseToScan />
              <div className="flex items-center justify-between px-1 pt-2 text-xs text-muted">
                <span>random noise</span>
                <span className="text-gen-glow">generated scan</span>
              </div>
            </div>
            <PulseLine className="min-w-4 flex-1" delay={1.3} />
            <ForceBadge letter="D" name="Discriminator" role="detective" tone="disc" />
          </div>
          <figcaption className="mt-5 text-center text-sm text-muted">
            A forger turns noise into scans; a detective catches the fakes.
          </figcaption>
        </motion.figure>
      </div>
    </section>
  );
}
