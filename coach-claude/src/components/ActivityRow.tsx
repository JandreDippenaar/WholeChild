import { MapPin } from "lucide-react";
import type { Activity } from "../types";
import {
  SPORT_COLOR,
  SPORT_LABEL,
  formatDistance,
  formatDuration,
  formatPace,
  paceSecPerUnit,
  usesPace,
  type UnitSystem,
} from "../lib/format";
import { SportGlyph } from "./SportGlyph";

export function ActivityRow({
  activity,
  units,
  onClick,
}: {
  activity: Activity;
  units: UnitSystem;
  onClick?: () => void;
}) {
  const a = activity;
  const dur = a.movingSec ?? a.durationSec;
  const color = SPORT_COLOR[a.sport];
  const date = new Date(a.startTime);

  let rate = "—";
  if (a.distanceM > 0 && dur > 0) {
    if (usesPace(a.sport)) {
      rate = formatPace(paceSecPerUnit(a.distanceM, dur, units), units);
    } else {
      const kmh = (a.distanceM / dur) * 3.6;
      rate = `${(units === "metric" ? kmh : kmh / 1.609344).toFixed(1)} ${units === "metric" ? "km/h" : "mph"}`;
    }
  }

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-ink-700/60 hover:bg-ink-800/60"
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
        style={{ background: `${color}1f`, color }}
      >
        <SportGlyph sport={a.sport} size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{a.name || SPORT_LABEL[a.sport]}</span>
          {a.hasGps && <MapPin size={12} className="shrink-0 text-slate-600" />}
        </div>
        <div className="text-xs text-slate-500">
          {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          {" · "}
          {date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </div>
      </div>

      <div className="hidden shrink-0 grid-cols-3 gap-6 sm:grid">
        <Metric label="Distance" value={a.distanceM > 0 ? formatDistance(a.distanceM, units) : "—"} />
        <Metric label="Time" value={formatDuration(dur)} />
        <Metric label={usesPace(a.sport) ? "Pace" : "Speed"} value={rate} />
      </div>

      <div className="hidden w-16 shrink-0 text-right sm:block">
        <Metric label="Avg HR" value={a.avgHr ? `${a.avgHr}` : "—"} />
      </div>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-sm font-medium tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-600">{label}</div>
    </div>
  );
}
