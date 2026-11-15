import { motion } from 'framer-motion';
import { Section } from '../ui/Section';
import { OversampleCompare } from '../viz/OversampleCompare';

const REASONS = [
  {
    title: 'Simple oversampling falls short',
    body: 'Duplicating or interpolating minority scans adds quantity, not genuinely new examples.',
  },
  {
    title: 'A genuinely novel idea',
    body: 'Two networks competing to produce data, rather than collecting more of it.',
  },
  {
    title: 'Synthetic images are easy to inspect',
    body: 'Unlike many ML outputs, a generated scan can simply be looked at and judged.',
  },
  {
    title: 'Real, ongoing impact',
    body: 'Data scarcity for rare conditions is a live problem in medical imaging.',
  },
];

export function WhyStudy() {
  return (
    <Section
      id="why"
      title={
        <>
          More copies aren’t <span className="text-disc">more information</span>.
        </>
      }
    >
      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
        <ol className="space-y-px lg:col-span-5">
          {REASONS.map((r, i) => (
            <motion.li
              key={r.title}
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex gap-5 border-b border-line py-5 first:pt-0"
            >
              <span className="font-sans tabular-nums text-sm text-gen">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="text-xl font-semibold text-bone">{r.title}</h3>
                <p className="mt-1.5 leading-relaxed text-muted">{r.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
        <div className="lg:col-span-7">
          <p className="mb-4 font-sans tabular-nums text-[13px] text-muted">
            Drag the divider · Oversampling vs GAN
          </p>
          <div className="mx-auto max-w-[26rem] xl:max-w-[30rem]">
            <OversampleCompare />
          </div>
        </div>
      </div>
    </Section>
  );
}
