import { useMemo, useState } from 'react';
import { jitterParams, paramsFromSeed } from '../../lib/scan';
import { ScanTile } from './ScanTile';

const COUNT = 12;

/** Grid of generated scans with a toggle that simulates mode collapse. */
export function ModeCollapse() {
  const [collapsed, setCollapsed] = useState(false);
  const tiles = useMemo(() => {
    const base = paramsFromSeed(201);
    return Array.from({ length: COUNT }, (_, i) => ({
      varied: paramsFromSeed(201 + i * 7),
      collapsed: jitterParams(base, 900 + i),
    }));
  }, []);

  return (
    <div className="panel p-5 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-sans tabular-nums text-[13px] text-muted">12 generated samples</p>
          <p className="mt-1 font-sans tabular-nums text-sm text-bone">
            Distinct modes:{' '}
            <span className={collapsed ? 'text-gen-glow' : 'text-verdict'}>{collapsed ? '≈ 1' : '12'}</span>
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={collapsed}
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-3 font-sans tabular-nums text-xs text-bone"
        >
          Mode collapse
          <span
            aria-hidden="true"
            className={`relative h-6 w-11 rounded-full border transition-colors ${
              collapsed ? 'border-gen bg-gen/20' : 'border-line bg-bg'
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full transition-transform duration-300 ${
                collapsed ? 'translate-x-5 bg-gen' : 'translate-x-0 bg-muted'
              }`}
            />
          </span>
          <span className={collapsed ? 'text-gen-glow' : 'text-muted'}>{collapsed ? 'On' : 'Off'}</span>
        </button>
      </div>

      <ul
        className="mt-6 grid grid-cols-4 gap-1.5 sm:grid-cols-6 sm:gap-2"
        aria-label={collapsed ? 'Twelve nearly identical generated scans' : 'Twelve varied generated scans'}
      >
        {tiles.map((t, i) => (
          <li key={i} className="relative border border-line">
            <ScanTile params={t.varied} seed={300 + i} width={96} height={116} />
            <div
              className="absolute inset-0 transition-opacity duration-500"
              style={{ opacity: collapsed ? 1 : 0, transitionDelay: `${i * 45}ms` }}
              aria-hidden="true"
            >
              <ScanTile params={t.collapsed} seed={300 + i} width={96} height={116} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[15px] leading-relaxed text-muted">
        When the Generator finds one output that fools D, it can keep producing it. For medical data that means
        synthetic scans that cover <span className="text-bone">one presentation of a disease</span>, not the range a
        classifier needs to learn.
      </p>
    </div>
  );
}
