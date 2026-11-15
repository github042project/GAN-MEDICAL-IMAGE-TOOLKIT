import { useCallback, useEffect, useRef, useState } from 'react';
import { Section } from '../components/ui/Section';
import { Button } from '../components/ui/Button';
import { TARGETS, TinyGAN, gauss, sampleTarget, type StepStats, type Target } from '../lib/gan2d';
import { mulberry32 } from '../lib/random';
import { useInView, usePageVisible } from '../lib/hooks';

const SIZE = 520; // canvas CSS px (square)
const RANGE = 1.7; // world units shown from centre to edge
const GRID = 44; // D heat-map resolution
const POINTS = 420;
const HISTORY = 320;

const SPEEDS = [
  { label: 'Slow', steps: 1 },
  { label: 'Normal', steps: 4 },
  { label: 'Fast', steps: 12 },
];

function fixedReal(target: Target) {
  const r = mulberry32(99);
  return Array.from({ length: POINTS }, () => sampleTarget(target, r));
}
function fixedNoise() {
  const r = mulberry32(7);
  return Float64Array.from({ length: POINTS * 2 }, () => gauss(r));
}

function LossChart({ hist }: { hist: StepStats[] }) {
  const W = 300;
  const H = 90;
  const max = Math.max(2, ...hist.map((h) => Math.max(h.dLoss, h.gLoss)));
  const line = (k: 'dLoss' | 'gLoss') =>
    hist.map((h, i) => `${i === 0 ? 'M' : 'L'}${((i / (HISTORY - 1)) * W).toFixed(1)} ${(H - (Math.min(h[k], max) / max) * (H - 4)).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" preserveAspectRatio="none" aria-label="Loss over time">
      <path d={line('dLoss')} fill="none" stroke="#3DD6F5" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <path d={line('gLoss')} fill="none" stroke="#FF8A3D" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function PlaygroundPage() {
  const [target, setTarget] = useState<Target>('ring');
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [lr, setLr] = useState(0.002);
  const [heat, setHeat] = useState(true);
  const [stats, setStats] = useState<StepStats | null>(null);
  const [steps, setSteps] = useState(0);
  const [hist, setHist] = useState<StepStats[]>([]);
  const [seed, setSeed] = useState(1);

  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const gan = useRef<TinyGAN | null>(null);
  const real = useRef(fixedReal('ring'));
  const z = useRef(fixedNoise());
  const heatCanvas = useRef<HTMLCanvasElement | null>(null);
  const histRef = useRef<StepStats[]>([]);
  const inView = useInView(wrap);
  const visible = usePageVisible();

  const reset = useCallback((t: Target, s: number, rate: number) => {
    gan.current = new TinyGAN(t, s, rate);
    real.current = fixedReal(t);
    histRef.current = [];
    setHist([]);
    setStats(null);
    setSteps(0);
  }, []);

  useEffect(() => reset(target, seed, lr), [target, seed, reset]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (gan.current) gan.current.lr = lr;
  }, [lr]);

  const draw = useCallback(() => {
    const c = canvas.current;
    const g = gan.current;
    const ctx = c?.getContext('2d');
    if (!c || !g || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = c.clientWidth;
    if (c.width !== Math.round(px * dpr)) {
      c.width = Math.round(px * dpr);
      c.height = Math.round(px * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const toX = (x: number) => ((x + RANGE) / (2 * RANGE)) * px;
    const toY = (y: number) => ((RANGE - y) / (2 * RANGE)) * px;

    ctx.fillStyle = '#07090D';
    ctx.fillRect(0, 0, px, px);

    // Discriminator's opinion of every point on the plane.
    if (heat) {
      heatCanvas.current ??= Object.assign(document.createElement('canvas'), { width: GRID, height: GRID });
      const hctx = heatCanvas.current.getContext('2d')!;
      const pts = new Float64Array(GRID * GRID * 2);
      for (let j = 0; j < GRID; j++)
        for (let i = 0; i < GRID; i++) {
          const k = (j * GRID + i) * 2;
          pts[k] = -RANGE + ((i + 0.5) / GRID) * 2 * RANGE;
          pts[k + 1] = RANGE - ((j + 0.5) / GRID) * 2 * RANGE;
        }
      const d = g.judge(pts, GRID * GRID);
      const img = hctx.createImageData(GRID, GRID);
      for (let k = 0; k < d.length; k++) {
        const v = d[k];
        img.data[k * 4] = 7 + v * 30;
        img.data[k * 4 + 1] = 9 + v * 120;
        img.data[k * 4 + 2] = 13 + v * 150;
        img.data[k * 4 + 3] = 255;
      }
      hctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(heatCanvas.current, 0, 0, px, px);
    }

    // Axes.
    ctx.strokeStyle = 'rgba(138,148,166,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px / 2, 0);
    ctx.lineTo(px / 2, px);
    ctx.moveTo(0, px / 2);
    ctx.lineTo(px, px / 2);
    ctx.stroke();

    // Real points.
    ctx.fillStyle = 'rgba(232,228,218,0.55)';
    for (const [x, y] of real.current) ctx.fillRect(toX(x) - 1.5, toY(y) - 1.5, 3, 3);

    // Generated points from a fixed set of noise vectors, so you can watch them move.
    const gen = g.generate(z.current, POINTS);
    ctx.fillStyle = '#FF8A3D';
    ctx.shadowColor = 'rgba(255,138,61,0.8)';
    ctx.shadowBlur = 6;
    for (let i = 0; i < POINTS; i++) {
      ctx.beginPath();
      ctx.arc(toX(gen[i * 2]), toY(gen[i * 2 + 1]), 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }, [heat]);

  useEffect(() => draw(), [draw, target, seed]);

  // Training loop: several optimisation steps per animation frame.
  useEffect(() => {
    if (!running || !inView || !visible) return;
    let raf = 0;
    let frame = 0;
    const tick = () => {
      const g = gan.current;
      if (!g) return;
      let s: StepStats | null = null;
      for (let i = 0; i < SPEEDS[speed].steps; i++) {
        s = g.step();
        histRef.current.push(s);
      }
      if (histRef.current.length > HISTORY) histRef.current.splice(0, histRef.current.length - HISTORY);
      draw();
      if (++frame % 4 === 0 && s) {
        setStats(s);
        setSteps(g.steps);
        setHist([...histRef.current]);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, inView, visible, speed, draw]);

  const stepOnce = () => {
    const g = gan.current;
    if (!g) return;
    const s = g.step();
    histRef.current.push(s);
    setStats(s);
    setSteps(g.steps);
    setHist([...histRef.current]);
    draw();
  };

  const verdict = !stats
    ? 'Press Train to start the duel.'
    : stats.dFake > 0.4 && stats.dReal < 0.65
      ? 'Close to balance: D can barely tell real from fake. This is what training aims for.'
      : stats.dReal - stats.dFake > 0.5
        ? 'D is winning: it separates real from fake easily. G is still learning.'
        : 'The duel is on: both networks are adjusting to each other.';

  return (
    <Section
      id="playground"
      className="pt-32 lg:pt-36"
      title={
        <>
          Live GAN <span className="text-gen">Playground</span>
        </>
      }
      lede="A real GAN, training right now in your browser. Two small neural networks learn by backpropagation: the Generator tries to copy a shape, the Discriminator tries to tell its points from the real ones. Same game as image GANs, in two dimensions so you can watch it."
    >
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div ref={wrap} className="lg:col-span-7">
          <div className="panel overflow-hidden p-3">
            <canvas ref={canvas} className="block aspect-square w-full rounded-lg" style={{ maxWidth: SIZE * 1.4 }} aria-label="Real points in white, generated points in orange, Discriminator confidence as background brightness" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-bone/60" /> real data</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gen shadow-[0_0_6px_rgba(255,138,61,0.8)]" /> Generator output</span>
            {heat && <span className="flex items-center gap-1.5"><span className="h-2.5 w-6 rounded-sm bg-gradient-to-r from-[#07090D] to-[#25819F]" /> brighter = D thinks “real”</span>}
          </div>
        </div>

        <aside className="space-y-5 lg:col-span-5">
          <div className="panel p-6">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setRunning((r) => !r)} arrow={!running}>
                {running ? 'Pause' : steps ? 'Resume training' : 'Train'}
              </Button>
              <Button variant="secondary" onClick={stepOnce}>
                One step
              </Button>
              <Button variant="secondary" onClick={() => setSeed((s) => s + 1)}>
                Reset
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted">Shape to learn</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {TARGETS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={target === t.id}
                  title={t.hint}
                  onClick={() => setTarget(t.id)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${target === t.id ? 'border-gen bg-gen/15 text-gen-glow' : 'border-line text-muted hover:text-bone'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">{TARGETS.find((t) => t.id === target)?.hint}</p>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted">Speed</p>
                <div className="mt-2 flex rounded-lg border border-line p-1">
                  {SPEEDS.map((s, i) => (
                    <button key={s.label} type="button" aria-pressed={speed === i} onClick={() => setSpeed(i)} className={`flex-1 rounded-md py-1 text-xs transition-colors ${speed === i ? 'bg-disc text-bg' : 'text-muted hover:text-bone'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-sm text-muted">Learning rate</span>
                <select value={lr} onChange={(e) => setLr(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-bone outline-none focus:border-disc">
                  <option value={0.0005}>0.0005 (careful)</option>
                  <option value={0.002}>0.002 (default)</option>
                  <option value={0.008}>0.008 (unstable)</option>
                </select>
              </label>
            </div>
            <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-bone">
              <input type="checkbox" className="h-4 w-4 accent-[#3DD6F5]" checked={heat} onChange={(e) => setHeat(e.target.checked)} />
              Show what the Discriminator thinks
            </label>
          </div>

          <div className="panel p-6">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-lg text-bone">Training</p>
              <p className="text-sm tabular-nums text-muted">step {steps.toLocaleString('en-US')}</p>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted">D(real)</dt>
                <dd className="font-display text-2xl tabular-nums text-bone">{stats ? stats.dReal.toFixed(2) : '–'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">D(G(z)) · fooled</dt>
                <dd className="font-display text-2xl tabular-nums text-gen-glow">{stats ? stats.dFake.toFixed(2) : '–'}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <div className="flex gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-disc" /> D loss</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-gen" /> G loss</span>
              </div>
              <LossChart hist={hist} />
            </div>
            <p className="mt-3 rounded-lg border border-line/80 bg-bg/50 px-3 py-2 text-sm text-bone/85" aria-live="polite">
              {verdict}
            </p>
          </div>

          <p className="text-xs leading-relaxed text-muted">
            Networks: Generator 2 → 32 → 32 → 2, Discriminator 2 → 32 → 32 → 1, leaky ReLU, Adam optimiser, batch of 64.
            Results vary from run to run, just like real GAN training. Press Reset to try again with new starting weights.
          </p>
        </aside>
      </div>
    </Section>
  );
}
