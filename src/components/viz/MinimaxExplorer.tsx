import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Tex } from '../ui/Tex';

type TermKey = 'min' | 'max' | 'real' | 'fake';

const TERMS: Record<TermKey, { label: string; tone: 'gen' | 'disc'; tip: string }> = {
  min: {
    label: 'min over G',
    tone: 'gen',
    tip: 'The Generator tunes its weights to push this value down: it wants its fakes to pass.',
  },
  max: {
    label: 'max over D',
    tone: 'disc',
    tip: 'The Discriminator tunes its weights to push this value up: it wants to catch every fake.',
  },
  real: {
    label: 'real-data term',
    tone: 'disc',
    tip: 'On real scans, D should output close to 1, which makes log D(x) close to its maximum of 0.',
  },
  fake: {
    label: 'generated-data term',
    tone: 'gen',
    tip: 'On generated scans D wants D(G(z)) → 0, while G wants D(G(z)) → 1, which drives this term down.',
  },
};

const term = (key: TermKey, body: string) => `\\htmlClass{mm-term mm-${key} tone-${TERMS[key].tone}}{${body}}`;

const LHS = `${term('min', '\\underset{G}{\\min}')}\\;${term('max', '\\underset{D}{\\max}')}\\; V(D,G)`;
const REAL = term('real', '\\mathbb{E}_{x\\sim p_{\\text{data}}}\\big[\\log D(x)\\big]');
const FAKE = term('fake', '\\mathbb{E}_{z\\sim p_z}\\big[\\log\\big(1 - D(G(z))\\big)\\big]');
const EQUATION = `${LHS} = ${REAL} + ${FAKE}`;
/** Narrow screens: same terms, broken over three lines. */
const EQUATION_STACKED = `\\begin{gathered} ${LHS} \\\\ = ${REAL} \\\\ + ${FAKE} \\end{gathered}`;

// Chart geometry
const CW = 360;
const CH = 200;
const PAD = { l: 40, r: 14, t: 14, b: 32 };
const X_MAX = 0.99;
const Y_MIN = -4.7;
const sx = (x: number) => PAD.l + (x / 1) * (CW - PAD.l - PAD.r);
const sy = (y: number) => PAD.t + (y / Y_MIN) * (CH - PAD.t - PAD.b);

function LogChart({ value }: { value: number }) {
  const path = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 120; i++) {
      const x = (i / 120) * X_MAX;
      pts.push(`${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)},${sy(Math.log(1 - x)).toFixed(1)}`);
    }
    return pts.join(' ');
  }, []);
  const y = Math.log(1 - value);

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} className="max-h-[17rem] w-full" role="img" aria-label={`Plot of log(1 − D(G(z))). Current value ${y.toFixed(2)} at D(G(z)) = ${value.toFixed(2)}.`}>
      {[0, -1, -2, -3, -4].map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={CW - PAD.r} y1={sy(t)} y2={sy(t)} stroke="var(--line)" strokeWidth="1" />
          <text x={PAD.l - 8} y={sy(t) + 3.5} textAnchor="end" className="fill-muted font-sans tabular-nums text-[10px]">
            {t}
          </text>
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <text key={t} x={sx(t)} y={CH - PAD.b + 16} textAnchor="middle" className="fill-muted font-sans tabular-nums text-[10px]">
          {t}
        </text>
      ))}
      <text x={CW - PAD.r} y={CH - 2} textAnchor="end" className="fill-muted font-sans tabular-nums text-[9px]">
        D(G(z))
      </text>
      <path d={path} fill="none" stroke="var(--gen)" strokeWidth="2" />
      <line x1={sx(value)} x2={sx(value)} y1={PAD.t} y2={CH - PAD.b} stroke="var(--disc)" strokeDasharray="3 4" strokeWidth="1" />
      <circle cx={sx(value)} cy={sy(y)} r="5" fill="var(--bg)" stroke="var(--gen-glow)" strokeWidth="2" />
    </svg>
  );
}

/**
 * The GAN objective with hoverable terms, plus a slider that shows how the
 * generator's term responds as the discriminator is fooled more often.
 */
export function MinimaxExplorer() {
  const [active, setActive] = useState<TermKey | null>(null);
  const [d, setD] = useState(0.2);
  const eqRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    eqRef.current?.querySelectorAll<HTMLElement>('.mm-term').forEach((el) => {
      el.classList.toggle('is-active', !!active && el.classList.contains(`mm-${active}`));
    });
  }, [active]);

  const onOver = (e: MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest('.mm-term');
    const key = (Object.keys(TERMS) as TermKey[]).find((k) => el?.classList.contains(`mm-${k}`));
    setActive(key ?? null);
  };

  const tip = active ? TERMS[active] : null;
  const y = Math.log(1 - d);

  return (
    <div className="panel">
      <div className="border-b border-line p-5 lg:p-8">
        <p className="font-sans tabular-nums text-[13px] text-muted">Objective · hover a term</p>
        <div
          ref={eqRef}
          className="mt-4 overflow-x-auto py-2 text-[0.78rem] text-bone sm:text-[clamp(0.95rem,1.5vw,1.5rem)]"
          onMouseOver={onOver}
          onMouseLeave={() => setActive(null)}
        >
          <Tex math={EQUATION_STACKED} display trust className="block sm:hidden" />
          <Tex math={EQUATION} display trust className="hidden sm:block" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Explain a term">
          {(Object.keys(TERMS) as TermKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onMouseEnter={() => setActive(k)}
              onFocus={() => setActive(k)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(k)}
              aria-pressed={active === k}
              className={`pill transition-colors ${
                active === k
                  ? TERMS[k].tone === 'gen'
                    ? 'border-gen text-gen-glow'
                    : 'border-disc text-disc-glow'
                  : 'border-line text-muted hover:text-bone'
              }`}
            >
              {TERMS[k].label}
            </button>
          ))}
        </div>
        <p
          className={`mt-4 min-h-[3rem] text-[15px] leading-relaxed ${
            tip ? (tip.tone === 'gen' ? 'text-gen-glow' : 'text-disc-glow') : 'text-muted'
          }`}
          aria-live="polite"
        >
          {tip ? tip.tip : 'Amber terms belong to the Generator, cyan terms to the Discriminator.'}
        </p>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-2 lg:p-8">
        <div>
          <label htmlFor="dgz" className="font-sans tabular-nums text-[13px] text-muted">
            Slide D(G(z)): how often the fake is believed
          </label>
          <input
            id="dgz"
            type="range"
            min={0}
            max={X_MAX}
            step={0.01}
            value={d}
            onChange={(e) => setD(Number(e.target.value))}
            className="range mt-5"
          />
          <div className="mt-2 flex justify-between font-sans tabular-nums text-xs text-muted">
            <span className="text-disc">D: “fake”</span>
            <span className="text-gen">D fooled</span>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 font-sans tabular-nums">
            <div className="border border-line p-3">
              <dt className="text-xs text-muted">D(G(z))</dt>
              <dd className="mt-1 text-2xl text-disc-glow">{d.toFixed(2)}</dd>
            </div>
            <div className="border border-line p-3">
              <dt className="text-xs text-muted">log(1 − D(G(z)))</dt>
              <dd className="mt-1 text-2xl text-gen-glow">{y.toFixed(2)}</dd>
            </div>
          </dl>
          <p className="mt-5 text-sm leading-relaxed text-muted">
            G minimises this term, so it gains by pushing D(G(z)) towards 1. Note the curve is flat near 0: early on,
            when D easily rejects fakes, G gets weak gradients. The original paper suggests G maximise log D(G(z))
            instead in practice.
          </p>
        </div>
        <LogChart value={d} />
      </div>
    </div>
  );
}
