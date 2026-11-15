import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Section } from '../components/ui/Section';
import { Button } from '../components/ui/Button';
import { drawGenerated, paramsFromSeed } from '../lib/scan';
import { lerp, mulberry32 } from '../lib/random';

const W = 240;
const H = 288;
const ROUNDS = 10;
const ROUND_MS = 12000;
const BEST_KEY = 'gan-spot-best';

type Tell = 'checker' | 'ghost' | 'blotch' | 'blur';

const TELLS: Record<Tell, { name: string; why: string }> = {
  checker: {
    name: 'Checkerboard texture',
    why: 'Upsampling layers in a generator can leave a faint grid pattern across the image.',
  },
  ghost: {
    name: 'Ghosted edges',
    why: 'Ribs and borders look doubled, as if two scans were blended. Real anatomy has one clean edge.',
  },
  blotch: {
    name: 'Impossible blotches',
    why: 'Bright patches sit where nothing anatomical should be. The generator learned texture, not anatomy.',
  },
  blur: {
    name: 'Soft, noisy detail',
    why: 'Fine structure is smeared and grainy: the generator has not yet learned sharp detail.',
  },
};

interface Round {
  fakeSide: 0 | 1;
  seeds: [number, number];
  tell: Tell;
}

function makeRound(index: number, salt: number): Round {
  const r = mulberry32(salt * 131 + index * 7 + 3);
  const tells: Tell[] = ['checker', 'ghost', 'blotch', 'blur'];
  return {
    fakeSide: r() < 0.5 ? 0 : 1,
    seeds: [Math.floor(r() * 1e6), Math.floor(r() * 1e6)],
    tell: tells[Math.floor(r() * tells.length)],
  };
}

/** Draws a real-looking scan, or a fake with a tell whose strength fades with difficulty. */
function paint(canvas: HTMLCanvasElement, seed: number, fake: boolean, tell: Tell, difficulty: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const r = mulberry32(seed);
  const p = paramsFromSeed(seed, r() < 0.5 ? r() * 0.9 : 0);
  if (!fake) {
    drawGenerated(ctx, W, H, p, 1, seed);
    return;
  }
  const q = tell === 'blur' ? lerp(0.6, 0.9, difficulty) : lerp(0.85, 0.97, difficulty);
  drawGenerated(ctx, W, H, p, q, seed);
  const strength = lerp(1, 0.35, difficulty);

  if (tell === 'checker') {
    ctx.fillStyle = `rgba(255,255,255,${0.09 * strength})`;
    for (let y = 0; y < H; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < W; x += 8) ctx.fillRect(x, y, 4, 4);
  } else if (tell === 'ghost') {
    const snap = document.createElement('canvas');
    snap.width = W;
    snap.height = H;
    snap.getContext('2d')!.drawImage(canvas, 0, 0);
    ctx.globalAlpha = 0.4 * strength + 0.1;
    ctx.drawImage(snap, lerp(9, 5, difficulty), lerp(5, 3, difficulty));
    ctx.globalAlpha = 1;
  } else if (tell === 'blotch') {
    for (let i = 0; i < 3; i++) {
      const x = W * (0.15 + r() * 0.7);
      const y = H * (0.1 + r() * 0.8);
      const rad = 10 + r() * 18;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(255,255,255,${0.55 * strength + 0.1})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }
}

function rank(acc: number) {
  if (acc >= 0.9) return { title: 'Expert Discriminator', note: 'A generator would struggle to fool you.' };
  if (acc >= 0.7) return { title: 'Sharp-eyed detective', note: 'You caught most fakes. The subtle ones got through.' };
  if (acc >= 0.5) return { title: 'Getting there', note: 'Better than a coin flip. Look for grids, doubled edges and odd blotches.' };
  return { title: 'Fooled by the forger', note: 'The generator wins this time. That is exactly what a good GAN aims for.' };
}

function ScanCard({
  side,
  round,
  index,
  picked,
  showPick,
  onPick,
}: {
  side: 0 | 1;
  round: Round;
  index: number;
  picked: 0 | 1 | null;
  showPick: boolean;
  onPick: (side: 0 | 1) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) paint(ref.current, round.seeds[side], round.fakeSide === side, round.tell, index / (ROUNDS - 1));
  }, [round, side, index]);

  const revealed = picked !== null;
  const isFake = round.fakeSide === side;
  const ring = !revealed
    ? 'border-line hover:border-disc hover:shadow-[0_0_30px_-6px_rgba(61,214,245,0.6)]'
    : isFake
      ? 'border-gen shadow-[0_0_30px_-6px_rgba(255,138,61,0.7)]'
      : 'border-verdict/70';

  return (
    <button
      type="button"
      disabled={revealed}
      onClick={() => onPick(side)}
      aria-label={`Scan ${side === 0 ? 'A' : 'B'}: mark as fake`}
      className={`group relative overflow-hidden rounded-2xl border-2 bg-bg p-2 transition-all duration-300 enabled:hover:-translate-y-1 ${ring}`}
    >
      <canvas ref={ref} width={W} height={H} className="block aspect-[5/6] w-full rounded-lg" />
      <span className="absolute left-4 top-4 rounded-md bg-bg/85 px-2 py-1 font-display text-sm text-bone">
        {side === 0 ? 'A' : 'B'} <span className="text-muted">· key {side + 1}</span>
      </span>
      {!revealed && (
        <span className="absolute inset-x-4 bottom-4 translate-y-2 rounded-lg bg-disc px-3 py-2 text-center text-sm font-medium text-bg opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
          This one is fake
        </span>
      )}
      {revealed && (
        <span
          className={`absolute inset-x-4 bottom-4 rounded-lg px-3 py-2 text-center text-sm font-medium ${
            isFake ? 'bg-gen text-bg' : 'bg-verdict text-bg'
          }`}
        >
          {isFake ? 'Generated' : 'Real-style scan'}
          {showPick && picked === side ? " · your pick" : ""}
        </span>
      )}
    </button>
  );
}

export default function GamePage() {
  const [salt, setSalt] = useState(() => Math.floor(Math.random() * 1e6));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [best, setBest] = useState(() => {
    try {
      return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      return 0;
    }
  });
  const [round, setRound] = useState(() => makeRound(0, salt));
  const [lastGain, setLastGain] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  const pick = useCallback(
    (side: 0 | 1 | -1) => {
      if (picked !== null || done || !started) return;
      const hit = side === round.fakeSide;
      const speed = Math.max(0, timeLeft / ROUND_MS);
      const gain = hit ? Math.round((100 + 50 * speed) * (1 + Math.min(streak, 4) * 0.25)) : 0;
      setTimedOut(side === -1);
      setPicked(side === -1 ? (round.fakeSide === 0 ? 1 : 0) : side);
      setLastGain(gain);
      setScore((s) => s + gain);
      setCorrect((c) => c + (hit ? 1 : 0));
      setStreak((s) => (hit ? s + 1 : 0));
    },
    [picked, done, started, round, timeLeft, streak],
  );

  const next = useCallback(() => {
    if (index + 1 >= ROUNDS) {
      setDone(true);
      return;
    }
    const n = index + 1;
    setIndex(n);
    setRound(makeRound(n, salt));
    setPicked(null);
    setTimeLeft(ROUND_MS);
  }, [index, salt]);

  const restart = () => {
    const s = Math.floor(Math.random() * 1e6);
    setSalt(s);
    setIndex(0);
    setRound(makeRound(0, s));
    setPicked(null);
    setScore(0);
    setCorrect(0);
    setStreak(0);
    setDone(false);
    setStarted(true);
    setTimeLeft(ROUND_MS);
  };

  // Countdown while a round is open; running out counts as a miss.
  useEffect(() => {
    if (!started || done || picked !== null) return;
    const t0 = performance.now() - (ROUND_MS - timeLeft);
    const id = window.setInterval(() => {
      const left = Math.max(0, ROUND_MS - (performance.now() - t0));
      setTimeLeft(left);
      if (left === 0) pick(-1);
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, done, picked, index]);

  useEffect(() => {
    if (done && score > best) {
      setBest(score);
      try {
        localStorage.setItem(BEST_KEY, String(score));
      } catch {
        /* storage unavailable */
      }
    }
  }, [done, score, best]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '1' || e.key.toLowerCase() === 'a') pick(0);
      else if (e.key === '2' || e.key.toLowerCase() === 'b') pick(1);
      else if (e.key === 'Enter' && picked !== null && !done) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pick, next, picked, done]);

  const hit = picked !== null && picked === round.fakeSide && lastGain > 0;
  const acc = correct / ROUNDS;
  const result = rank(acc);
  const difficulty = ['Easy', 'Easy', 'Easy', 'Medium', 'Medium', 'Medium', 'Hard', 'Hard', 'Expert', 'Expert'][index];

  return (
    <Section
      id="game"
      className="pt-32 lg:pt-36"
      title={
        <>
          Spot the <span className="text-gen">Fake</span>
        </>
      }
      lede="You are the Discriminator. Each round shows two scans: one is generated. Pick the fake before the timer runs out. It gets harder every round."
    >
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Scoreboard */}
        <aside className="panel h-fit p-6 lg:col-span-3">
          <dl className="grid grid-cols-2 gap-5 lg:grid-cols-1">
            <div>
              <dt className="text-sm text-muted">Score</dt>
              <dd className="mt-1 font-display text-4xl tabular-nums text-bone">{score}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Round</dt>
              <dd className="mt-1 font-display text-2xl tabular-nums text-bone">
                {Math.min(index + 1, ROUNDS)} <span className="text-muted">/ {ROUNDS}</span>
              </dd>
              <dd className="mt-1 text-sm text-disc">{difficulty}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Streak</dt>
              <dd className="mt-1 font-display text-2xl tabular-nums text-gen-glow">
                {streak > 0 ? `${streak} 🔥` : '0'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Best score</dt>
              <dd className="mt-1 font-display text-2xl tabular-nums text-verdict">{best}</dd>
            </div>
          </dl>
          <div className="mt-6 flex gap-1" aria-hidden="true">
            {Array.from({ length: ROUNDS }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < index || done ? 'bg-disc' : i === index ? 'bg-disc/50' : 'bg-line'}`} />
            ))}
          </div>
          <p className="mt-6 text-xs leading-relaxed text-muted">Keys: 1 or A for the left scan, 2 or B for the right, Enter for next.</p>
        </aside>

        {/* Board */}
        <div className="relative lg:col-span-9">
          {!started ? (
            <div className="panel flex min-h-[28rem] flex-col items-center justify-center gap-6 p-8 text-center">
              <span className="font-display text-6xl" aria-hidden="true">
                <span className="text-disc">D</span>
                <span className="text-muted"> vs </span>
                <span className="text-gen">G</span>
              </span>
              <p className="max-w-md text-[15px] leading-relaxed text-muted">
                Ten rounds, twelve seconds each. Faster correct answers and streaks score more. Every scan is drawn in
                code; none is patient data.
              </p>
              <Button onClick={restart} arrow>
                Start game
              </Button>
            </div>
          ) : done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="panel flex min-h-[28rem] flex-col items-center justify-center gap-4 p-8 text-center"
            >
              <p className="text-sm text-muted">Final score</p>
              <p className="font-display text-7xl tabular-nums text-bone">{score}</p>
              {score >= best && score > 0 && <p className="rounded-full bg-verdict/15 px-3 py-1 text-sm text-verdict">New best score</p>}
              <p className="mt-2 font-display text-3xl text-gen-glow">{result.title}</p>
              <p className="max-w-md text-[15px] text-muted">
                You caught {correct} of {ROUNDS} fakes ({Math.round(acc * 100)}% accuracy). {result.note}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Button onClick={restart} arrow>
                  Play again
                </Button>
                <Button href="#learn" variant="secondary">
                  How GANs make fakes
                </Button>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                <div
                  className={`h-full rounded-full transition-[width] duration-100 ${timeLeft < 3000 ? 'bg-gen' : 'bg-disc'}`}
                  style={{ width: `${(timeLeft / ROUND_MS) * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <ScanCard side={0} round={round} index={index} picked={picked} showPick={!timedOut} onPick={pick} />
                <ScanCard side={1} round={round} index={index} picked={picked} showPick={!timedOut} onPick={pick} />
              </div>
              <AnimatePresence>
                {picked !== null && (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-5 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center ${
                      hit ? 'border-verdict/50 bg-verdict/[0.06]' : 'border-gen/50 bg-gen/[0.06]'
                    }`}
                    role="status"
                  >
                    <div className="flex-1">
                      <p className={`font-display text-xl ${hit ? 'text-verdict' : 'text-gen-glow'}`}>
                        {hit ? `Caught it! +${lastGain}` : timedOut ? "Out of time" : 'Fooled!'}
                      </p>
                      <p className="mt-1 text-[15px] text-muted">
                        <span className="text-bone">The tell: {TELLS[round.tell].name}.</span> {TELLS[round.tell].why}
                      </p>
                    </div>
                    <Button onClick={next} arrow>
                      {index + 1 >= ROUNDS ? 'See results' : 'Next round'}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}
