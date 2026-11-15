import { motion } from 'framer-motion';
import { useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Section } from '../components/ui/Section';
import { Button } from '../components/ui/Button';
import { BALANCE_KEY } from '../lib/keys';
import { drawScan, paramsFromSeed } from '../lib/scan';
import { makeZip, saveBlob } from '../lib/zip';

const MAX_FILES = 3000;
const DARK = 35;
const BRIGHT = 220;

interface Loaded {
  src: CanvasImageSource;
  w: number;
  h: number;
  close?: () => void;
}

interface Item {
  id: number;
  path: string;
  name: string;
  cls: string;
  w: number;
  h: number;
  mean: number;
  colour: boolean;
  hash: Uint32Array;
  thumb: string;
  ok: boolean;
  load: () => Promise<Loaded>;
}

/* ---------- gathering files ---------- */

interface Picked {
  file?: File;
  canvas?: HTMLCanvasElement;
  path: string;
}

const isImage = (name: string, type = '') => type.startsWith('image/') || /\.(png|jpe?g|bmp|gif|webp)$/i.test(name);

function classFromPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 2];
  if (parts.length === 2) return parts[0];
  return 'unlabelled';
}

async function readEntry(entry: FileSystemEntry, prefix: string, out: Picked[]) {
  if (out.length >= MAX_FILES) return;
  if (entry.isFile) {
    const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
    if (isImage(file.name, file.type)) out.push({ file, path: prefix + file.name });
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    let batch: FileSystemEntry[];
    do {
      batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
      for (const e of batch) await readEntry(e, `${prefix}${entry.name}/`, out);
    } while (batch.length > 0 && out.length < MAX_FILES);
  }
}

/** A small made-up dataset with planted problems, for trying the tool. */
function demoDataset(): Picked[] {
  const make = (seed: number, opacity: number, w = 256, h = 256, tint?: 'dark' | 'bright') => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    drawScan(ctx, w, h, paramsFromSeed(seed, opacity));
    if (tint) {
      ctx.fillStyle = tint === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)';
      ctx.fillRect(0, 0, w, h);
    }
    return c;
  };
  const out: Picked[] = [];
  for (let i = 0; i < 46; i++) out.push({ canvas: make(100 + i, 0), path: `chest-demo/normal/normal_${String(i + 1).padStart(3, '0')}.png` });
  for (let i = 0; i < 3; i++) out.push({ canvas: make(100 + i, 0), path: `chest-demo/normal/copy_of_normal_${String(i + 1).padStart(3, '0')}.png` });
  out.push({ canvas: make(300, 0, 256, 256, 'dark'), path: 'chest-demo/normal/underexposed_01.png' });
  out.push({ canvas: make(301, 0, 256, 256, 'bright'), path: 'chest-demo/normal/overexposed_01.png' });
  out.push({ canvas: make(302, 0, 320, 384), path: 'chest-demo/normal/other_scanner_01.png' });
  for (let i = 0; i < 6; i++) out.push({ canvas: make(500 + i, 0.85), path: `chest-demo/pneumonia/pneumonia_${String(i + 1).padStart(3, '0')}.png` });
  const resized = document.createElement('canvas');
  resized.width = 320;
  resized.height = 320;
  resized.getContext('2d')!.drawImage(make(500, 0.85), 0, 0, 320, 320);
  out.push({ canvas: resized, path: 'chest-demo/pneumonia/pneumonia_001_resized.png' });
  out.push({ canvas: make(503, 0.85), path: 'chest-demo/pneumonia/pneumonia_004 (1).png' });
  return out;
}

/* ---------- analysis ---------- */

const thumbCanvas = () => {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 96;
  return c;
};

function popcount(n: number) {
  n -= (n >>> 1) & 0x55555555;
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  return (((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}
function hamming(a: Uint32Array, b: Uint32Array) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += popcount(a[i] ^ b[i]);
  return d;
}

async function analyse(p: Picked, id: number, tools: { thumb: HTMLCanvasElement; hash: HTMLCanvasElement; stat: HTMLCanvasElement }): Promise<Item> {
  const load = async (): Promise<Loaded> => {
    if (p.canvas) return { src: p.canvas, w: p.canvas.width, h: p.canvas.height };
    const bmp = await createImageBitmap(p.file!);
    return { src: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
  };
  const base = { id, path: p.path, name: p.path.split('/').pop() || p.path, cls: classFromPath(p.path), load };
  try {
    const { src, w, h, close } = await load();
    const tctx = tools.thumb.getContext('2d')!;
    const s = Math.max(96 / w, 96 / h);
    tctx.fillStyle = '#000';
    tctx.fillRect(0, 0, 96, 96);
    tctx.drawImage(src, (96 - w * s) / 2, (96 - h * s) / 2, w * s, h * s);
    const thumb = tools.thumb.toDataURL('image/jpeg', 0.72);

    // Difference hash: 17×16 grayscale, compare horizontal neighbours (256 bits).
    const hctx = tools.hash.getContext('2d', { willReadFrequently: true })!;
    hctx.drawImage(src, 0, 0, 17, 16);
    const hd = hctx.getImageData(0, 0, 17, 16).data;
    const g = (x: number, y: number) => {
      const i = (y * 17 + x) * 4;
      return hd[i] * 0.299 + hd[i + 1] * 0.587 + hd[i + 2] * 0.114;
    };
    const hash = new Uint32Array(8);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) if (g(x, y) > g(x + 1, y)) hash[(y * 16 + x) >> 5] |= 1 << ((y * 16 + x) & 31);

    const sctx = tools.stat.getContext('2d', { willReadFrequently: true })!;
    sctx.drawImage(src, 0, 0, 32, 32);
    const sd = sctx.getImageData(0, 0, 32, 32).data;
    let sum = 0;
    let chroma = 0;
    for (let i = 0; i < sd.length; i += 4) {
      sum += sd[i] * 0.299 + sd[i + 1] * 0.587 + sd[i + 2] * 0.114;
      chroma += Math.abs(sd[i] - sd[i + 1]) + Math.abs(sd[i + 1] - sd[i + 2]);
    }
    close?.();
    return { ...base, w, h, mean: sum / 1024, colour: chroma / 1024 > 12, hash, thumb, ok: true };
  } catch {
    return { ...base, w: 0, h: 0, mean: 0, colour: false, hash: new Uint32Array(8), thumb: '', ok: false };
  }
}

/* ---------- small UI pieces ---------- */

function HealthRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const tone = score >= 80 ? '#C6F36B' : score >= 55 ? '#FFB86B' : '#FF8A3D';
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${tone})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl tabular-nums text-bone">{score}</span>
        <span className="text-xs text-muted">health</span>
      </div>
    </div>
  );
}

function Thumbs({ items, caption }: { items: Item[]; caption?: (it: Item) => ReactNode }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">Nothing found here. 🎉</p>;
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
      {items.slice(0, 60).map((it) => (
        <li key={it.id} className="min-w-0">
          {it.thumb ? (
            <img src={it.thumb} alt="" className="aspect-square w-full rounded-lg border border-line object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-gen/60 text-xs text-gen-glow">unreadable</div>
          )}
          <p className="mt-1 truncate text-[11px] text-bone" title={it.path}>
            {it.name}
          </p>
          {caption && <p className="truncate text-[11px] text-muted">{caption(it)}</p>}
        </li>
      ))}
      {items.length > 60 && <li className="self-center text-sm text-muted">+{items.length - 60} more</li>}
    </ul>
  );
}

/* ---------- page ---------- */

export default function DoctorPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [strict, setStrict] = useState(8);
  const [tab, setTab] = useState<'size' | 'exposure' | 'colour' | 'broken'>('size');
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState('');
  const [exportOpts, setExportOpts] = useState({ dropDupes: true, dropExposure: true, size: 0, grayscale: false });
  const folderInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);

  const run = async (picked: Picked[]) => {
    setNote(picked.length >= MAX_FILES ? `Only the first ${MAX_FILES} images are checked.` : '');
    if (!picked.length) {
      setNote('No images found there. Try a folder with PNG or JPG files.');
      return;
    }
    const tools = { thumb: thumbCanvas(), hash: Object.assign(document.createElement('canvas'), { width: 17, height: 16 }), stat: Object.assign(document.createElement('canvas'), { width: 32, height: 32 }) };
    const out: Item[] = [];
    setItems([]);
    setProgress({ done: 0, total: picked.length, label: 'Checking images' });
    for (let i = 0; i < picked.length; i++) {
      out.push(await analyse(picked[i], i, tools));
      if (i % 8 === 0) {
        setProgress({ done: i + 1, total: picked.length, label: 'Checking images' });
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    setItems(out);
    setProgress(null);
  };

  const fromFileList = (list: FileList | null) => {
    if (!list) return;
    const picked: Picked[] = [];
    for (const f of Array.from(list)) {
      if (picked.length >= MAX_FILES) break;
      if (isImage(f.name, f.type)) picked.push({ file: f, path: f.webkitRelativePath || f.name });
    }
    void run(picked);
  };

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const entries = Array.from(e.dataTransfer.items)
      .map((it) => it.webkitGetAsEntry?.())
      .filter((x): x is FileSystemEntry => !!x);
    if (!entries.length) return fromFileList(e.dataTransfer.files);
    const picked: Picked[] = [];
    for (const en of entries) await readEntry(en, '', picked);
    void run(picked);
  };

  /* ---------- findings ---------- */

  const report = useMemo(() => {
    const ok = items.filter((i) => i.ok);
    // Near-duplicate groups via union–find on hash distance.
    const parent = ok.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (let a = 0; a < ok.length; a++)
      for (let b = a + 1; b < ok.length; b++) if (hamming(ok[a].hash, ok[b].hash) <= strict) parent[find(b)] = find(a);
    const groupsMap = new Map<number, Item[]>();
    ok.forEach((it, i) => {
      const root = find(i);
      groupsMap.set(root, [...(groupsMap.get(root) ?? []), it]);
    });
    const groups = [...groupsMap.values()].filter((g) => g.length > 1);
    const dupeIds = new Set(groups.flatMap((g) => g.slice(1).map((i) => i.id)));

    const sizes = new Map<string, number>();
    ok.forEach((i) => sizes.set(`${i.w}×${i.h}`, (sizes.get(`${i.w}×${i.h}`) ?? 0) + 1));
    const sizeList = [...sizes.entries()].sort((a, b) => b[1] - a[1]);
    const common = sizeList[0]?.[0];
    const oddSize = ok.filter((i) => `${i.w}×${i.h}` !== common);
    const exposure = ok.filter((i) => i.mean < DARK || i.mean > BRIGHT);
    const colourCount = ok.filter((i) => i.colour).length;
    const colour = colourCount > 0 && colourCount < ok.length / 2 ? ok.filter((i) => i.colour) : [];
    const broken = items.filter((i) => !i.ok);

    const classes = new Map<string, number>();
    ok.forEach((i) => classes.set(i.cls, (classes.get(i.cls) ?? 0) + 1));
    const classList = [...classes.entries()].sort((a, b) => b[1] - a[1]);
    const ratio = classList.length > 1 ? classList[0][1] / classList[classList.length - 1][1] : 1;

    const n = Math.max(1, items.length);
    const penalty =
      Math.min(30, (dupeIds.size / n) * 150) +
      Math.min(25, (ratio - 1) * 2.5) +
      Math.min(15, (oddSize.length / n) * 60) +
      Math.min(15, (exposure.length / n) * 100) +
      Math.min(15, (broken.length / n) * 150);
    return { groups, dupeIds, sizeList, common, oddSize, exposure, colour, broken, classList, ratio, score: Math.max(0, Math.round(100 - penalty)) };
  }, [items, strict]);

  const sendToBalance = () => {
    try {
      localStorage.setItem(BALANCE_KEY, JSON.stringify(report.classList.map(([name, count]) => ({ name, count }))));
    } catch {
      /* storage unavailable */
    }
    window.location.hash = 'balance';
  };

  const reasons = (it: Item) => {
    const r: string[] = [];
    if (!it.ok) r.push('unreadable');
    if (report.dupeIds.has(it.id)) r.push('duplicate');
    if (it.ok && it.mean < DARK) r.push('too dark');
    if (it.ok && it.mean > BRIGHT) r.push('too bright');
    if (it.ok && `${it.w}×${it.h}` !== report.common) r.push('unusual size');
    return r;
  };
  const keep = (it: Item) =>
    it.ok && !(exportOpts.dropDupes && report.dupeIds.has(it.id)) && !(exportOpts.dropExposure && (it.mean < DARK || it.mean > BRIGHT));

  const csv = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = items.map((it) => [esc(it.path), esc(it.cls), it.w, it.h, it.mean.toFixed(1), it.colour ? 1 : 0, esc(reasons(it).join('; ')), keep(it) ? 1 : 0].join(','));
    return ['path,class,width,height,mean_brightness,colour,issues,kept', ...rows].join('\n') + '\n';
  };

  const downloadReport = () => saveBlob(new Blob([csv()], { type: 'text/csv' }), 'dataset_report.csv');

  const exportClean = async () => {
    const kept = items.filter(keep);
    const entries: { name: string; data: Uint8Array }[] = [];
    const used = new Set<string>();
    const c = document.createElement('canvas');
    setProgress({ done: 0, total: kept.length, label: 'Building cleaned dataset' });
    for (let i = 0; i < kept.length; i++) {
      const it = kept[i];
      try {
        const { src, w, h, close } = await it.load();
        const S = exportOpts.size;
        c.width = S || w;
        c.height = S || h;
        const ctx = c.getContext('2d')!;
        if (S) {
          const s = Math.max(S / w, S / h);
          ctx.drawImage(src, (S - w * s) / 2, (S - h * s) / 2, w * s, h * s);
        } else ctx.drawImage(src, 0, 0);
        close?.();
        if (exportOpts.grayscale) {
          const d = ctx.getImageData(0, 0, c.width, c.height);
          for (let k = 0; k < d.data.length; k += 4) d.data[k] = d.data[k + 1] = d.data[k + 2] = d.data[k] * 0.299 + d.data[k + 1] * 0.587 + d.data[k + 2] * 0.114;
          ctx.putImageData(d, 0, 0);
        }
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
        if (!blob) continue;
        let name = `cleaned/${it.cls}/${it.name.replace(/\.[^.]+$/, '')}.png`;
        for (let k = 2; used.has(name); k++) name = `cleaned/${it.cls}/${it.name.replace(/\.[^.]+$/, '')}_${k}.png`;
        used.add(name);
        entries.push({ name, data: new Uint8Array(await blob.arrayBuffer()) });
      } catch {
        /* skip unreadable */
      }
      if (i % 5 === 0) setProgress({ done: i + 1, total: kept.length, label: 'Building cleaned dataset' });
    }
    entries.push({ name: 'cleaned/report.csv', data: new TextEncoder().encode(csv()) });
    saveBlob(makeZip(entries), 'cleaned_dataset.zip');
    setProgress(null);
  };

  const has = items.length > 0;
  const keptCount = items.filter(keep).length;
  const tabs = [
    { id: 'size' as const, label: 'Unusual size', list: report.oddSize, cap: (it: Item) => `${it.w}×${it.h}` },
    { id: 'exposure' as const, label: 'Too dark / bright', list: report.exposure, cap: (it: Item) => (it.mean < DARK ? 'too dark' : 'too bright') },
    { id: 'colour' as const, label: 'Colour images', list: report.colour, cap: () => 'colour' },
    { id: 'broken' as const, label: 'Unreadable', list: report.broken, cap: () => 'could not open' },
  ];
  const activeTab = tabs.find((t) => t.id === tab)!;

  return (
    <Section
      id="doctor"
      className="pt-32 lg:pt-36"
      title={
        <>
          Dataset <span className="text-verdict">Doctor</span>
        </>
      }
      lede="Give it a folder of images and get a check-up in seconds: duplicates, mixed sizes, badly exposed scans, unreadable files and class imbalance. Then download a cleaned copy. Files never leave your computer."
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => void onDrop(e)}
        className={`mt-10 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? 'border-verdict bg-verdict/[0.06]' : 'border-line bg-surface/50'}`}
      >
        <p className="font-display text-2xl text-bone">Drop a folder of images here</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          Subfolder names become class names, for example <span className="text-bone">dataset/normal</span> and{' '}
          <span className="text-bone">dataset/pneumonia</span>. Up to {MAX_FILES.toLocaleString('en-US')} images.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => folderInput.current?.click()}>Choose folder</Button>
          <Button variant="secondary" onClick={() => filesInput.current?.click()}>
            Choose files
          </Button>
          <Button variant="secondary" onClick={() => void run(demoDataset())}>
            Try a demo dataset
          </Button>
        </div>
        {note && <p className="mt-4 text-sm text-gen-glow">{note}</p>}
        <input
          ref={folderInput}
          type="file"
          multiple
          className="sr-only"
          tabIndex={-1}
          {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          onChange={(e) => {
            fromFileList(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={filesInput}
          type="file"
          multiple
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            fromFileList(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {progress && (
        <div className="mt-6 rounded-2xl border border-line bg-surface/80 p-5" role="status">
          <div className="flex justify-between text-sm">
            <span className="text-bone">{progress.label}…</span>
            <span className="tabular-nums text-muted">
              {progress.done} / {progress.total}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-verdict transition-[width]" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
          </div>
        </div>
      )}

      {has && !progress && (
        <div className="mt-8 space-y-6">
          {/* Summary */}
          <div className="panel flex flex-col gap-6 p-6 md:flex-row md:items-center">
            <HealthRing score={report.score} />
            <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
              {[
                ['Images', items.length, 'text-bone'],
                ['Classes', report.classList.length, 'text-bone'],
                ['Duplicates', report.dupeIds.size, report.dupeIds.size ? 'text-gen-glow' : 'text-verdict'],
                ['Unusual size', report.oddSize.length, report.oddSize.length ? 'text-gen-glow' : 'text-verdict'],
                ['Exposure issues', report.exposure.length, report.exposure.length ? 'text-gen-glow' : 'text-verdict'],
                ['Unreadable', report.broken.length, report.broken.length ? 'text-gen-glow' : 'text-verdict'],
              ].map(([label, value, tone]) => (
                <div key={label as string}>
                  <p className="text-sm text-muted">{label}</p>
                  <p className={`mt-1 font-display text-3xl tabular-nums ${tone}`}>{value as number}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="-mt-3 text-xs text-muted">The health score is a rough guide that combines the issues above.</p>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Classes */}
            <div className="panel p-6 lg:col-span-5">
              <div className="flex items-baseline justify-between">
                <p className="font-display text-lg text-bone">Class balance</p>
                {report.classList.length > 1 && (
                  <p className="text-sm tabular-nums text-muted">
                    1 : {report.ratio >= 10 ? Math.round(report.ratio) : report.ratio.toFixed(1)}
                  </p>
                )}
              </div>
              <ul className="mt-5 space-y-3">
                {report.classList.map(([name, count]) => (
                  <li key={name}>
                    <div className="flex justify-between text-sm">
                      <span className="truncate text-bone">{name}</span>
                      <span className="tabular-nums text-muted">{count}</span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-line/60">
                      <motion.div
                        className="h-full rounded-full bg-verdict"
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / report.classList[0][1]) * 100}%` }}
                        transition={{ duration: 0.7 }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {report.classList.length > 1 && (
                <div className="mt-6">
                  <Button onClick={sendToBalance} arrow>
                    Plan the balance
                  </Button>
                </div>
              )}
              {report.classList.length === 1 && <p className="mt-4 text-xs text-muted">Put each class in its own subfolder to compare them.</p>}
            </div>

            {/* Duplicates */}
            <div className="panel p-6 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-display text-lg text-bone">
                  Duplicates <span className="text-muted">· {report.groups.length} groups</span>
                </p>
                <label className="flex items-center gap-3 text-sm text-muted">
                  Strict
                  <input type="range" className="range w-28" min={0} max={24} value={strict} onChange={(e) => setStrict(Number(e.target.value))} aria-label="Duplicate matching looseness" />
                  Loose
                </label>
              </div>
              <p className="mt-1 text-xs text-muted">Finds identical and near-identical images, even when resized or renamed.</p>
              <ul className="mt-5 max-h-[22rem] space-y-4 overflow-y-auto pr-1">
                {report.groups.length === 0 && <li className="py-6 text-center text-sm text-muted">No duplicates found. 🎉</li>}
                {report.groups.slice(0, 40).map((g) => (
                  <li key={g[0].id} className="rounded-xl border border-line/80 p-3">
                    <div className="flex gap-3 overflow-x-auto">
                      {g.map((it, k) => (
                        <figure key={it.id} className="w-24 shrink-0">
                          <img src={it.thumb} alt="" className={`aspect-square w-full rounded-md border object-cover ${k === 0 ? 'border-verdict/70' : 'border-gen/70'}`} />
                          <figcaption className="mt-1 truncate text-[11px] text-muted" title={it.path}>
                            {k === 0 ? 'keep · ' : ''}
                            {it.name}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Other issues */}
          <div className="panel p-6">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Issues">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${tab === t.id ? 'border-verdict bg-verdict/15 text-verdict' : 'border-line text-muted hover:text-bone'}`}
                >
                  {t.label} <span className="tabular-nums">({t.list.length})</span>
                </button>
              ))}
            </div>
            {tab === 'size' && report.sizeList.length > 0 && (
              <p className="mt-4 text-sm text-muted">
                Most common size: <span className="text-bone">{report.common}</span>
                {report.sizeList.length > 1 && ` · ${report.sizeList.length} different sizes in total`}
              </p>
            )}
            <div className="mt-5">
              <Thumbs items={activeTab.list} caption={activeTab.cap} />
            </div>
          </div>

          {/* Export */}
          <div className="rounded-2xl border border-verdict/40 bg-verdict/[0.05] p-6">
            <p className="font-display text-xl text-bone">Download a cleaned copy</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              {[
                ['dropDupes', 'Remove duplicates'],
                ['dropExposure', 'Remove badly exposed'],
                ['grayscale', 'Convert to black and white'],
              ].map(([k, label]) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 text-bone">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#C6F36B]"
                    checked={exportOpts[k as 'dropDupes'] as boolean}
                    onChange={(e) => setExportOpts((o) => ({ ...o, [k]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
              <label className="flex items-center gap-2 text-bone">
                Resize to
                <select
                  value={exportOpts.size}
                  onChange={(e) => setExportOpts((o) => ({ ...o, size: Number(e.target.value) }))}
                  className="rounded-md border border-line bg-bg px-2 py-1.5 text-bone outline-none focus:border-verdict"
                >
                  <option value={0}>keep original</option>
                  <option value={64}>64 × 64</option>
                  <option value={128}>128 × 128</option>
                  <option value={224}>224 × 224</option>
                  <option value={256}>256 × 256</option>
                </select>
              </label>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button onClick={() => void exportClean()} arrow>
                Download cleaned dataset (.zip)
              </Button>
              <Button variant="secondary" onClick={downloadReport}>
                Report only (.csv)
              </Button>
              <p className="text-sm text-muted">
                Keeps {keptCount} of {items.length} images, sorted into class folders.
              </p>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}
