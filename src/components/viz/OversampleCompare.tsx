import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { paramsFromSeed } from '../../lib/scan';
import { clamp } from '../../lib/random';
import { ScanTile } from './ScanTile';

const N = 9;

function Grid({ variant }: { variant: 'dup' | 'gan' }) {
  const params = useMemo(
    () => Array.from({ length: N }, (_, i) => paramsFromSeed(variant === 'dup' ? 41 : 41 + i * 13)),
    [variant],
  );
  return (
    <div className="grid grid-cols-3 gap-1.5 p-1.5 sm:gap-2 sm:p-2">
      {params.map((p, i) => (
        <div key={i} className="relative">
          <ScanTile params={p} seed={variant === 'dup' ? 5 : 5 + i} />
          {variant === 'dup' && i > 0 && (
            <span className="absolute bottom-1 right-1 bg-bg/80 px-1 font-sans tabular-nums text-[13px] text-muted">
              copy
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Side-by-side comparison with a draggable divider: oversampling repeats the
 * same image, a GAN produces new, varied samples.
 */
export function OversampleCompare() {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback((x: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    setPos(clamp(((x - rect.left) / rect.width) * 100, 4, 96));
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) setFromClientX(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 };
    if (e.key in steps) {
      e.preventDefault();
      setPos((p) => clamp(p + steps[e.key], 4, 96));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setPos(e.key === 'Home' ? 4 : 96);
    }
  };

  return (
    <figure className="w-full">
      <div
        ref={box}
        className="relative cursor-ew-resize touch-none select-none overflow-hidden border border-line bg-bg"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div aria-label="GAN: nine different synthetic scans" role="img">
          <Grid variant="gan" />
        </div>
        <div
          className="absolute inset-0 bg-bg"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          aria-label="Oversampling: the same scan repeated nine times"
          role="img"
        >
          <Grid variant="dup" />
        </div>

        <span className="pointer-events-none absolute left-3 top-3 bg-bg/90 px-2 py-1 font-sans tabular-nums text-xs text-bone">
          Oversampling
        </span>
        <span className="pointer-events-none absolute right-3 top-3 bg-bg/90 px-2 py-1 font-sans tabular-nums text-xs text-gen-glow">
          GAN samples
        </span>

        <div
          className="pointer-events-none absolute inset-0"
          style={{ transform: `translateX(${pos}%)` }}
          aria-hidden="true"
        >
          <div className="absolute inset-y-0 left-0 w-px -translate-x-1/2 bg-bone/80 shadow-[0_0_14px_rgba(232,228,218,0.6)]" />
        </div>
        <div className="absolute inset-0" style={{ transform: `translateX(${pos}%)` }}>
          <div
            role="slider"
            tabIndex={0}
            aria-label="Comparison divider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos)}
            aria-valuetext={`${Math.round(pos)}% oversampling shown`}
            onKeyDown={onKeyDown}
            className="absolute left-0 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-bone/80 bg-bg font-sans tabular-nums text-xs text-bone"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
            </svg>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 grid grid-cols-2 gap-4 text-sm leading-relaxed text-muted">
        <span>
          <span className="text-bone">Duplication / SMOTE:</span> more rows, the same anatomy. Count goes up, variety
          doesn’t.
        </span>
        <span className="text-right">
          <span className="text-gen-glow">GAN:</span> new samples drawn from a learned distribution.
        </span>
      </figcaption>
    </figure>
  );
}
