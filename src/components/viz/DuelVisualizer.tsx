import { useEffect, useMemo, useRef, useState } from 'react';
import { centredParams, drawGenerated } from '../../lib/scan';
import { clamp } from '../../lib/random';
import { useInView, usePageVisible, useRafLoop } from '../../lib/hooks';

const MAX_EPOCH = 200;
const TICK_MS = 85;
const CW = 200;
const CH = 240;

/** Illustrative curves only: not produced by real training. */
const quality = (e: number) => clamp(1.04 * (1 - Math.exp(-e / 50)));
const dFake = (e: number) => clamp(0.5 - 0.47 * Math.exp(-e / 60) * Math.cos(e / 9), 0.01, 0.99);
const dReal = (e: number) => clamp(0.5 + 0.45 * Math.exp(-e / 60) * Math.cos(e / 9 + 0.5), 0.01, 0.99);

function stageLabel(q: number) {
  if (q < 0.3) return 'noise';
  if (q < 0.7) return 'blurry';
  if (q < 0.95) return 'taking shape';
  return 'plausible';
}

function Gauge({ fake, real }: { fake: number; real: number }) {
  const R = 100;
  const arc = (from: number, to: number) => {
    const a0 = Math.PI * (1 - from);
    const a1 = Math.PI * (1 - to);
    return `M ${120 + R * Math.cos(a0)} ${120 - R * Math.sin(a0)} A ${R} ${R} 0 0 1 ${120 + R * Math.cos(a1)} ${120 - R * Math.sin(a1)}`;
  };
  const needle = (v: number) => `rotate(${-90 + v * 180}deg)`;
  return (
    <svg viewBox="0 0 240 140" className="w-full max-w-[22rem]" aria-hidden="true">
      <path d={arc(0, 1)} stroke="var(--line)" strokeWidth="14" fill="none" />
      <path d={arc(0, 0.45)} stroke="var(--disc)" strokeOpacity="0.35" strokeWidth="14" fill="none" />
      <path d={arc(0.55, 1)} stroke="var(--bone)" strokeOpacity="0.2" strokeWidth="14" fill="none" />
      <path d={arc(0.485, 0.515)} stroke="var(--verdict)" strokeWidth="14" fill="none" />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const a = Math.PI * (1 - t);
        return (
          <text
            key={t}
            x={120 + (R + 14) * Math.cos(a)}
            y={124 - (R + 14) * Math.sin(a)}
            textAnchor="middle"
            className="fill-muted font-sans tabular-nums text-[9px]"
          >
            {t}
          </text>
        );
      })}
      <g style={{ transform: needle(real), transformOrigin: '120px 120px', transition: 'transform 120ms linear' }}>
        <line x1="120" y1="120" x2="120" y2="36" stroke="var(--bone)" strokeOpacity="0.6" strokeWidth="2" />
      </g>
      <g style={{ transform: needle(fake), transformOrigin: '120px 120px', transition: 'transform 120ms linear' }}>
        <line x1="120" y1="120" x2="120" y2="26" stroke="var(--gen)" strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx="120" cy="120" r="6" fill="var(--bg)" stroke="var(--disc)" strokeWidth="2" />
    </svg>
  );
}

function History({ epoch }: { epoch: number }) {
  const W = 300;
  const H = 70;
  const all = useMemo(() => Array.from({ length: MAX_EPOCH + 1 }, (_, e) => dFake(e)), []);
  const pts = all
    .slice(0, epoch + 1)
    .map((v, e) => `${((e / MAX_EPOCH) * W).toFixed(1)},${(H - v * H).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="var(--verdict)" strokeOpacity="0.5" strokeDasharray="4 4" />
      {epoch > 0 && <polyline points={pts} fill="none" stroke="var(--gen)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

/**
 * "The Duel": a conceptual, deterministic animation of alternating GAN
 * training. Generator output sharpens while D's verdict settles at 0.5.
 */
export function DuelVisualizer() {
  const [epoch, setEpoch] = useState(0);
  const [playing, setPlaying] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const acc = useRef<{ last: number; carry: number }>({ last: 0, carry: 0 });
  const inView = useInView(wrap);
  const visible = usePageVisible();
  const params = useMemo(() => centredParams(12), []);

  const q = quality(epoch);
  const fake = dFake(epoch);
  const real = dReal(epoch);
  const trainingD = epoch % 2 === 1;
  const done = epoch >= MAX_EPOCH;

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d', { willReadFrequently: true });
    if (ctx) drawGenerated(ctx, CW, CH, params, q, epoch + 1);
  }, [epoch, q, params]);

  useEffect(() => {
    if (done) setPlaying(false);
  }, [done]);

  useRafLoop(
    (t) => {
      const a = acc.current;
      if (!a.last) a.last = t;
      a.carry += t - a.last;
      a.last = t;
      if (a.carry >= TICK_MS) {
        const steps = Math.floor(a.carry / TICK_MS);
        a.carry -= steps * TICK_MS;
        setEpoch((e) => Math.min(MAX_EPOCH, e + steps));
      }
    },
    playing && inView && visible,
  );

  useEffect(() => {
    acc.current = { last: 0, carry: 0 };
  }, [playing, inView, visible]);

  const togglePlay = () => {
    if (done) setEpoch(0);
    setPlaying((p) => !p || done);
  };

  return (
    <div ref={wrap} className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="pill border-muted/50 text-bone">Conceptual simulation</span>
          <span className="hidden font-sans tabular-nums text-[13px] text-muted sm:inline">
            illustrative, not real training
          </span>
        </div>
        <p className="font-sans tabular-nums text-sm text-bone" aria-live="off">
          EPOCH <span className="text-gen-glow">{String(epoch).padStart(3, '0')}</span>
          <span className="text-muted"> / {MAX_EPOCH}</span>
        </p>
      </div>

      <div className="grid md:grid-cols-2">
        {/* Generator */}
        <div
          className={`relative border-b border-line p-5 transition-colors md:border-b-0 md:border-r lg:p-7 ${
            !trainingD && playing ? 'bg-gen/[0.04]' : ''
          }`}
        >
          <div className="flex items-baseline justify-between">
            <h4 className="font-display text-lg font-semibold text-gen">Generator output</h4>
            <span className={`font-sans tabular-nums text-xs ${!trainingD && playing ? 'text-gen-glow' : 'text-muted'}`}>
              {!trainingD && playing ? '● updating G' : 'G'}
            </span>
          </div>
          <div className="mx-auto mt-4 w-full max-w-[13rem] border border-line bg-bg p-1.5">
            <canvas
              ref={canvas}
              width={CW}
              height={CH}
              className="h-auto w-full"
              role="img"
              aria-label={`Generator sample at epoch ${epoch}: ${stageLabel(q)}.`}
            />
          </div>
          <p className="mt-3 text-center font-sans tabular-nums text-xs text-muted">
            sample quality · <span className="text-gen-glow">{stageLabel(q)}</span>
          </p>
        </div>

        {/* Discriminator */}
        <div
          className={`relative p-5 transition-colors lg:p-7 ${trainingD && playing ? 'bg-disc/[0.04]' : ''}`}
        >
          <div className="flex items-baseline justify-between">
            <h4 className="font-display text-lg font-semibold text-disc">Discriminator verdict</h4>
            <span className={`font-sans tabular-nums text-xs ${trainingD && playing ? 'text-disc-glow' : 'text-muted'}`}>
              {trainingD && playing ? '● updating D' : 'D'}
            </span>
          </div>
          <div className="mt-4 flex justify-center">
            <Gauge fake={fake} real={real} />
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-3 font-sans tabular-nums text-xs">
            <div className="border border-line p-2.5">
              <dt className="flex items-center gap-2 text-muted">
                <span aria-hidden="true" className="h-0.5 w-3 bg-gen" /> D(G(z))
              </dt>
              <dd className="mt-1 text-xl text-gen-glow">{fake.toFixed(2)}</dd>
            </div>
            <div className="border border-line p-2.5">
              <dt className="flex items-center gap-2 text-muted">
                <span aria-hidden="true" className="h-0.5 w-3 bg-bone/60" /> D(x) real
              </dt>
              <dd className="mt-1 text-xl text-bone">{real.toFixed(2)}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <p className="font-sans tabular-nums text-xs text-muted">D(G(z)) over epochs · target 0.5</p>
            <History epoch={epoch} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
        <button type="button" className="btn" onClick={togglePlay} aria-pressed={playing}>
          {playing ? 'Pause' : done ? 'Replay' : 'Play'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setPlaying(false);
            setEpoch(0);
          }}
        >
          Reset
        </button>
        <label className="flex min-w-[12rem] flex-1 items-center gap-3">
          <span className="font-sans tabular-nums text-xs text-muted">Scrub</span>
          <input
            type="range"
            min={0}
            max={MAX_EPOCH}
            value={epoch}
            onChange={(e) => {
              setPlaying(false);
              setEpoch(Number(e.target.value));
            }}
            className="range"
            aria-label="Epoch"
          />
        </label>
        <p
          className={`w-full font-sans tabular-nums text-xs ${done ? 'text-verdict' : 'text-muted'}`}
          aria-live="polite"
        >
          {done ? 'Equilibrium: D can no longer tell real from fake (≈ 0.5)' : 'G and D update in alternation'}
        </p>
      </div>
    </div>
  );
}
