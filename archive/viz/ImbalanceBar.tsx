import { motion } from 'framer-motion';

const ROWS = [
  { label: 'Pneumonia-positive (minority)', count: 300, tone: 'bg-gen', text: 'text-gen-glow' },
  { label: 'Normal (majority)', count: 3000, tone: 'bg-bone/70', text: 'text-bone' },
];
const MAX = 3000;

/** Animated horizontal bars contrasting a small positive class with a large normal class. */
export function ImbalanceBar() {
  return (
    <figure className="panel scanlines p-6 lg:p-8">
      <div className="flex items-baseline justify-between gap-4">
        <figcaption className="font-sans tabular-nums text-xs text-muted">Class balance</figcaption>
        <span className="pill border-line text-muted">Illustrative ratio</span>
      </div>
      <ul className="mt-6 space-y-6">
        {ROWS.map((row, i) => (
          <li key={row.label}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-bone/90">{row.label}</span>
              <span className={`font-sans tabular-nums text-lg ${row.text}`}>~{row.count.toLocaleString('en-US')}</span>
            </div>
            <div className="mt-2 h-3 w-full bg-line/60" role="presentation">
              <motion.div
                className={`h-full origin-left ${row.tone}`}
                style={{ width: `${(row.count / MAX) * 100}%` }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 1.2, delay: 0.2 + i * 0.25, ease: [0.2, 0.7, 0.2, 1] }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 font-sans tabular-nums text-xs leading-relaxed text-muted">
        ≈ 1 : 10 — at this ratio, always predicting “normal” is already ~91% accurate while missing every
        positive case.
      </p>
    </figure>
  );
}
