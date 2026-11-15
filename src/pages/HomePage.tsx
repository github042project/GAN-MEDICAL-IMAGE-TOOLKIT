import { motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { Hero } from '../components/sections/Hero';
import { FilmTag } from '../components/ui/Section';
import { Arrow } from '../components/ui/Button';
import { DEFAULT_SETTINGS, renderAugmented, sampleParams } from '../lib/augment';
import { sampleScanCanvas } from '../lib/sampleScan';

/** Nine real augmented thumbnails of the sample X-ray, made once the page has settled. */
function LabPreview() {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const id = window.setTimeout(() => {
      const src = sampleScanCanvas(192);
      const s = { ...DEFAULT_SETTINGS, size: 112, rotate: 14, zoom: 0.14, brightness: 0.2, contrast: 0.2, seed: 7 };
      setUrls(Array.from({ length: 9 }, (_, i) => renderAugmented(src, 192, 192, sampleParams(s, i), s, i).toDataURL('image/jpeg', 0.8)));
    }, 600);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <span className="mt-6 grid flex-1 grid-cols-3 gap-2" aria-hidden="true">
      {Array.from({ length: 9 }, (_, k) => (
        <span
          key={k}
          className="tool-tile relative aspect-square overflow-hidden rounded-md border border-line/80"
          style={{ animationDelay: `${k * 0.25}s` }}
        >
          {urls[k] && (
            <img src={urls[k]} alt="" className="h-full w-full object-cover opacity-75 transition-opacity duration-500 group-hover:opacity-100" />
          )}
        </span>
      ))}
    </span>
  );
}

type Tone = 'gen' | 'disc' | 'verdict' | 'bone';

const TONE: Record<Tone, { text: string; border: string; glow: string; bg: string }> = {
  gen: { text: 'text-gen', border: 'hover:border-gen/70', glow: 'hover:shadow-[0_20px_60px_-25px_rgba(255,138,61,0.7)]', bg: 'bg-gen/10' },
  disc: { text: 'text-disc', border: 'hover:border-disc/70', glow: 'hover:shadow-[0_20px_60px_-25px_rgba(61,214,245,0.7)]', bg: 'bg-disc/10' },
  verdict: { text: 'text-verdict', border: 'hover:border-verdict/70', glow: 'hover:shadow-[0_20px_60px_-25px_rgba(198,243,107,0.6)]', bg: 'bg-verdict/10' },
  bone: { text: 'text-bone', border: 'hover:border-bone/50', glow: 'hover:shadow-[0_20px_60px_-25px_rgba(232,228,218,0.4)]', bg: 'bg-bone/10' },
};

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const TOOLS: { href: string; name: string; tone: Tone; icon: ReactNode; pitch: string; gets: string[]; wide?: boolean; span?: boolean }[] = [
  {
    href: '#lab',
    name: 'Augmentation Lab',
    tone: 'disc',
    icon: icon('M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM16.5 13v7M13 16.5h7'),
    pitch: 'Turn one scan into dozens of realistic training images, with a log of every change.',
    gets: ['Presets', 'ZIP download', 'Reproducible seed'],
    wide: true,
  },
  {
    href: '#game',
    name: 'Spot the Fake',
    tone: 'gen',
    icon: icon('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z'),
    pitch: 'You are the Discriminator. Catch the generated scan before it fools you.',
    gets: ['10 rounds', 'Gets harder', 'High score'],
  },
  {
    href: '#doctor',
    name: 'Dataset Doctor',
    tone: 'verdict',
    icon: icon('M9 3h6M10 3v5l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M7.5 14h9'),
    pitch: 'Drop a folder of images. Find duplicates, odd sizes, dark scans and class imbalance.',
    gets: ['Duplicate finder', 'Class chart', 'Clean export'],
  },
  {
    href: '#viewer',
    name: 'Scan Viewer',
    tone: 'bone',
    icon: icon('M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3M11 8v6M8 11h6'),
    pitch: 'Zoom, adjust contrast, enhance detail and measure distances on any image.',
    gets: ['Window / level', 'Equalise', 'Ruler'],
  },
  {
    href: '#balance',
    name: 'Balance Planner',
    tone: 'disc',
    icon: icon('M12 3v18M5 7h14M5 7l-3 6a3 3 0 006 0zM19 7l-3 6a3 3 0 006 0zM8 21h8'),
    pitch: 'Enter your class counts. Get synthetic targets, a safe split and ready-to-paste class weights.',
    gets: ['Split plan', 'PyTorch weights', 'Accuracy trap'],
  },
  {
    href: '#studio',
    name: 'Synthetic Scan Studio',
    tone: 'bone',
    icon: icon('M12 3a9 9 0 100 18c1.1 0 1.5-.9 1.2-1.7-.4-1 .3-2.3 1.5-2.3H17a4 4 0 004-4c0-5-4-10-9-10zM7.5 11.5h.01M10.5 7.5h.01M15 7.5h.01'),
    pitch: 'Design your own synthetic X-ray with sliders, then morph smoothly between two scans.',
    gets: ['Anatomy sliders', 'Latent morph', 'Send to Lab'],
  },
  {
    href: '#playground',
    name: 'Live GAN Playground',
    tone: 'gen',
    icon: icon('M13 2L4 14h7l-1 8 9-12h-7l1-8z'),
    pitch: 'A real GAN training in your browser. Watch the Generator learn a shape while the Discriminator fights back.',
    gets: ['Real training', 'Loss chart', 'Mode collapse'],
    span: true,
  },
];

function Tools() {
  return (
    <section id="tools" data-section aria-labelledby="tools-title" className="relative border-t border-line/60 py-20 lg:py-24">
      <div className="mx-auto w-full max-w-page px-4 sm:px-8 lg:px-16">
        <FilmTag>The toolkit</FilmTag>
        <h2 id="tools-title" className="mt-4 max-w-3xl text-[clamp(2rem,4.2vw,3.75rem)] font-medium leading-[1.04]">
          Seven tools. Pick one and start.
        </h2>
        <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t, i) => {
            const tone = TONE[t.tone];
            return (
              <motion.li
                key={t.href}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className={t.wide ? 'md:col-span-2 lg:col-span-1 lg:row-span-2' : t.span ? 'md:col-span-2' : ''}
              >
                <a
                  href={t.href}
                  className={`tool-card group flex h-full flex-col rounded-2xl border border-line bg-surface/80 p-6 transition-all duration-300 hover:-translate-y-1 ${tone.border} ${tone.glow}`}
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone.bg} ${tone.text}`}>{t.icon}</span>
                  <span className={`mt-5 font-display font-medium text-bone ${t.wide ? 'text-3xl' : 'text-2xl'}`}>{t.name}</span>
                  <span className="mt-2 text-[15px] leading-relaxed text-muted">{t.pitch}</span>
                  {t.wide && <LabPreview />}
                  <span className="mt-6 flex flex-wrap gap-2">
                    {t.gets.map((g) => (
                      <span key={g} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">
                        {g}
                      </span>
                    ))}
                  </span>
                  <span className={`mt-6 flex items-center gap-2 text-sm font-medium ${tone.text}`}>
                    Open tool
                    <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5" />
                  </span>
                </a>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Idea() {
  const steps = [
    {
      tone: 'text-gen-glow',
      title: 'Rare scans are scarce',
      body: 'For every scan of a rare condition there may be ten normal ones. Models learn to ignore the rare class.',
      visual: (
        <div className="grid w-full grid-cols-10 gap-1.5" aria-label="One positive scan for every ten normal scans">
          {Array.from({ length: 30 }, (_, i) => (
            <span key={i} className={`aspect-square rounded-sm ${i % 10 === 3 ? 'bg-gen shadow-[0_0_10px_rgba(255,138,61,0.8)]' : 'bg-line'}`} />
          ))}
        </div>
      ),
    },
    {
      tone: 'text-gen',
      title: 'A forger learns to draw them',
      body: 'The Generator turns random noise into new scans of the rare class, not copies of the old ones.',
      visual: (
        <div className="flex items-center gap-3 font-display text-3xl" aria-hidden="true">
          <span className="rounded-lg border border-line px-3 py-1 text-muted">z</span>
          <span className="text-muted">→</span>
          <span className="rounded-lg border border-gen px-3 py-1 text-gen shadow-[0_0_20px_-4px_rgba(255,138,61,0.7)]">G</span>
          <span className="text-muted">→</span>
          <span className="text-bone">scan</span>
        </div>
      ),
    },
    {
      tone: 'text-disc',
      title: 'A detective keeps it honest',
      body: 'The Discriminator tries to tell real from fake. Each side improves until the fakes are convincing.',
      visual: (
        <div className="flex items-center gap-3 font-display text-3xl" aria-hidden="true">
          <span className="text-bone">scan</span>
          <span className="text-muted">→</span>
          <span className="rounded-lg border border-disc px-3 py-1 text-disc shadow-[0_0_20px_-4px_rgba(61,214,245,0.7)]">D</span>
          <span className="text-muted">→</span>
          <span className="text-verdict">real?</span>
        </div>
      ),
    },
  ];
  return (
    <section id="idea" data-section aria-labelledby="idea-title" className="relative border-t border-line/60 py-20 lg:py-24">
      <div className="mx-auto w-full max-w-page px-4 sm:px-8 lg:px-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <FilmTag>The idea in 30 seconds</FilmTag>
            <h2 id="idea-title" className="mt-4 max-w-3xl text-[clamp(2rem,4.2vw,3.75rem)] font-medium leading-[1.04]">
              Two networks, one argument.
            </h2>
          </div>
          <a href="#learn" className="group flex items-center gap-2 text-sm font-medium text-disc">
            See it in three hands-on demos
            <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
        <ol className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative flex flex-col rounded-2xl border border-line bg-surface/70 p-6"
            >
              <span className={`text-sm font-semibold ${s.tone}`}>Step {i + 1}</span>
              <div className="my-6 flex min-h-[4.5rem] items-center">{s.visual}</div>
              <h3 className="font-display text-xl font-medium text-bone">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Tools />
      <Idea />
    </>
  );
}
