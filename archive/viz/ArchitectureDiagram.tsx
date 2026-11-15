import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { centredParams } from '../../lib/scan';
import { ScanTile } from './ScanTile';

const CY = 128;
const DEPTH = 9;

interface Block {
  x: number;
  w: number;
  h: number;
  label: string;
}

const GEN: Block[] = [
  { x: 92, w: 30, h: 26, label: '4×4×512' },
  { x: 152, w: 24, h: 46, label: '8×8×256' },
  { x: 208, w: 18, h: 74, label: '16×16×128' },
  { x: 268, w: 13, h: 112, label: '32×32×64' },
];

const DISC: Block[] = [
  { x: 486, w: 13, h: 112, label: '32×32×64' },
  { x: 544, w: 18, h: 74, label: '16×16×128' },
  { x: 604, w: 24, h: 46, label: '8×8×256' },
  { x: 664, w: 30, h: 26, label: '4×4×512' },
];

function Slab({ b, tone, i }: { b: Block; tone: 'gen' | 'disc'; i: number }) {
  const color = tone === 'gen' ? 'var(--gen)' : 'var(--disc)';
  const y = CY - b.h / 2;
  return (
    <motion.g
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: (tone === 'gen' ? 0.1 : 0.7) + i * 0.1 }}
    >
      <polygon
        points={`${b.x},${y} ${b.x + DEPTH},${y - DEPTH} ${b.x + b.w + DEPTH},${y - DEPTH} ${b.x + b.w},${y}`}
        fill={color}
        fillOpacity="0.35"
      />
      <polygon
        points={`${b.x + b.w},${y} ${b.x + b.w + DEPTH},${y - DEPTH} ${b.x + b.w + DEPTH},${y + b.h - DEPTH} ${b.x + b.w},${y + b.h}`}
        fill={color}
        fillOpacity="0.22"
      />
      <rect x={b.x} y={y} width={b.w} height={b.h} fill="var(--bg)" stroke={color} strokeWidth="1.5" />
      <rect x={b.x} y={y} width={b.w} height={b.h} fill={color} fillOpacity="0.14" />
      <text x={b.x + b.w / 2} y={CY + 76} textAnchor="middle" className="fill-muted font-sans tabular-nums text-[10px]">
        {b.label}
      </text>
    </motion.g>
  );
}

/** Animated DCGAN pipeline: z → transposed convs → 64×64 scan → convs → P(real). */
export function ArchitectureDiagram() {
  const params = useMemo(() => centredParams(77), []);
  return (
    <figure>
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 860 236"
          className="min-w-[720px]"
          role="img"
          aria-label="DCGAN architecture: a 100-dimensional noise vector z passes through four transposed-convolution blocks to produce a 64 by 64 grayscale scan, which four convolution blocks in the discriminator reduce to a single real-or-fake probability."
        >
          <line x1="28" x2="830" y1={CY} y2={CY} stroke="var(--line)" strokeWidth="1.5" />

          <text x="92" y="22" className="fill-gen font-sans tabular-nums text-[11px]">
            Generator · transposed conv + BN
          </text>
          <text x="486" y="22" className="fill-disc font-sans tabular-nums text-[11px]">
            Discriminator · conv + BN
          </text>

          {/* z */}
          <rect x="24" y={CY - 46} width="12" height="92" fill="var(--bg)" stroke="var(--bone)" strokeOpacity="0.6" />
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x="26" y={CY - 43 + i * 9} width="8" height="6" fill="var(--bone)" fillOpacity={0.15 + ((i * 37) % 10) / 14} />
          ))}
          <text x="30" y={CY + 64} textAnchor="middle" className="fill-bone font-sans tabular-nums text-[12px]">
            z
          </text>
          <text x="30" y={CY + 76} textAnchor="middle" className="fill-muted font-sans tabular-nums text-[10px]">
            100-d
          </text>

          {GEN.map((b, i) => (
            <Slab key={b.x} b={b} tone="gen" i={i} />
          ))}

          {/* Generated scan */}
          <foreignObject x="340" y={CY - 56} width="94" height="112">
            <div className="h-full w-full border border-bone/50">
              <ScanTile params={params} seed={9} width={94} height={112} />
            </div>
          </foreignObject>
          <text x="387" y={CY + 76} textAnchor="middle" className="fill-gen-glow font-sans tabular-nums text-[10px]">
            64×64×1 · G(z)
          </text>

          {DISC.map((b, i) => (
            <Slab key={b.x} b={b} tone="disc" i={i} />
          ))}

          {/* Sigmoid output */}
          <circle cx="760" cy={CY} r="20" fill="var(--bg)" stroke="var(--disc)" strokeWidth="1.5" />
          <text x="760" y={CY + 4} textAnchor="middle" className="fill-disc font-sans tabular-nums text-[12px]">
            σ
          </text>
          <text x="760" y={CY + 76} textAnchor="middle" className="fill-muted font-sans tabular-nums text-[10px]">
            sigmoid
          </text>
          <text x="796" y={CY - 6} className="fill-verdict font-sans tabular-nums text-[12px]">
            P(real)
          </text>
          <text x="796" y={CY + 12} className="fill-muted font-sans tabular-nums text-[10px]">
            ∈ [0, 1]
          </text>

          {/* Flowing data pulses */}
          <circle cx="40" cy={CY} r="4" fill="var(--gen-glow)" style={{ animation: 'arch-flow 2.8s linear infinite' }} />
          <circle cx="440" cy={CY} r="4" fill="var(--disc-glow)" style={{ animation: 'arch-flow 2.8s linear 1.4s infinite backwards' }} />
        </svg>
      </div>
      <figcaption className="mt-3 font-sans tabular-nums text-[13px] text-muted md:hidden">
        Scroll sideways to see the full diagram
      </figcaption>
    </figure>
  );
}
