/**
 * A tiny, real GAN that runs in the browser: two small fully connected
 * networks trained with backpropagation and Adam on 2-D points.
 * Same adversarial game as an image GAN, small enough to watch live.
 */

type Act = 'lrelu' | 'linear';

class Dense {
  W: Float64Array;
  b: Float64Array;
  gW: Float64Array;
  gb: Float64Array;
  private mW: Float64Array;
  private vW: Float64Array;
  private mb: Float64Array;
  private vb: Float64Array;
  private x: Float64Array = new Float64Array(0);
  private z: Float64Array = new Float64Array(0);
  private n = 0;

  constructor(
    readonly inSize: number,
    readonly outSize: number,
    readonly act: Act,
    rand: () => number,
  ) {
    const scale = Math.sqrt(2 / inSize);
    this.W = Float64Array.from({ length: inSize * outSize }, () => gauss(rand) * scale * (act === 'linear' ? 0.5 : 1));
    this.b = new Float64Array(outSize);
    this.gW = new Float64Array(this.W.length);
    this.gb = new Float64Array(outSize);
    this.mW = new Float64Array(this.W.length);
    this.vW = new Float64Array(this.W.length);
    this.mb = new Float64Array(outSize);
    this.vb = new Float64Array(outSize);
  }

  forward(x: Float64Array, n: number): Float64Array {
    const { inSize: I, outSize: O, W, b } = this;
    const z = new Float64Array(n * O);
    for (let r = 0; r < n; r++)
      for (let o = 0; o < O; o++) {
        let s = b[o];
        for (let i = 0; i < I; i++) s += x[r * I + i] * W[o * I + i];
        z[r * O + o] = s;
      }
    this.x = x;
    this.z = z;
    this.n = n;
    if (this.act === 'linear') return z;
    const a = new Float64Array(z.length);
    for (let k = 0; k < z.length; k++) a[k] = z[k] > 0 ? z[k] : 0.2 * z[k];
    return a;
  }

  backward(da: Float64Array): Float64Array {
    const { inSize: I, outSize: O, W, x, z, n } = this;
    const dz = new Float64Array(da.length);
    for (let k = 0; k < da.length; k++) dz[k] = this.act === 'linear' || z[k] > 0 ? da[k] : 0.2 * da[k];
    const dx = new Float64Array(n * I);
    for (let r = 0; r < n; r++)
      for (let o = 0; o < O; o++) {
        const g = dz[r * O + o];
        if (g === 0) continue;
        this.gb[o] += g;
        for (let i = 0; i < I; i++) {
          this.gW[o * I + i] += g * x[r * I + i];
          dx[r * I + i] += g * W[o * I + i];
        }
      }
    return dx;
  }

  zero() {
    this.gW.fill(0);
    this.gb.fill(0);
  }

  adam(lr: number, t: number, b1 = 0.5, b2 = 0.999) {
    const c1 = 1 - Math.pow(b1, t);
    const c2 = 1 - Math.pow(b2, t);
    const step = (p: Float64Array, g: Float64Array, m: Float64Array, v: Float64Array) => {
      for (let k = 0; k < p.length; k++) {
        m[k] = b1 * m[k] + (1 - b1) * g[k];
        v[k] = b2 * v[k] + (1 - b2) * g[k] * g[k];
        p[k] -= (lr * (m[k] / c1)) / (Math.sqrt(v[k] / c2) + 1e-8);
      }
    };
    step(this.W, this.gW, this.mW, this.vW);
    step(this.b, this.gb, this.mb, this.vb);
  }
}

class MLP {
  layers: Dense[];
  constructor(sizes: number[], rand: () => number) {
    this.layers = sizes.slice(1).map((s, i) => new Dense(sizes[i], s, i === sizes.length - 2 ? 'linear' : 'lrelu', rand));
  }
  forward(x: Float64Array, n: number) {
    return this.layers.reduce((a, l) => l.forward(a, n), x);
  }
  backward(d: Float64Array) {
    return this.layers.reduceRight((g, l) => l.backward(g), d);
  }
  zero() {
    this.layers.forEach((l) => l.zero());
  }
  adam(lr: number, t: number) {
    this.layers.forEach((l) => l.adam(lr, t));
  }
}

export function gauss(rand: () => number) {
  const u = 1 - rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export type Target = 'ring' | 'clusters' | 'spiral' | 'moons';

export const TARGETS: { id: Target; label: string; hint: string }[] = [
  { id: 'ring', label: 'Ring', hint: 'A circle: easy to learn' },
  { id: 'clusters', label: '8 clusters', hint: 'Watch for mode collapse: G may cover only some clusters' },
  { id: 'spiral', label: 'Spiral', hint: 'A long, curved shape: harder' },
  { id: 'moons', label: 'Two moons', hint: 'Two interlocking arcs' },
];

/** Draw one real sample from the target distribution. */
export function sampleTarget(t: Target, rand: () => number): [number, number] {
  if (t === 'ring') {
    const a = rand() * Math.PI * 2;
    const r = 1 + gauss(rand) * 0.05;
    return [Math.cos(a) * r, Math.sin(a) * r];
  }
  if (t === 'clusters') {
    const k = Math.floor(rand() * 8);
    const a = (k / 8) * Math.PI * 2;
    return [Math.cos(a) + gauss(rand) * 0.06, Math.sin(a) + gauss(rand) * 0.06];
  }
  if (t === 'spiral') {
    const s = rand();
    const r = 0.15 + 0.95 * s;
    const a = s * Math.PI * 3.4;
    return [Math.cos(a) * r + gauss(rand) * 0.03, Math.sin(a) * r + gauss(rand) * 0.03];
  }
  const upper = rand() < 0.5;
  const a = rand() * Math.PI;
  return upper
    ? [Math.cos(a) - 0.5 + gauss(rand) * 0.05, Math.sin(a) - 0.25 + gauss(rand) * 0.05]
    : [1 - Math.cos(a) - 0.5 + gauss(rand) * 0.05, 0.25 - Math.sin(a) + gauss(rand) * 0.05];
}

export interface StepStats {
  dLoss: number;
  gLoss: number;
  dReal: number; // mean D(x) on real points
  dFake: number; // mean D(G(z)) on generated points
}

export class TinyGAN {
  readonly G: MLP;
  readonly D: MLP;
  steps = 0;
  private rand: () => number;

  constructor(
    public target: Target,
    seed = 1,
    public lr = 0.002,
    public batch = 64,
  ) {
    let s = seed >>> 0 || 1;
    this.rand = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    this.G = new MLP([2, 32, 32, 2], this.rand);
    this.D = new MLP([2, 32, 32, 1], this.rand);
  }

  noise(n: number) {
    return Float64Array.from({ length: n * 2 }, () => gauss(this.rand));
  }

  generate(z: Float64Array, n: number) {
    return this.G.forward(z, n);
  }

  /** D's probability that each point is real. */
  judge(x: Float64Array, n: number) {
    const logits = this.D.forward(x, n);
    return logits.map(sigmoid);
  }

  /** One round of the game: update D on real vs fake, then update G to fool D. */
  step(): StepStats {
    const n = this.batch;
    this.steps++;
    const t = this.steps;

    // --- Discriminator ---
    const real = new Float64Array(n * 2);
    for (let i = 0; i < n; i++) {
      const [x, y] = sampleTarget(this.target, this.rand);
      real[i * 2] = x;
      real[i * 2 + 1] = y;
    }
    const fake = this.G.forward(this.noise(n), n);
    this.D.zero();
    const lr = this.D.forward(real, n);
    let dLoss = 0;
    let dReal = 0;
    const gr = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const p = sigmoid(lr[i]);
      dReal += p;
      dLoss -= Math.log(p + 1e-8);
      gr[i] = (p - 1) / n;
    }
    this.D.backward(gr);
    const lf = this.D.forward(fake, n);
    const gf = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const p = sigmoid(lf[i]);
      dLoss -= Math.log(1 - p + 1e-8);
      gf[i] = p / n;
    }
    this.D.backward(gf);
    this.D.adam(this.lr, t);

    // --- Generator (non-saturating loss: maximise log D(G(z))) ---
    this.G.zero();
    const z = this.noise(n);
    const gen = this.G.forward(z, n);
    const lg = this.D.forward(gen, n);
    let gLoss = 0;
    let dFake = 0;
    const gg = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const p = sigmoid(lg[i]);
      dFake += p;
      gLoss -= Math.log(p + 1e-8);
      gg[i] = (p - 1) / n;
    }
    const dx = this.D.backward(gg);
    this.D.zero(); // D is frozen during the G update
    this.G.backward(dx);
    this.G.adam(this.lr, t);

    return { dLoss: dLoss / n, gLoss: gLoss / n, dReal: dReal / n, dFake: dFake / n };
  }
}
