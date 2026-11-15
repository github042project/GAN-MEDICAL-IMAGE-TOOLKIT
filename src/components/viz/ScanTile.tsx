import { useEffect, useRef } from 'react';
import { drawGenerated, type ScanParams } from '../../lib/scan';
import { useInView } from '../../lib/hooks';
import { enqueueDraw } from '../../lib/drawQueue';

interface ScanTileProps {
  params: ScanParams;
  /** Seed for the grain/noise so identical params can still differ subtly. */
  seed: number;
  quality?: number;
  width?: number;
  height?: number;
  className?: string;
  label?: string;
}

/** A single procedurally drawn scan, rendered lazily once it nears the viewport. */
export function ScanTile({
  params,
  seed,
  quality = 1,
  width = 120,
  height = 144,
  className = '',
  label,
}: ScanTileProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const near = useInView(ref, '300px', true);

  useEffect(() => {
    const ctx = ref.current?.getContext('2d', { willReadFrequently: true });
    if (!near || !ctx) return;
    return enqueueDraw(() => drawGenerated(ctx, width, height, params, quality, seed));
  }, [near, params, quality, seed, width, height]);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      className={`h-auto w-full bg-bg ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
