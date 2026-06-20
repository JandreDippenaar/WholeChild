import { useEffect, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Flame, Gauge, HeartPulse, Mountain, Route, Timer, Trash2, X, Zap } from "lucide-react";
import { useStore } from "../lib/store";
import { RouteMap } from "./RouteMap";
import { SportGlyph } from "./SportGlyph";
import { ZoneBar } from "./ZoneBar";
import { resolveMaxHr, timeInZones } from "../lib/zones";
import type { Sample } from "../types";
import {
  SPORT_COLOR,
  SPORT_LABEL,
  distanceUnit,
  distanceValue,
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
  paceSecPerUnit,
  usesPace,
} from "../lib/format";

interface Split {
  n: number;
  durationSec: number;
  distanceM: number;
  avgHr?: number;
  eleGain: number;
  partial?: boolean;
}

function computeSplits(samples: Sample[], unitM: number): Split[] {
  const pts = samples.filter((s) => s.dist != null);
  if (pts.length < 2) return [];
  const splits: Split[] = [];
  let startT = pts[0].t;
  let startD = pts[0].dist!;
  let target = startD + unitM;
  let hrSum = 0;
  let hrN = 0;
  let eleGain = 0;
  let lastEle = pts[0].ele;

  for (const s of pts) {
    if (s.hr) {
      hrSum += s.hr;
      hrN++;
    }
    if (s.ele != null) {
      if (lastEle != null) {
        const d = s.ele - lastEle;
        if (d > 0.5) eleGain += d;
        if (Math.abs(d) > 0.5) lastEle = s.ele;
      } else lastEle = s.ele;
    }
    if (s.dist! >= target) {
      splits.push({
        n: splits.length + 1,
        durationSec: s.t - startT,
        distanceM: s.dist! - startD,
        avgHr: hrN ? Math.round(hrSum / hrN) : undefined,
        eleGain,
      });
      startT = s.t;
      startD = s.dist!;
      target = startD + unitM;
      hrSum = 0;
      hrN = 0;
      eleGain = 0;
    }
  }
  const last = pts[pts.length - 1];
  if (last.dist! - startD > unitM * 0.1) {
    splits.push({
      n: splits.length + 1,
      durationSec: last.t - startT,
      distanceM: last.dist! - startD,
      avgHr: hrN ? Math.round(hrSum / hrN) : undefined,
      eleGain,
      partial: true,
    });
  }
  return splits;
}

export function ActivityDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const activity = useStore((s) => s.activities.find((a) => a.id === id));
  const units = useStore((s) => s.settings.units);
  const maxHrSetting = useStore((s) => s.settings.maxHr);
  const remove = useStore((s) => s.removeActivity);

  const a = activity;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { series, hasHr, hasEle, hasSpeed, xByDistance, splits } = useMemo(() => {
    if (!a)
      return { series: [], hasHr: false, hasEle: false, hasSpeed: false, xByDistance: false, splits: [] as Split[] };
    const hasDist = a.samples.some((s) => s.dist != null && s.dist > 0);
    const series = a.samples.map((s) => {
      const speedDisp =
        s.speed != null ? s.speed * 3.6 * (units === "metric" ? 1 : 1 / 1.609344) : null;
      const pace = s.speed && s.speed > 0.3 ? paceSecPerUnit(1, 1 / s.speed, units) : null;
      return {
        x: hasDist && s.dist != null ? Number(distanceValue(s.dist, units).toFixed(3)) : Number((s.t / 60).toFixed(2)),
        hr: s.hr ?? null,
        ele: s.ele != null ? Math.round(units === "metric" ? s.ele : s.ele / 0.3048) : null,
        speed: speedDisp != null ? Number(speedDisp.toFixed(1)) : null,
        pace,
      };
    });
    const unitM = units === "metric" ? 1000 : 1609.344;
    return {
      series,
      hasHr: a.samples.some((s) => s.hr != null),
      hasEle: a.samples.some((s) => s.ele != null),
      hasSpeed: a.samples.some((s) => s.speed != null),
      xByDistance: hasDist,
      splits: computeSplits(a.samples, unitM),
    };
  }, [a, units]);

  if (!a) return null;

  const maxHr = resolveMaxHr(maxHrSetting, [a]);
  const zoneSecs = hasHr ? timeInZones(a.samples, maxHr) : [];
  const hasZones = zoneSecs.reduce((x, y) => x + y, 0) > 0;

  const color = SPORT_COLOR[a.sport];
  const dur = a.movingSec ?? a.durationSec;
  const date = new Date(a.startTime);
  const u = distanceUnit(units);
  const usePace = usesPace(a.sport);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink-950/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-3xl animate-fade-in overflow-y-auto border-l border-ink-700/60 bg-ink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-ink-800 bg-ink-900/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${color}1f`, color }}>
              <SportGlyph sport={a.sport} size={20} />
            </span>
            <div>
              <div className="font-semibold">{a.name || SPORT_LABEL[a.sport]}</div>
              <div className="text-xs text-slate-500">
                {date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                {" · "}
                {date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                {" · "}
                <span className="uppercase">{a.source}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                remove(a.id);
                onClose();
              }}
              className="btn-subtle text-slate-500 hover:text-rose-400"
              title="Delete activity"
            >
              <Trash2 size={17} />
            </button>
            <button onClick={onClose} className="btn-subtle" title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric icon={<Route size={14} />} label="Distance" value={a.distanceM > 0 ? formatDistance(a.distanceM, units) : "—"} />
            <Metric icon={<Timer size={14} />} label="Time" value={formatDuration(dur)} />
            <Metric
              icon={usePace ? <Gauge size={14} /> : <Gauge size={14} />}
              label={usePace ? "Avg pace" : "Avg speed"}
              value={
                a.distanceM > 0
                  ? usePace
                    ? formatPace(paceSecPerUnit(a.distanceM, dur, units), units)
                    : formatSpeed(a.distanceM, dur, units)
                  : "—"
              }
            />
            <Metric icon={<HeartPulse size={14} />} label="Avg / max HR" value={a.avgHr ? `${a.avgHr}${a.maxHr ? ` / ${a.maxHr}` : ""}` : "—"} />
            <Metric icon={<Mountain size={14} />} label="Elev gain" value={a.elevationGainM != null ? `${Math.round(a.elevationGainM)} m` : "—"} />
            <Metric icon={<Flame size={14} />} label="Calories" value={a.calories != null ? `${Math.round(a.calories)}` : "—"} />
            <Metric icon={<Activity size={14} />} label="Cadence" value={a.avgCadence != null ? `${a.avgCadence}` : "—"} />
            <Metric icon={<Zap size={14} />} label="Avg power" value={a.avgPowerW != null ? `${a.avgPowerW} W` : "—"} />
          </div>

          {/* Route */}
          {a.hasGps && (
            <Panel title="Route">
              <RouteMap samples={a.samples} color={color} />
              <p className="mt-2 text-center text-[11px] text-slate-600">
                Line colour = speed (cool → fast). Green = start, red = finish.
              </p>
            </Panel>
          )}

          {/* Charts */}
          {hasHr && (
            <ChartPanel
              title="Heart rate"
              color="#fb7185"
              data={series}
              dataKey="hr"
              unit="bpm"
              xByDistance={xByDistance}
              u={u}
              area
            />
          )}
          {hasEle && (
            <ChartPanel
              title="Elevation"
              color="#fbbf24"
              data={series}
              dataKey="ele"
              unit={units === "metric" ? "m" : "ft"}
              xByDistance={xByDistance}
              u={u}
              area
            />
          )}
          {hasSpeed && (
            <ChartPanel
              title={usePace ? "Pace" : "Speed"}
              color="#38bdf8"
              data={series}
              dataKey="speed"
              unit={units === "metric" ? "km/h" : "mph"}
              xByDistance={xByDistance}
              u={u}
            />
          )}

          {/* HR zones */}
          {hasZones && (
            <Panel title={`Heart-rate zones · max ${maxHr} bpm`}>
              <ZoneBar seconds={zoneSecs} maxHr={maxHr} />
              <p className="mt-3 text-[11px] text-slate-600">
                Set your real max HR in Settings for accurate zones.
              </p>
            </Panel>
          )}

          {/* Splits */}
          {splits.length > 1 && (
            <Panel title={`Splits (${units === "metric" ? "km" : "mi"})`}>
              <div className="overflow-hidden rounded-xl border border-ink-800">
                <table className="w-full text-sm">
                  <thead className="bg-ink-850 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      <th className="px-3 py-2 text-right font-medium">Time</th>
                      <th className="px-3 py-2 text-right font-medium">{usePace ? "Pace" : "Speed"}</th>
                      <th className="px-3 py-2 text-right font-medium">HR</th>
                      <th className="px-3 py-2 text-right font-medium">Elev</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-800/70">
                    {splits.map((s) => (
                      <tr key={s.n} className="tabular-nums">
                        <td className="px-3 py-1.5 text-slate-400">
                          {s.n}
                          {s.partial && <span className="ml-1 text-[10px] text-slate-600">partial</span>}
                        </td>
                        <td className="px-3 py-1.5 text-right">{formatDuration(s.durationSec)}</td>
                        <td className="px-3 py-1.5 text-right">
                          {usePace
                            ? formatPace((s.durationSec / s.distanceM) * (units === "metric" ? 1000 : 1609.344), units)
                            : formatSpeed(s.distanceM, s.durationSec, units)}
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-400">{s.avgHr ?? "—"}</td>
                        <td className="px-3 py-1.5 text-right text-slate-400">{Math.round(s.eleGain)} m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {!a.samples.length && (
            <div className="card p-5 text-center text-sm text-slate-500">
              This file is a summary export (no per-second streams), so totals are shown without charts. Garmin{" "}
              <code>.fit</code> / <code>.tcx</code> and <code>.gpx</code> files include full detail.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-300">{title}</h3>
      {children}
    </div>
  );
}

function ChartPanel({
  title,
  color,
  data,
  dataKey,
  unit,
  xByDistance,
  u,
  area = false,
}: {
  title: string;
  color: string;
  data: any[];
  dataKey: string;
  unit: string;
  xByDistance: boolean;
  u: string;
  area?: boolean;
}) {
  const xLabel = xByDistance ? u : "min";
  return (
    <Panel title={title}>
      <ResponsiveContainer width="100%" height={180}>
        {area ? (
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#252b3a" vertical={false} />
            <XAxis
              dataKey="x"
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              unit={` ${xLabel}`}
              type="number"
              domain={["dataMin", "dataMax"]}
            />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} width={42} unit={` ${unit}`} />
            <Tooltip content={<DetailTooltip unit={unit} xLabel={xLabel} />} />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} connectNulls />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252b3a" vertical={false} />
            <XAxis
              dataKey="x"
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              unit={` ${xLabel}`}
              type="number"
              domain={["dataMin", "dataMax"]}
            />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} width={42} unit={` ${unit}`} />
            <Tooltip content={<DetailTooltip unit={unit} xLabel={xLabel} />} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        )}
      </ResponsiveContainer>
    </Panel>
  );
}

function DetailTooltip({ active, payload, label, unit, xLabel }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/95 px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-500">
        {Number(label).toFixed(1)} {xLabel}
      </div>
      <div className="font-medium text-slate-100">
        {payload[0].value} {unit}
      </div>
    </div>
  );
}
