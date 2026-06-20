import { ZONES, zoneBounds } from "../lib/zones";
import { formatDuration } from "../lib/format";

/**
 * Horizontal stacked HR-zone distribution + per-zone breakdown.
 * `seconds` is a 5-element array (Z1..Z5).
 */
export function ZoneBar({ seconds, maxHr }: { seconds: number[]; maxHr: number }) {
  const total = seconds.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink-800">
        {ZONES.map((z, i) => {
          const pct = (seconds[i] / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={z.id}
              style={{ width: `${pct}%`, background: z.color }}
              title={`${z.short} ${z.name}: ${pct.toFixed(0)}%`}
            />
          );
        })}
      </div>

      <div className="mt-3 space-y-1.5">
        {ZONES.map((z, i) => {
          const pct = total ? (seconds[i] / total) * 100 : 0;
          const b = zoneBounds(z, maxHr);
          return (
            <div key={z.id} className="flex items-center gap-3 text-xs">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: z.color }} />
              <span className="w-7 font-medium text-slate-300">{z.short}</span>
              <span className="w-20 text-slate-500">{z.name}</span>
              <span className="w-24 text-slate-600">
                {b.lo}
                {b.hi ? `–${b.hi}` : "+"} bpm
              </span>
              <div className="hidden flex-1 sm:block">
                <div className="h-1.5 w-full rounded-full bg-ink-800">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: z.color }} />
                </div>
              </div>
              <span className="w-16 text-right tabular-nums text-slate-400">{formatDuration(seconds[i])}</span>
              <span className="w-10 text-right tabular-nums text-slate-500">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
