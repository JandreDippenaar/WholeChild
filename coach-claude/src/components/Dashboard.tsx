import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, Flame, Mountain, Route, Timer, TrendingUp, Trophy } from "lucide-react";
import { useStore } from "../lib/store";
import { PageHeader, SectionTitle, StatCard } from "./ui";
import { ActivityRow } from "./ActivityRow";
import { EmptyState } from "./EmptyState";
import {
  SPORT_COLOR,
  SPORT_LABEL,
  distanceValue,
  distanceUnit,
  formatDistance,
  formatDurationLong,
  formatPace,
  paceSecPerUnit,
  formatNumber,
} from "../lib/format";
import { bySport, computeTotals, personalBests, streaks, trend } from "../lib/stats";

export function Dashboard({ onSeeAll }: { onSeeAll: () => void }) {
  const activities = useStore((s) => s.activities);
  const units = useStore((s) => s.settings.units);
  const select = useStore((s) => s.select);
  const [grouping, setGrouping] = useState<"week" | "month">("week");

  const totals = useMemo(() => computeTotals(activities), [activities]);
  const sports = useMemo(() => bySport(activities), [activities]);
  const trendData = useMemo(() => trend(activities, grouping), [activities, grouping]);
  const pbs = useMemo(() => personalBests(activities), [activities]);
  const streak = useMemo(() => streaks(activities), [activities]);

  if (!activities.length) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Your training at a glance" />
        <EmptyState />
      </>
    );
  }

  const u = distanceUnit(units);
  const chartData = trendData.map((t) => ({
    label: t.label,
    distance: Number(distanceValue(t.distanceM, units).toFixed(1)),
    hours: Number((t.durationSec / 3600).toFixed(1)),
    count: t.count,
  }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${totals.count} activities · ${formatDistance(totals.distanceM, units)} all-time`}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Total distance"
          value={formatDistance(totals.distanceM, units)}
          icon={<Route size={15} />}
          accent="#f55a2a"
        />
        <StatCard
          label="Moving time"
          value={formatDurationLong(totals.durationSec)}
          icon={<Timer size={15} />}
          accent="#38bdf8"
        />
        <StatCard
          label="Elevation"
          value={`${formatNumber(totals.elevationGainM)} m`}
          icon={<Mountain size={15} />}
          accent="#fbbf24"
        />
        <StatCard
          label="Calories"
          value={formatNumber(totals.calories)}
          sub={totals.avgHr ? `avg HR ${totals.avgHr}` : undefined}
          icon={<Flame size={15} />}
          accent="#fb7185"
        />
        <StatCard
          label="Current streak"
          value={`${streak.current} d`}
          sub={`longest ${streak.longest} d`}
          icon={<CalendarDays size={15} />}
          accent="#a3e635"
        />
      </div>

      {/* Charts */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <SectionTitle
            action={
              <div className="flex gap-1 rounded-lg bg-ink-800 p-0.5">
                {(["week", "month"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGrouping(g)}
                    className={`rounded-md px-2.5 py-1 text-xs capitalize ${
                      grouping === g ? "bg-ink-700 text-slate-100" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {g}ly
                  </button>
                ))}
              </div>
            }
          >
            Volume · distance ({u})
          </SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f55a2a" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#f55a2a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#252b3a" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<ChartTooltip unit={u} />} />
              <Area
                type="monotone"
                dataKey="distance"
                stroke="#f55a2a"
                strokeWidth={2}
                fill="url(#distGrad)"
                name={`Distance (${u})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <SectionTitle>Sport mix</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={sports}
                dataKey="durationSec"
                nameKey="sport"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
                stroke="none"
              >
                {sports.map((s) => (
                  <Cell key={s.sport} fill={SPORT_COLOR[s.sport]} />
                ))}
              </Pie>
              <Tooltip content={<SportTooltip units={units} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {sports.slice(0, 5).map((s) => (
              <div key={s.sport} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: SPORT_COLOR[s.sport] }} />
                  {SPORT_LABEL[s.sport]}
                </span>
                <span className="tabular-nums text-slate-500">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Personal bests */}
      <div className="mt-5">
        <SectionTitle>Personal bests</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <PbCard
            icon={<Route size={15} />}
            label="Longest distance"
            value={pbs.longestDistance ? formatDistance(pbs.longestDistance.distanceM, units) : "—"}
            sub={pbs.longestDistance && SPORT_LABEL[pbs.longestDistance.sport]}
            onClick={() => pbs.longestDistance && select(pbs.longestDistance.id)}
          />
          <PbCard
            icon={<Timer size={15} />}
            label="Longest session"
            value={pbs.longestDuration ? formatDurationLong(pbs.longestDuration.durationSec) : "—"}
            sub={pbs.longestDuration && SPORT_LABEL[pbs.longestDuration.sport]}
            onClick={() => pbs.longestDuration && select(pbs.longestDuration.id)}
          />
          <PbCard
            icon={<TrendingUp size={15} />}
            label="Fastest run pace"
            value={
              pbs.fastestRunPace
                ? formatPace(
                    paceSecPerUnit(
                      pbs.fastestRunPace.distanceM,
                      pbs.fastestRunPace.movingSec ?? pbs.fastestRunPace.durationSec,
                      units,
                    ),
                    units,
                  )
                : "—"
            }
            onClick={() => pbs.fastestRunPace && select(pbs.fastestRunPace.id)}
          />
          <PbCard
            icon={<Mountain size={15} />}
            label="Biggest climb"
            value={pbs.biggestClimb?.elevationGainM ? `${Math.round(pbs.biggestClimb.elevationGainM)} m` : "—"}
            onClick={() => pbs.biggestClimb && select(pbs.biggestClimb.id)}
          />
        </div>
      </div>

      {/* Recent */}
      <div className="mt-5">
        <SectionTitle
          action={
            <button onClick={onSeeAll} className="text-xs font-medium text-brand-400 hover:text-brand-300">
              See all →
            </button>
          }
        >
          Recent activities
        </SectionTitle>
        <div className="card divide-y divide-ink-800/70 p-1.5">
          {activities.slice(0, 6).map((a) => (
            <ActivityRow key={a.id} activity={a} units={units} onClick={() => select(a.id)} />
          ))}
        </div>
      </div>
    </>
  );
}

function PbCard({
  icon,
  label,
  value,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string | false;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="card p-4 text-left transition-colors hover:border-brand-500/40">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Trophy size={13} className="text-amber-400/80" />
        {label}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xl font-semibold tabular-nums">
        <span className="text-brand-400">{icon}</span>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </button>
  );
}

function ChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/95 px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-medium text-slate-200">{label}</div>
      <div className="text-slate-400">
        {payload[0].value} {unit}
      </div>
    </div>
  );
}

function SportTooltip({ active, payload, units }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/95 px-3 py-2 text-xs shadow-xl">
      <div className="font-medium text-slate-200">{SPORT_LABEL[d.sport as keyof typeof SPORT_LABEL]}</div>
      <div className="text-slate-400">
        {d.count} sessions · {formatDistance(d.distanceM, units)}
      </div>
    </div>
  );
}
