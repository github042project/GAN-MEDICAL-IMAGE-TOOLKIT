import { useMemo } from 'react';
import { Section } from '../ui/Section';
import { DuelVisualizer } from '../viz/DuelVisualizer';
import { ScanTile } from '../viz/ScanTile';
import { centredParams } from '../../lib/scan';

const METRICS = ['Accuracy', 'Recall', 'F1', 'FID'] as const;

function StepHeader({ n, title, tone }: { n: number; title: string; tone: 'gen' | 'disc' | 'bone' }) {
  const color = tone === 'gen' ? 'text-gen' : tone === 'disc' ? 'text-disc' : 'text-verdict';
  return (
    <div>
      <p className={`mb-1.5 font-sans tabular-nums text-xs ${color}`}>Step {String(n).padStart(2, '0')}</p>
      <h3 className="text-2xl font-semibold text-bone lg:text-3xl">{title}</h3>
    </div>
  );
}

function DatasetCard() {
  const params = useMemo(() => centredParams(23, 0.9), []);
  return (
    <article className="panel lightbox relative flex gap-5 overflow-hidden p-5 lg:p-6" aria-labelledby="dataset-title">
      <div className="w-24 shrink-0 border border-line p-1">
        <ScanTile params={params} seed={2} width={96} height={116} label="Stylised minority-class chest X-ray (illustrative)" />
      </div>
      <div>
        <p className="font-sans tabular-nums text-[13px] text-muted">Dataset</p>
        <h3 id="dataset-title" className="mt-2 text-2xl font-semibold text-bone">
          Chest X-Ray
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Minority class = <span className="text-gen-glow">pneumonia-positive</span>. The GAN learns from these scans
          only.
        </p>
      </div>
    </article>
  );
}

export function Execution() {
  return (
    <Section
      id="execution"
      title={
        <>
          From architecture to <span className="text-verdict">evidence</span>.
        </>
      }
    >
      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        <DatasetCard />
        <article className="panel p-5 lg:p-6">
          <StepHeader n={1} title="Build the Generator" tone="gen" />
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Transposed-convolution blocks that upsample a 100-d noise vector into a 64×64 grayscale scan.
          </p>
        </article>
        <article className="panel p-5 lg:p-6">
          <StepHeader n={2} title="Build the Discriminator" tone="disc" />
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Convolution blocks that downsample a scan to a single probability that it is real.
          </p>
        </article>
      </div>

      <div className="mt-14">
        <StepHeader n={3} title="Train alternately: the Duel" tone="gen" />
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          D is updated to separate real from generated scans; then G is updated to fool the new D. Repeat.
        </p>
        <div className="mt-6">
          <DuelVisualizer />
        </div>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <StepHeader n={4} title="Evaluate" tone="bone" />
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Retrain the classifier on <span className="text-bone">real + synthetic</span> scans and compare accuracy
            and recall against the <span className="text-bone">real-only</span> baseline.
          </p>
          <p className="mt-4 font-sans tabular-nums text-[13px] text-muted">
            Results follow implementation. No numbers are reported yet.
          </p>
        </div>
        <div className="overflow-x-auto lg:col-span-7">
          <table className="w-full min-w-[30rem] border border-line text-left">
            <caption className="mb-3 text-left font-sans tabular-nums text-[13px] text-muted">
              Evaluation plan
            </caption>
            <thead>
              <tr className="border-b border-line bg-surface">
                <th scope="col" className="px-4 py-3 font-sans tabular-nums text-[13px] font-normal text-muted">
                  Training data
                </th>
                {METRICS.map((m) => (
                  <th key={m} scope="col" className="px-4 py-3 font-sans tabular-nums text-[13px] font-normal text-bone">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['Real only', 'Real + Synthetic'].map((row) => (
                <tr key={row} className="border-b border-line last:border-b-0">
                  <th scope="row" className="px-4 py-4 font-display text-base font-medium text-bone">
                    {row}
                  </th>
                  {METRICS.map((m) =>
                    m === 'FID' && row === 'Real only' ? (
                      <td key={m} className="px-4 py-4">
                        <span className="pill border-line text-muted" title="FID measures synthetic image quality">
                          N/A
                        </span>
                      </td>
                    ) : (
                      <td key={m} className="px-4 py-4">
                        <span className="pill border-verdict/40 text-verdict/90">TBD</span>
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">FID (Fréchet Inception Distance) scores the synthetic scans themselves, so it has no real-only value.</p>
        </div>
      </div>
    </Section>
  );
}
