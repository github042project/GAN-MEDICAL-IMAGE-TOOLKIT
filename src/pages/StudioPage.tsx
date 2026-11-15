import { useEffect, useMemo, useRef, useState } from 'react';
import { Section } from '../components/ui/Section';
import { Button } from '../components/ui/Button';
import { centredParams, drawScan, paramsFromSeed, type ScanParams } from '../lib/scan';
import { lerp } from '../lib/random';
import { makeZip, saveBlob } from '../lib/zip';

import { LAB_HANDOFF_KEY } from '../lib/keys';

const W = 360;
const H = 432;

type NumKey = 'lungW' | 'lungH' | 'heart' | 'ribGap' | 'tilt' | 'zoom' | 'exposure' | 'opacity';

const SLIDERS: { group: string; items: { k: NumKey; label: string; min: number; max: number; step: number; fmt: (v: number) => string }[] }[] = [
  {
    group: 'Anatomy',
    items: [
      { k: 'lungW', label: 'Lung width', min: 0.8, max: 1.15, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
      { k: 'lungH', label: 'Lung height', min: 0.88, max: 1.1, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
      { k: 'heart', label: 'Heart size', min: 0.75, max: 1.35, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
      { k: 'ribGap', label: 'Rib spacing', min: 0.9, max: 1.1, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
    ],
  },
  {
    group: 'Condition',
    items: [{ k: 'opacity', label: 'Pneumonia patch', min: 0, max: 1, step: 0.01, fmt: (v) => (v < 0.02 ? 'none' : `${Math.round(v * 100)}%`) }],
  },
  {
    group: 'Imaging',
    items: [
      { k: 'exposure', label: 'Exposure', min: 0.7, max: 1, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
      { k: 'zoom', label: 'Zoom', min: 0.8, max: 1.12, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
      { k: 'tilt', label: 'Tilt', min: -0.08, max: 0.08, step: 0.005, fmt: (v) => `${((v * 180) / Math.PI).toFixed(1)}°` },
    ],
  },
];

/** Blend two scans: numbers interpolate; random-pattern seeds switch halfway. */
function mix(a: ScanParams, b: ScanParams, t: number): ScanParams {
  const n = (k: keyof ScanParams) => lerp(a[k] as number, b[k] as number, t);
  return {
    lungW: n('lungW'),
    lungH: n('lungH'),
    heart: n('heart'),
    ribGap: n('ribGap'),
    tilt: n('tilt'),
    zoom: n('zoom'),
    dx: n('dx'),
    dy: n('dy'),
    exposure: n('exposure'),
    opacity: n('opacity'),
    patchSide: t < 0.5 ? a.patchSide : b.patchSide,
    patchSeed: t < 0.5 ? a.patchSeed : b.patchSeed,
    vesselSeed: t < 0.5 ? a.vesselSeed : b.vesselSeed,
  };
}

function render(p: ScanParams, w = W, h = H): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  drawScan(c.getContext('2d')!, w, h, p);
  return c;
}

const dataUrlBytes = (url: string) => {
  const bin = atob(url.slice(url.indexOf(',') + 1));
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
};

function Thumb({ p, label, active, onClick }: { p: ScanParams; label: string; active?: boolean; onClick?: () => void }) {
  const url = useMemo(() => render(p, 120, 144).toDataURL('image/png'), [p]);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-lg border transition-all hover:-translate-y-0.5 ${active ? 'border-gen shadow-[0_0_18px_-4px_rgba(255,138,61,0.7)]' : 'border-line hover:border-muted'}`}
    >
      <img src={url} alt="" className="block aspect-[5/6] w-full" />
      <span className="absolute inset-x-0 bottom-0 bg-bg/85 py-1 text-center text-[11px] text-bone">{label}</span>
    </button>
  );
}

export default function StudioPage() {
  const [p, setP] = useState<ScanParams>(() => centredParams(3, 0.6));
  const [a, setA] = useState<ScanParams>(() => centredParams(21, 0));
  const [b, setB] = useState<ScanParams>(() => ({ ...centredParams(48, 0.95), heart: 1.2, lungW: 0.9 }));
  const [t, setT] = useState(0);
  const [morphing, setMorphing] = useState(false);
  const [mode, setMode] = useState<'design' | 'morph'>('design');
  const [gallery, setGallery] = useState<ScanParams[]>([]);
  const [toast, setToast] = useState('');
  const view = useRef<HTMLCanvasElement>(null);

  const shown = mode === 'morph' ? mix(a, b, t) : p;

  useEffect(() => {
    const ctx = view.current?.getContext('2d');
    if (ctx) drawScan(ctx, W, H, shown);
  }, [shown]);

  // Ping-pong animation through the "latent space" between A and B.
  useEffect(() => {
    if (!morphing) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const phase = ((now - t0) / 4000) % 2;
      setT(phase < 1 ? phase : 2 - phase);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [morphing]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1800);
  };

  const randomise = () => setP({ ...paramsFromSeed(Math.floor(Math.random() * 1e6)), dx: 0, dy: 0 });
  const set = (k: NumKey, v: number) => setP((s) => ({ ...s, [k]: v }));

  const downloadPng = () => {
    render(shown, W * 2, H * 2).toBlob((bl) => bl && saveBlob(bl, `synthetic-scan-${Date.now()}.png`), 'image/png');
  };

  const filmstrip = useMemo(() => Array.from({ length: 7 }, (_, i) => mix(a, b, i / 6)), [a, b]);

  const downloadMorph = () => {
    const files = filmstrip.map((fp, i) => ({ name: `morph/frame_${i + 1}.png`, data: dataUrlBytes(render(fp).toDataURL('image/png')) }));
    saveBlob(makeZip(files), 'scan-morph.zip');
  };

  const downloadGallery = () => {
    const files = gallery.map((gp, i) => ({ name: `synthetic/scan_${String(i + 1).padStart(2, '0')}.png`, data: dataUrlBytes(render(gp).toDataURL('image/png')) }));
    saveBlob(makeZip(files), 'synthetic-scans.zip');
  };

  const sendToLab = () => {
    try {
      sessionStorage.setItem(LAB_HANDOFF_KEY, render(shown, 512, 512).toDataURL('image/png'));
    } catch {
      flash('Could not hand the scan over. Download it instead.');
      return;
    }
    window.location.hash = 'lab';
  };

  return (
    <Section
      id="studio"
      className="pt-32 lg:pt-36"
      title={
        <>
          Synthetic Scan <span className="text-disc">Studio</span>
        </>
      }
      lede="Design your own synthetic chest X-ray, then morph between two of them the way a GAN moves through its latent space. Every scan is drawn in code from a handful of numbers; none is patient data."
    >
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Preview */}
        <div className="lg:col-span-5">
          <div className="panel relative p-3">
            <canvas ref={view} width={W} height={H} className="block aspect-[5/6] w-full rounded-lg bg-black" aria-label="Synthetic chest X-ray preview" />
            <span className="absolute left-6 top-6 rounded-md bg-bg/80 px-2 py-1 text-xs text-muted">synthetic · not patient data</span>
            {toast && <span className="absolute inset-x-6 bottom-6 rounded-lg bg-verdict px-3 py-2 text-center text-sm font-medium text-bg">{toast}</span>}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={downloadPng}>Download PNG</Button>
            <Button variant="secondary" onClick={sendToLab} arrow>
              Augment in the Lab
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setGallery((g) => [shown, ...g].slice(0, 12));
                flash('Saved to your gallery');
              }}
            >
              Save to gallery
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="lg:col-span-7">
          <div className="flex rounded-xl border border-line bg-surface/70 p-1" role="tablist" aria-label="Studio mode">
            {(['design', 'morph'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setMorphing(false);
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${mode === m ? 'bg-disc text-bg' : 'text-muted hover:text-bone'}`}
              >
                {m === 'design' ? '🎛 Design a scan' : '🌀 Morph between two'}
              </button>
            ))}
          </div>

          {mode === 'design' ? (
            <div className="panel mt-5 p-6">
              <div className="flex flex-wrap gap-2">
                <Button onClick={randomise}>🎲 Random patient</Button>
                <Button variant="secondary" onClick={() => setP((s) => ({ ...s, patchSide: s.patchSide === 1 ? -1 : 1 }))}>
                  Patch side: {p.patchSide === 1 ? 'right' : 'left'}
                </Button>
                <Button variant="secondary" onClick={() => setP((s) => ({ ...s, patchSeed: Math.floor(Math.random() * 1e6), vesselSeed: Math.floor(Math.random() * 1e6) }))}>
                  New texture
                </Button>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                {SLIDERS.map((g) => (
                  <fieldset key={g.group} className={g.group === 'Anatomy' ? 'md:row-span-2' : ''}>
                    <legend className="mb-3 font-display text-base text-bone">{g.group}</legend>
                    <div className="space-y-4">
                      {g.items.map((s) => (
                        <label key={s.k} className="block">
                          <span className="flex justify-between text-sm">
                            <span className="text-muted">{s.label}</span>
                            <span className="tabular-nums text-bone">{s.fmt(p[s.k])}</span>
                          </span>
                          <input type="range" className="range mt-2" min={s.min} max={s.max} step={s.step} value={p[s.k]} onChange={(e) => set(s.k, Number(e.target.value))} />
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-2 border-t border-line/70 pt-5">
                <span className="mr-1 self-center text-sm text-muted">Use this scan as</span>
                <Button variant="secondary" onClick={() => { setA(p); flash('Set as scan A'); }}>Scan A</Button>
                <Button variant="secondary" onClick={() => { setB(p); flash('Set as scan B'); }}>Scan B</Button>
              </div>
            </div>
          ) : (
            <div className="panel mt-5 p-6">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div>
                  <Thumb p={a} label="Scan A" active={t < 0.5} onClick={() => setT(0)} />
                </div>
                <span className="font-display text-2xl text-muted">→</span>
                <div>
                  <Thumb p={b} label="Scan B" active={t >= 0.5} onClick={() => setT(1)} />
                </div>
              </div>
              <label className="mt-6 block">
                <span className="flex justify-between text-sm">
                  <span className="text-muted">Blend</span>
                  <span className="tabular-nums text-bone">{Math.round(t * 100)}% B</span>
                </span>
                <input
                  type="range"
                  className="range mt-2"
                  min={0}
                  max={1}
                  step={0.01}
                  value={t}
                  onChange={(e) => {
                    setMorphing(false);
                    setT(Number(e.target.value));
                  }}
                />
              </label>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={() => setMorphing((m) => !m)}>{morphing ? 'Pause morph' : '▶ Play morph'}</Button>
                <Button variant="secondary" onClick={() => { setA(centredParams(Math.floor(Math.random() * 1e6), 0)); setB(centredParams(Math.floor(Math.random() * 1e6), 0.9)); }}>
                  New pair
                </Button>
                <Button variant="secondary" onClick={downloadMorph}>
                  Download frames (.zip)
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted">Every step in between is a believable scan. A trained GAN does the same with its noise vector: nearby inputs give similar images.</p>
              <div className="mt-4 grid grid-cols-7 gap-1.5">
                {filmstrip.map((fp, i) => (
                  <Thumb key={i} p={fp} label={`${Math.round((i / 6) * 100)}%`} onClick={() => { setMorphing(false); setT(i / 6); }} />
                ))}
              </div>
            </div>
          )}

          {gallery.length > 0 && (
            <div className="panel mt-5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-display text-lg text-bone">
                  Your gallery <span className="text-muted">· {gallery.length}</span>
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={downloadGallery}>
                    Download all (.zip)
                  </Button>
                  <Button variant="secondary" onClick={() => setGallery([])}>
                    Clear
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {gallery.map((gp, i) => (
                  <Thumb key={i} p={gp} label={`#${gallery.length - i}`} onClick={() => { setMode('design'); setP(gp); }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
