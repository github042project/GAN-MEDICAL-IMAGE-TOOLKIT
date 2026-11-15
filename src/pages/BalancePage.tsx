import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Section } from '../components/ui/Section';
import { Button } from '../components/ui/Button';

import { BALANCE_KEY } from '../lib/keys';

interface ClassRow {
  id: number;
  name: string;
  count: number;
}

const DEFAULT_ROWS: ClassRow[] = [
  { id: 1, name: 'Normal', count: 3000 },
  { id: 2, name: 'Pneumonia', count: 300 },
];

function loadRows(): ClassRow[] {
  try {
    const saved = localStorage.getItem(BALANCE_KEY);
    if (saved) {
      const rows = JSON.parse(saved) as { name: string; count: number }[];
      if (Array.isArray(rows) && rows.length) return rows.map((r, i) => ({ id: i + 1, name: String(r.name), count: Math.max(0, Number(r.count) || 0) }));
    }
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_ROWS;
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl border border-line bg-bg p-4 font-mono text-[13px] leading-relaxed text-bone/90">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(code).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="absolute right-3 top-3 rounded-md border border-line bg-surface px-2.5 py-1 text-xs text-bone transition-colors hover:border-disc"
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  );
}

export default function BalancePage() {
  const [rows, setRows] = useState<ClassRow[]>(loadRows);
  const [target, setTarget] = useState(100); // % of the largest class each class should reach
  const [valPct, setValPct] = useState(15);
  const [testPct, setTestPct] = useState(15);
  const [lang, setLang] = useState<'pytorch' | 'keras' | 'sklearn'>('pytorch');

  useEffect(() => {
    try {
      localStorage.setItem(BALANCE_KEY, JSON.stringify(rows.map(({ name, count }) => ({ name, count }))));
    } catch {
      /* storage unavailable */
    }
  }, [rows]);

  const calc = useMemo(() => {
    const valid = rows.filter((r) => r.count > 0);
    const total = valid.reduce((n, r) => n + r.count, 0);
    const max = Math.max(1, ...valid.map((r) => r.count));
    const min = Math.max(1, Math.min(...valid.map((r) => r.count)));
    const trainShare = Math.max(0, 1 - (valPct + testPct) / 100);
    const per = rows.map((r) => {
      const test = Math.round(r.count * (testPct / 100));
      const val = Math.round(r.count * (valPct / 100));
      const train = Math.max(0, r.count - test - val);
      const goalTrain = Math.round(max * trainShare * (target / 100));
      const synthetic = Math.max(0, goalTrain - train);
      const weight = r.count > 0 && valid.length ? total / (valid.length * r.count) : 0;
      return { ...r, train, val, test, synthetic, weight };
    });
    return {
      total,
      max,
      ratio: max / min,
      majorityAcc: total ? max / total : 0,
      majorityName: valid.find((r) => r.count === max)?.name ?? '',
      per,
      syntheticTotal: per.reduce((n, r) => n + r.synthetic, 0),
    };
  }, [rows, target, valPct, testPct]);

  const update = (id: number, patch: Partial<ClassRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const add = () => setRows((rs) => [...rs, { id: Math.max(0, ...rs.map((r) => r.id)) + 1, name: `Class ${rs.length + 1}`, count: 100 }]);
  const remove = (id: number) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));

  const weights = calc.per.map((r) => r.weight.toFixed(3));
  const names = calc.per.map((r) => JSON.stringify(r.name)).join(', ');
  const code = {
    pytorch: `import torch\nimport torch.nn as nn\n\n# classes: [${names}]\nclass_weights = torch.tensor([${weights.join(', ')}])\ncriterion = nn.CrossEntropyLoss(weight=class_weights)`,
    keras: `# classes: [${names}]\nclass_weight = {${weights.map((w, i) => `${i}: ${w}`).join(', ')}}\nmodel.fit(x_train, y_train, class_weight=class_weight, epochs=20)`,
    sklearn: `from sklearn.utils.class_weight import compute_class_weight\n\n# gives the same numbers as above for your labels\nweights = compute_class_weight("balanced", classes=np.unique(y), y=y)\n# or pass class_weight="balanced" to the estimator`,
  }[lang];

  return (
    <Section
      id="balance"
      className="pt-32 lg:pt-36"
      title={
        <>
          Balance <span className="text-disc">Planner</span>
        </>
      }
      lede="Type in how many images you have per class. See how lopsided the data is, how many synthetic images would even it out, a safe train / validation / test split, and class weights you can paste into your training code."
    >
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Inputs */}
        <div className="panel h-fit p-6 lg:col-span-4">
          <p className="font-display text-base text-bone">Your classes</p>
          <ul className="mt-4 space-y-2.5">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <input
                  aria-label="Class name"
                  value={r.name}
                  onChange={(e) => update(r.id, { name: e.target.value })}
                  className="min-w-0 flex-1 rounded-md border border-line bg-bg px-3 py-2 text-sm text-bone outline-none focus:border-disc"
                />
                <input
                  aria-label={`${r.name} image count`}
                  type="number"
                  min={0}
                  value={r.count}
                  onChange={(e) => update(r.id, { count: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-24 rounded-md border border-line bg-bg px-3 py-2 text-right text-sm tabular-nums text-bone outline-none focus:border-disc"
                />
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  aria-label={`Remove ${r.name}`}
                  disabled={rows.length <= 1}
                  className="h-9 w-9 shrink-0 rounded-md border border-line text-muted transition-colors hover:border-gen hover:text-gen disabled:opacity-30"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={add} className="mt-3 text-sm text-disc hover:underline">
            + Add a class
          </button>

          <div className="mt-6 space-y-5 border-t border-line/70 pt-5">
            <label className="block">
              <span className="flex justify-between text-sm">
                <span className="text-muted">Bring every class up to</span>
                <span className="tabular-nums text-bone">{target}% of the largest</span>
              </span>
              <input type="range" className="range mt-2" min={25} max={100} step={5} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
            </label>
            <label className="block">
              <span className="flex justify-between text-sm">
                <span className="text-muted">Validation set</span>
                <span className="tabular-nums text-bone">{valPct}%</span>
              </span>
              <input type="range" className="range mt-2" min={5} max={30} step={5} value={valPct} onChange={(e) => setValPct(Number(e.target.value))} />
            </label>
            <label className="block">
              <span className="flex justify-between text-sm">
                <span className="text-muted">Test set</span>
                <span className="tabular-nums text-bone">{testPct}%</span>
              </span>
              <input type="range" className="range mt-2" min={5} max={30} step={5} value={testPct} onChange={(e) => setTestPct(Number(e.target.value))} />
            </label>
            <button type="button" onClick={() => setRows(DEFAULT_ROWS)} className="text-sm text-muted hover:text-bone hover:underline">
              Reset to example
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6 lg:col-span-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface/80 p-5">
              <p className="text-sm text-muted">Imbalance</p>
              <p className="mt-2 font-display text-4xl tabular-nums text-bone">
                1 : {calc.ratio >= 10 ? Math.round(calc.ratio) : calc.ratio.toFixed(1)}
              </p>
              <p className="mt-1 text-xs text-muted">smallest to largest class</p>
            </div>
            <div className="rounded-2xl border border-gen/50 bg-gen/[0.06] p-5">
              <p className="text-sm text-gen-glow">The accuracy trap</p>
              <p className="mt-2 font-display text-4xl tabular-nums text-bone">{Math.round(calc.majorityAcc * 100)}%</p>
              <p className="mt-1 text-xs text-muted">accuracy from always guessing “{calc.majorityName}”</p>
            </div>
            <div className="rounded-2xl border border-disc/50 bg-disc/[0.06] p-5">
              <p className="text-sm text-disc">Synthetic to add</p>
              <p className="mt-2 font-display text-4xl tabular-nums text-bone">{fmt(calc.syntheticTotal)}</p>
              <p className="mt-1 text-xs text-muted">training images, across all classes</p>
            </div>
          </div>

          <div className="panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-lg text-bone">Training set after balancing</p>
              <p className="flex items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-disc" /> real</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gen" /> synthetic</span>
              </p>
            </div>
            <ul className="mt-5 space-y-4">
              {calc.per.map((r) => {
                const scale = Math.max(1, ...calc.per.map((x) => x.train + x.synthetic));
                return (
                  <li key={r.id}>
                    <div className="flex justify-between text-sm">
                      <span className="text-bone">{r.name || 'Unnamed'}</span>
                      <span className="tabular-nums text-muted">
                        {fmt(r.train)} real{r.synthetic > 0 && <span className="text-gen-glow"> + {fmt(r.synthetic)} synthetic</span>}
                      </span>
                    </div>
                    <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-line/60">
                      <motion.div className="h-full bg-disc" animate={{ width: `${(r.train / scale) * 100}%` }} transition={{ duration: 0.5 }} />
                      <motion.div
                        className="h-full bg-[repeating-linear-gradient(135deg,var(--gen)_0_6px,rgba(255,138,61,0.55)_6px_12px)]"
                        animate={{ width: `${(r.synthetic / scale) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button href="#lab" arrow>
                Make variations in the Lab
              </Button>
              <p className="text-xs text-muted">Synthetic images belong in training only.</p>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-6 py-4">
              <p className="font-display text-lg text-bone">Split plan</p>
              <p className="text-xs text-muted">Validate and test on real images only, so the score reflects real patients.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted">
                  <tr>
                    <th className="px-6 py-3 font-normal">Class</th>
                    <th className="px-3 py-3 text-right font-normal">Train (real)</th>
                    <th className="px-3 py-3 text-right font-normal">+ Synthetic</th>
                    <th className="px-3 py-3 text-right font-normal">Validation</th>
                    <th className="px-6 py-3 text-right font-normal">Test</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {calc.per.map((r) => (
                    <tr key={r.id} className="border-t border-line/70">
                      <td className="px-6 py-3 text-bone">{r.name || 'Unnamed'}</td>
                      <td className="px-3 py-3 text-right text-bone">{fmt(r.train)}</td>
                      <td className="px-3 py-3 text-right text-gen-glow">{r.synthetic ? fmt(r.synthetic) : '–'}</td>
                      <td className="px-3 py-3 text-right text-bone">{fmt(r.val)}</td>
                      <td className="px-6 py-3 text-right text-bone">{fmt(r.test)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg text-bone">Or weight the loss instead</p>
                <p className="mt-1 text-sm text-muted">Rare classes count more in training. Weights = total ÷ (classes × class count).</p>
              </div>
              <div className="flex rounded-lg border border-line p-1" role="tablist" aria-label="Framework">
                {(['pytorch', 'keras', 'sklearn'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="tab"
                    aria-selected={lang === l}
                    onClick={() => setLang(l)}
                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${lang === l ? 'bg-disc text-bg' : 'text-muted hover:text-bone'}`}
                  >
                    {{ pytorch: 'PyTorch', keras: 'Keras', sklearn: 'scikit-learn' }[l]}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {calc.per.map((r) => (
                <span key={r.id} className="rounded-full border border-line px-3 py-1 text-sm">
                  <span className="text-muted">{r.name || 'Unnamed'}</span> <span className="tabular-nums text-bone">{r.weight.toFixed(2)}</span>
                </span>
              ))}
            </div>
            <div className="mt-4">
              <CopyBlock code={code} />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
