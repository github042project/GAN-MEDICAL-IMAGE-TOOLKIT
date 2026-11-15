import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Section } from '../components/ui/Section';
import { Button } from '../components/ui/Button';
import { prepareSource } from '../lib/augment';
import { sampleScanCanvas } from '../lib/sampleScan';
import { saveBlob } from '../lib/zip';

type Colormap = 'gray' | 'heat' | 'ice';
type Tool = 'pan' | 'ruler';

interface Adjust {
  level: number;
  width: number;
  invert: boolean;
  equalize: boolean;
  sharpen: boolean;
  colormap: Colormap;
}

const DEFAULT_ADJUST: Adjust = { level: 128, width: 256, invert: false, equalize: false, sharpen: false, colormap: 'gray' };

const PRESETS: { label: string; a: Partial<Adjust> }[] = [
  { label: 'Original', a: { level: 128, width: 256 } },
  { label: 'High contrast', a: { level: 128, width: 130 } },
  { label: 'Dark areas', a: { level: 80, width: 140 } },
  { label: 'Bright areas', a: { level: 185, width: 130 } },
];

interface Img {
  name: string;
  w: number;
  h: number;
  gray: Uint8ClampedArray;
}

interface Pt {
  x: number;
  y: number;
}

function toGray(canvas: HTMLCanvasElement): Uint8ClampedArray {
  const d = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  const g = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  return g;
}

function buildLut(map: Colormap): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let v = 0; v < 256; v++) {
    const t = v / 255;
    let r = v;
    let g = v;
    let b = v;
    if (map === 'heat') {
      r = Math.min(255, t * 3 * 255);
      g = Math.min(255, Math.max(0, (t * 3 - 1) * 255));
      b = Math.min(255, Math.max(0, (t * 3 - 2) * 255));
    } else if (map === 'ice') {
      r = Math.min(255, Math.max(0, (t * 3 - 2) * 255));
      g = Math.min(255, Math.max(0, (t * 3 - 1) * 255));
      b = Math.min(255, t * 3 * 255);
    }
    lut[v * 3] = r;
    lut[v * 3 + 1] = g;
    lut[v * 3 + 2] = b;
  }
  return lut;
}

/** Applies equalisation, window/level, sharpening, inversion and a colour map. */
function process(img: Img, a: Adjust): { canvas: HTMLCanvasElement; hist: Uint32Array } {
  const { w, h, gray } = img;
  let src = gray;
  if (a.equalize) {
    const hist = new Uint32Array(256);
    for (let i = 0; i < src.length; i++) hist[src[i]]++;
    const cdf = new Float64Array(256);
    let acc = 0;
    for (let v = 0; v < 256; v++) cdf[v] = acc += hist[v];
    const min = cdf.find((c) => c > 0) ?? 0;
    const map = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) map[v] = ((cdf[v] - min) / Math.max(1, src.length - min)) * 255;
    const eq = new Uint8ClampedArray(src.length);
    for (let i = 0; i < src.length; i++) eq[i] = map[src[i]];
    src = eq;
  }
  const lo = a.level - a.width / 2;
  let v = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i++) v[i] = ((src[i] - lo) / a.width) * 255;
  if (a.sharpen) {
    const s = new Uint8ClampedArray(v.length);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) s[i] = v[i];
        else s[i] = 5 * v[i] - v[i - 1] - v[i + 1] - v[i - w] - v[i + w];
      }
    v = s;
  }
  if (a.invert) for (let i = 0; i < v.length; i++) v[i] = 255 - v[i];

  const hist = new Uint32Array(256);
  const lut = buildLut(a.colormap);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const out = ctx.createImageData(w, h);
  const d = out.data;
  for (let i = 0, j = 0; i < v.length; i++, j += 4) {
    const val = v[i];
    hist[val]++;
    d[j] = lut[val * 3];
    d[j + 1] = lut[val * 3 + 1];
    d[j + 2] = lut[val * 3 + 2];
    d[j + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return { canvas, hist };
}

function Histogram({ hist }: { hist: Uint32Array | null }) {
  const path = useMemo(() => {
    if (!hist) return '';
    let max = 1;
    for (let i = 1; i < 255; i++) max = Math.max(max, hist[i]);
    let d = 'M0 60';
    for (let i = 0; i < 256; i++) d += ` L${(i / 255) * 256} ${60 - Math.min(1, hist[i] / max) * 58}`;
    return `${d} L256 60 Z`;
  }, [hist]);
  return (
    <svg viewBox="0 0 256 60" className="h-16 w-full" preserveAspectRatio="none" aria-label="Brightness histogram">
      <defs>
        <linearGradient id="hist-g" x1="0" x2="1">
          <stop offset="0" stopColor="#3DD6F5" stopOpacity="0.5" />
          <stop offset="1" stopColor="#9BEAFF" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path d={path} fill="url(#hist-g)" />
    </svg>
  );
}

export default function ViewerPage() {
  const [img, setImg] = useState<Img | null>(null);
  const [adjust, setAdjust] = useState<Adjust>(DEFAULT_ADJUST);
  const [tool, setTool] = useState<Tool>('pan');
  const [ruler, setRuler] = useState<{ a: Pt; b: Pt } | null>(null);
  const [spacing, setSpacing] = useState('');
  const [probe, setProbe] = useState<{ x: number; y: number; v: number } | null>(null);
  const [hist, setHist] = useState<Uint32Array | null>(null);
  const [zoomPct, setZoomPct] = useState(100);
  const [error, setError] = useState('');

  const wrap = useRef<HTMLDivElement>(null);
  const view = useRef<HTMLCanvasElement>(null);
  const proc = useRef<HTMLCanvasElement | null>(null);
  const xf = useRef({ s: 1, tx: 0, ty: 0 });
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const draw = useCallback(() => {
    const c = view.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    if (!proc.current) return;
    const { s, tx, ty } = xf.current;
    ctx.setTransform(s * dpr, 0, 0, s * dpr, tx * dpr, ty * dpr);
    ctx.imageSmoothingEnabled = s < 2;
    ctx.drawImage(proc.current, 0, 0);
    if (ruler) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const ax = ruler.a.x * s + tx;
      const ay = ruler.a.y * s + ty;
      const bx = ruler.b.x * s + tx;
      const by = ruler.b.y * s + ty;
      ctx.strokeStyle = '#C6F36B';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(198,243,107,0.8)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#C6F36B';
      for (const [x, y] of [[ax, ay], [bx, by]]) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [ruler]);

  const fit = useCallback(() => {
    const c = view.current;
    if (!c || !img) return;
    const cw = c.clientWidth;
    const ch = c.clientHeight;
    const s = Math.min(cw / img.w, ch / img.h) * 0.94;
    xf.current = { s, tx: (cw - img.w * s) / 2, ty: (ch - img.h * s) / 2 };
    setZoomPct(Math.round(s * 100));
    draw();
  }, [img, draw]);

  // Size the canvas to its box.
  useEffect(() => {
    const c = view.current;
    if (!c) return;
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round(c.clientHeight * dpr);
      draw();
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (!img) return;
    const { canvas, hist: h } = process(img, adjust);
    proc.current = canvas;
    setHist(h);
    draw();
  }, [img, adjust, draw]);

  useEffect(() => {
    fit();
    setRuler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img]);

  useEffect(() => draw(), [ruler, draw]);

  const zoomAt = useCallback(
    (factor: number, px: number, py: number) => {
      const { s, tx, ty } = xf.current;
      const ns = Math.min(40, Math.max(0.05, s * factor));
      const ix = (px - tx) / s;
      const iy = (py - ty) / s;
      xf.current = { s: ns, tx: px - ix * ns, ty: py - iy * ns };
      setZoomPct(Math.round(ns * 100));
      draw();
    },
    [draw],
  );

  // Wheel zoom needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const c = view.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      if (!proc.current) return;
      e.preventDefault();
      const r = c.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const toImage = (e: ReactPointerEvent): Pt => {
    const r = view.current!.getBoundingClientRect();
    const { s, tx, ty } = xf.current;
    return { x: (e.clientX - r.left - tx) / s, y: (e.clientY - r.top - ty) / s };
  };

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!img) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === 'ruler') {
      const p = toImage(e);
      setRuler({ a: p, b: p });
    } else {
      drag.current = { x: e.clientX, y: e.clientY, tx: xf.current.tx, ty: xf.current.ty };
    }
  };
  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!img) return;
    const p = toImage(e);
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);
    setProbe(x >= 0 && y >= 0 && x < img.w && y < img.h ? { x, y, v: img.gray[y * img.w + x] } : null);
    if (e.buttons !== 1) return;
    if (tool === 'ruler' && ruler) setRuler({ a: ruler.a, b: p });
    else if (drag.current) {
      xf.current = { ...xf.current, tx: drag.current.tx + e.clientX - drag.current.x, ty: drag.current.ty + e.clientY - drag.current.y };
      draw();
    }
  };
  const onUp = () => {
    drag.current = null;
  };

  const loadFile = (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('That file is not an image. Try a PNG or JPG.');
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const c = prepareSource(im, 1600);
      setImg({ name: file.name, w: c.width, h: c.height, gray: toGray(c) });
      URL.revokeObjectURL(url);
    };
    im.onerror = () => {
      setError('Could not read that image.');
      URL.revokeObjectURL(url);
    };
    im.src = url;
  };

  const loadSample = () => {
    const c = sampleScanCanvas(768, 11, true, 0.8);
    setImg({ name: 'sample-chest-xray.png', w: c.width, h: c.height, gray: toGray(c) });
  };

  const exportPng = () => {
    if (!proc.current || !img) return;
    const c = document.createElement('canvas');
    c.width = img.w;
    c.height = img.h;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(proc.current, 0, 0);
    if (ruler) {
      ctx.strokeStyle = '#C6F36B';
      ctx.lineWidth = Math.max(2, img.w / 300);
      ctx.beginPath();
      ctx.moveTo(ruler.a.x, ruler.a.y);
      ctx.lineTo(ruler.b.x, ruler.b.y);
      ctx.stroke();
      ctx.fillStyle = '#C6F36B';
      ctx.font = `${Math.max(14, img.w / 40)}px Inter, sans-serif`;
      ctx.fillText(rulerText, (ruler.a.x + ruler.b.x) / 2 + 8, (ruler.a.y + ruler.b.y) / 2 - 8);
    }
    c.toBlob((b) => b && saveBlob(b, img.name.replace(/\.[^.]+$/, '') + '_enhanced.png'), 'image/png');
  };

  const set = <K extends keyof Adjust>(k: K, v: Adjust[K]) => setAdjust((a) => ({ ...a, [k]: v }));
  const px = ruler ? Math.hypot(ruler.b.x - ruler.a.x, ruler.b.y - ruler.a.y) : 0;
  const mmPerPx = parseFloat(spacing);
  const rulerText = !ruler ? '' : mmPerPx > 0 ? `${(px * mmPerPx).toFixed(1)} mm` : `${px.toFixed(0)} px`;

  const toggle = (label: string, on: boolean, onChange: (v: boolean) => void) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${on ? 'border-disc bg-disc/15 text-disc-glow' : 'border-line text-muted hover:text-bone'}`}
    >
      {label}
    </button>
  );

  return (
    <Section
      id="viewer"
      className="pt-32 lg:pt-36"
      title={
        <>
          Scan <span className="text-disc">Viewer</span>
        </>
      }
      lede="Open any scan or image to zoom in, bring out detail in dark or bright areas, and measure distances. The image stays on your device."
    >
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="panel overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <div className="flex rounded-lg border border-line p-1" role="tablist" aria-label="Tool">
                {(['pan', 'ruler'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tool === t}
                    onClick={() => setTool(t)}
                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${tool === t ? 'bg-disc text-bg' : 'text-muted hover:text-bone'}`}
                  >
                    {t === 'pan' ? '✋ Move' : '📏 Ruler'}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button type="button" onClick={() => view.current && zoomAt(1 / 1.25, view.current.clientWidth / 2, view.current.clientHeight / 2)} className="h-9 w-9 rounded-md border border-line text-bone hover:border-muted" aria-label="Zoom out">−</button>
                <span className="w-14 text-center text-sm tabular-nums text-muted">{zoomPct}%</span>
                <button type="button" onClick={() => view.current && zoomAt(1.25, view.current.clientWidth / 2, view.current.clientHeight / 2)} className="h-9 w-9 rounded-md border border-line text-bone hover:border-muted" aria-label="Zoom in">+</button>
                <button type="button" onClick={fit} className="ml-1 rounded-md border border-line px-3 py-1.5 text-sm text-bone hover:border-muted">Fit</button>
              </div>
            </div>
            <div ref={wrap} className="relative">
              <canvas
                ref={view}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={() => setProbe(null)}
                className={`block h-[min(68vh,620px)] w-full touch-none ${img ? (tool === 'ruler' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing') : ''}`}
                aria-label="Image viewer. Scroll to zoom, drag to move or measure."
              />
              {!img && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                  <p className="font-display text-xl text-bone">Open an image to start</p>
                  <p className="text-sm text-muted">PNG or JPG. Scroll to zoom, drag to move.</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button onClick={() => fileInput.current?.click()}>Choose image</Button>
                    <Button variant="secondary" onClick={loadSample}>
                      Use sample X-ray
                    </Button>
                  </div>
                  {error && <p className="text-sm text-gen-glow">{error}</p>}
                </div>
              )}
              {img && (
                <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 text-xs">
                  {probe && (
                    <span className="rounded-md bg-bg/85 px-2 py-1 tabular-nums text-bone">
                      x {probe.x} · y {probe.y} · value {probe.v}
                    </span>
                  )}
                  {ruler && px > 0 && <span className="rounded-md bg-verdict px-2 py-1 font-medium tabular-nums text-bg">📏 {rulerText}</span>}
                </div>
              )}
            </div>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              loadFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        <aside className="panel h-fit space-y-6 p-6 lg:col-span-4">
          <div>
            <p className="truncate font-display text-base text-bone">{img ? img.name : 'No image yet'}</p>
            {img && <p className="mt-1 text-xs text-muted">{img.w} × {img.h}px</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => fileInput.current?.click()} className="px-3 py-1.5">
                {img ? 'Open another' : 'Choose image'}
              </Button>
              <Button onClick={exportPng} className={`px-3 py-1.5 ${img ? '' : 'pointer-events-none opacity-40'}`}>
                Save PNG
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-muted">Quick looks</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setAdjust((a) => ({ ...a, ...p.a }))}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    adjust.level === p.a.level && adjust.width === p.a.width ? 'border-disc bg-disc/15 text-disc-glow' : 'border-line text-muted hover:text-bone'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="flex justify-between text-sm">
              <span className="text-muted">Brightness centre</span>
              <span className="tabular-nums text-bone">{adjust.level}</span>
            </span>
            <input type="range" className="range mt-2" min={0} max={255} value={adjust.level} onChange={(e) => set('level', Number(e.target.value))} />
          </label>
          <label className="block">
            <span className="flex justify-between text-sm">
              <span className="text-muted">Contrast range</span>
              <span className="tabular-nums text-bone">{adjust.width}</span>
            </span>
            <input type="range" className="range mt-2" min={10} max={256} value={adjust.width} onChange={(e) => set('width', Number(e.target.value))} />
          </label>

          <div className="flex flex-wrap gap-2">
            {toggle('Invert', adjust.invert, (v) => set('invert', v))}
            {toggle('Equalise', adjust.equalize, (v) => set('equalize', v))}
            {toggle('Sharpen', adjust.sharpen, (v) => set('sharpen', v))}
          </div>

          <div>
            <p className="mb-2 text-sm text-muted">Colour map</p>
            <div className="grid grid-cols-3 gap-2">
              {(['gray', 'heat', 'ice'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={adjust.colormap === m}
                  onClick={() => set('colormap', m)}
                  className={`overflow-hidden rounded-lg border text-sm transition-colors ${adjust.colormap === m ? 'border-disc text-bone' : 'border-line text-muted hover:text-bone'}`}
                >
                  <span
                    className="block h-2"
                    style={{
                      background:
                        m === 'gray' ? 'linear-gradient(90deg,#000,#fff)' : m === 'heat' ? 'linear-gradient(90deg,#000,#f00,#ff0,#fff)' : 'linear-gradient(90deg,#000,#00f,#0ff,#fff)',
                    }}
                  />
                  <span className="block py-1.5">{{ gray: 'Gray', heat: 'Heat', ice: 'Ice' }[m]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm text-muted">Brightness histogram</p>
            <Histogram hist={hist} />
          </div>

          <div className="border-t border-line/70 pt-5">
            <label className="block text-sm">
              <span className="text-muted">Ruler scale (optional)</span>
              <span className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 0.14"
                  value={spacing}
                  onChange={(e) => setSpacing(e.target.value)}
                  className="w-28 rounded-md border border-line bg-bg px-3 py-2 text-sm tabular-nums text-bone outline-none focus:border-disc"
                />
                <span className="text-muted">mm per pixel</span>
              </span>
            </label>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Without a scale the ruler shows pixels. For real scans, the pixel spacing is usually in the file’s
              metadata. Not for diagnosis.
            </p>
          </div>

          <button type="button" onClick={() => setAdjust(DEFAULT_ADJUST)} className="text-sm text-muted hover:text-bone hover:underline">
            Reset adjustments
          </button>
        </aside>
      </div>
    </Section>
  );
}
