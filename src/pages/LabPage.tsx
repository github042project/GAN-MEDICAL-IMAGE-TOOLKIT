import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import { Section } from '../components/ui/Section';
import { Button } from '../components/ui/Button';
import {
  DEFAULT_SETTINGS,
  PRESETS,
  describe,
  paramsCsv,
  prepareSource,
  renderAugmented,
  sampleParams,
  type AugParams,
  type AugSettings,
} from '../lib/augment';
import { sampleScanCanvas } from '../lib/sampleScan';
import { makeZip, saveBlob } from '../lib/zip';
import { LAB_HANDOFF_KEY } from '../lib/keys';

const STORE_KEY = 'gan-lab-settings';

interface Source {
  canvas: HTMLCanvasElement;
  name: string;
  thumb: string;
}

interface Output {
  url: string;
  p: AugParams;
  name: string;
}

function loadSettings(): AugSettings {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_SETTINGS;
}

function sampleSource(): Source {
  const c = sampleScanCanvas();
  return { canvas: c, name: 'sample-chest-xray', thumb: c.toDataURL('image/png') };
}

function dataUrlBytes(url: string): Uint8Array {
  const bin = atob(url.slice(url.indexOf(',') + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const baseName = (file: string) => file.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 40) || 'image';

/* ---------- small controls ---------- */

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-line/70 pt-5 first:border-t-0 first:pt-0">
      <legend className="mb-4 font-display text-base font-medium text-bone">{title}</legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const { label, value, min, max, step, format, onChange } = props;
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums text-bone">{format(value)}</span>
      </span>
      <input
        type="range"
        className="range mt-2"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span>
        <span className="block text-sm text-bone">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors ${
          checked ? 'border-disc bg-disc/30' : 'border-line bg-bg'
        }`}
      >
        <span
          className={`absolute top-0.5 h-[18px] w-[18px] rounded-full transition-all ${
            checked ? 'left-[22px] bg-disc-glow shadow-[0_0_10px_rgba(61,214,245,0.7)]' : 'left-0.5 bg-muted'
          }`}
        />
      </button>
    </div>
  );
}

/* ---------- page ---------- */

export default function LabPage() {
  const [settings, setSettings] = useState<AugSettings>(loadSettings);
  const [source, setSource] = useState<Source | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof AugSettings>(key: K, value: AugSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  // A scan sent over from the Synthetic Scan Studio.
  useEffect(() => {
    let url: string | null = null;
    try {
      url = sessionStorage.getItem(LAB_HANDOFF_KEY);
      sessionStorage.removeItem(LAB_HANDOFF_KEY);
    } catch {
      /* storage unavailable */
    }
    if (!url) return;
    const img = new Image();
    img.onload = () => {
      const canvas = prepareSource(img);
      setSource({ canvas, name: 'studio-synthetic-scan', thumb: canvas.toDataURL('image/png') });
    };
    img.src = url;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable */
    }
  }, [settings]);

  // Re-generate shortly after any change, so sliders feel live without stutter.
  useEffect(() => {
    if (!source) return;
    setBusy(true);
    const id = window.setTimeout(() => {
      const prefix = baseName(source.name);
      const list: Output[] = [];
      for (let i = 0; i < settings.count; i++) {
        const p = sampleParams(settings, i);
        const c = renderAugmented(source.canvas, source.canvas.width, source.canvas.height, p, settings, i);
        list.push({ url: c.toDataURL('image/png'), p, name: `${prefix}_aug_${String(i + 1).padStart(3, '0')}.png` });
      }
      setOutputs(list);
      setBusy(false);
    }, 180);
    return () => window.clearTimeout(id);
  }, [source, settings]);

  const loadFile = (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('That file is not an image. Try a PNG or JPG.');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = prepareSource(img);
      setSource({ canvas, name: file.name, thumb: canvas.toDataURL('image/png') });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setError('Could not read that image. Try a PNG or JPG.');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    loadFile(e.dataTransfer.files[0]);
  };

  const downloadZip = () => {
    if (!source || !outputs.length) return;
    const enc = new TextEncoder();
    const prefix = baseName(source.name);
    const zip = makeZip([
      ...outputs.map((o) => ({ name: `${prefix}_augmented/${o.name}`, data: dataUrlBytes(o.url) })),
      { name: `${prefix}_augmented/params.csv`, data: enc.encode(paramsCsv(outputs)) },
      { name: `${prefix}_augmented/settings.json`, data: enc.encode(JSON.stringify(settings, null, 2)) },
    ]);
    saveBlob(zip, `${prefix}_augmented.zip`);
  };

  const downloadOne = (o: Output) => {
    const a = document.createElement('a');
    a.href = o.url;
    a.download = o.name;
    a.click();
  };

  const activePreset = useMemo(
    () =>
      PRESETS.find((pr) =>
        Object.entries(pr.settings).every(([k, v]) => settings[k as keyof AugSettings] === v),
      )?.id,
    [settings],
  );

  const pct = (v: number) => `±${Math.round(v * 100)}%`;

  return (
    <Section
      id="lab"
      title={
        <>
          Augmentation <span className="text-disc">Lab</span>
        </>
      }
      lede={
        <>
          Turn one image into a small training set. Drop in a scan (or any picture), pick how much variety you want,
          and download the results with a log of exactly what was changed. Everything runs on this device; your
          image is never uploaded.
        </>
      }
    >
      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Controls */}
        <div className="panel h-fit p-6 lg:col-span-4">
          <div className="mb-6">
            <p className="mb-3 text-sm text-muted">Start from a preset</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  title={pr.hint}
                  aria-pressed={activePreset === pr.id}
                  onClick={() => setSettings((s) => ({ ...s, ...pr.settings }))}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    activePreset === pr.id ? 'border-disc bg-disc/15 text-disc-glow' : 'border-line text-muted hover:border-muted hover:text-bone'
                  }`}
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <Group title="Geometry">
              <Toggle label="Mirror left ↔ right" checked={settings.flipH} onChange={(v) => set('flipH', v)} />
              <Toggle
                label="Flip upside down"
                hint="Usually off for X-rays: real scans are never upside down"
                checked={settings.flipV}
                onChange={(v) => set('flipV', v)}
              />
              <Slider label="Rotation" value={settings.rotate} min={0} max={45} step={1} format={(v) => `±${v}°`} onChange={(v) => set('rotate', v)} />
              <Slider label="Zoom" value={settings.zoom} min={0} max={0.4} step={0.01} format={pct} onChange={(v) => set('zoom', v)} />
              <Slider label="Shift" value={settings.shift} min={0} max={0.25} step={0.01} format={pct} onChange={(v) => set('shift', v)} />
            </Group>

            <Group title="Tone">
              <Slider label="Brightness" value={settings.brightness} min={0} max={0.5} step={0.01} format={pct} onChange={(v) => set('brightness', v)} />
              <Slider label="Contrast" value={settings.contrast} min={0} max={0.5} step={0.01} format={pct} onChange={(v) => set('contrast', v)} />
              <Slider label="Noise" value={settings.noise} min={0} max={30} step={1} format={(v) => (v ? `up to σ${v}` : 'off')} onChange={(v) => set('noise', v)} />
              <Slider label="Blur" value={settings.blur} min={0} max={3} step={0.1} format={(v) => (v ? `up to ${v.toFixed(1)}px` : 'off')} onChange={(v) => set('blur', v)} />
              <Toggle label="Black and white" checked={settings.grayscale} onChange={(v) => set('grayscale', v)} />
            </Group>

            <Group title="Output">
              <div>
                <p className="mb-2 text-sm text-muted">Image size</p>
                <div className="grid grid-cols-4 gap-2">
                  {[64, 128, 256, 512].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      aria-pressed={settings.size === sz}
                      onClick={() => set('size', sz)}
                      className={`rounded-md border py-1.5 text-sm tabular-nums transition-colors ${
                        settings.size === sz ? 'border-disc bg-disc/15 text-disc-glow' : 'border-line text-muted hover:text-bone'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
                {settings.size === 64 && <p className="mt-2 text-xs text-muted">64 × 64 matches our DCGAN's output size.</p>}
              </div>
              <Slider label="How many images" value={settings.count} min={4} max={48} step={4} format={(v) => `${v}`} onChange={(v) => set('count', v)} />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">
                  Random seed <span className="tabular-nums text-bone">{settings.seed}</span>
                </span>
                <button
                  type="button"
                  onClick={() => set('seed', Math.floor(Math.random() * 100000))}
                  className="rounded-md border border-line px-3 py-1.5 text-sm text-bone transition-colors hover:border-muted"
                >
                  Shuffle
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...DEFAULT_SETTINGS, seed: settings.seed })}
                className="text-sm text-muted underline-offset-4 hover:text-bone hover:underline"
              >
                Reset to defaults
              </button>
            </Group>
          </div>
        </div>

        {/* Source + results */}
        <div className="space-y-6 lg:col-span-8">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`panel flex flex-col gap-5 p-5 transition-colors sm:flex-row sm:items-center ${
              dragging ? 'border-disc bg-disc/[0.06]' : ''
            }`}
          >
            {source ? (
              <img src={source.thumb} alt="Original image" className="h-28 w-28 shrink-0 rounded-lg border border-line object-cover" />
            ) : (
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-muted/60 text-muted">
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
                </svg>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg text-bone">{source ? source.name : 'Drop an image here'}</p>
              <p className="mt-1 text-sm text-muted">
                {source
                  ? `${source.canvas.width} × ${source.canvas.height}px · processed only on this device`
                  : 'PNG or JPG. Or use our sample X-ray to try it out.'}
              </p>
              {error && <p className="mt-2 text-sm text-gen-glow">{error}</p>}
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={() => fileInput.current?.click()}>{source ? 'Change image' : 'Choose image'}</Button>
                <Button variant="secondary" onClick={() => setSource(sampleSource())}>
                  Use sample X-ray
                </Button>
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
          </div>

          <div className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted" aria-live="polite">
                {!source
                  ? 'Results appear here.'
                  : busy
                    ? 'Generating…'
                    : `${outputs.length} images · ${settings.size} × ${settings.size}px · hover for details, click to save one`}
              </p>
              <Button onClick={downloadZip} className={!outputs.length ? 'pointer-events-none opacity-40' : ''}>
                Download all (.zip)
              </Button>
            </div>

            {source ? (
              <ul className={`mt-5 grid grid-cols-3 gap-2.5 transition-opacity sm:grid-cols-4 xl:grid-cols-6 ${busy ? 'opacity-60' : ''}`}>
                {outputs.map((o) => (
                  <li key={o.name}>
                    <button
                      type="button"
                      onClick={() => downloadOne(o)}
                      title={`${describe(o.p)} (click to save)`}
                      aria-label={`Save ${o.name}: ${describe(o.p)}`}
                      className="group relative block aspect-square w-full overflow-hidden rounded-lg border border-line transition-all hover:-translate-y-0.5 hover:border-disc hover:shadow-[0_0_18px_-4px_rgba(61,214,245,0.6)]"
                    >
                      <img src={o.url} alt="" className="h-full w-full object-cover" style={{ imageRendering: settings.size <= 64 ? 'pixelated' : 'auto' }} />
                      <span className="absolute inset-x-0 bottom-0 translate-y-full bg-bg/90 px-2 py-1.5 text-left text-[11px] leading-tight text-bone transition-transform group-hover:translate-y-0">
                        {describe(o.p)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4 xl:grid-cols-6" aria-hidden="true">
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="aspect-square rounded-lg border border-dashed border-line/80" />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ['Keep it plausible', 'Small rotations and exposure changes mimic real variation between scanners and patients.'],
              ['Log what you did', 'The ZIP includes params.csv and settings.json, so anyone can recreate the exact same set.'],
              ['Where GANs come in', 'These are classic augmentations, the baseline our GAN-generated scans will be compared against.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl border border-line/80 p-5">
                <p className="font-display text-base text-bone">{t}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
