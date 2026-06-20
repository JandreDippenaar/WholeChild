import { useMemo } from "react";
import { ArrowDownUp, Search, X } from "lucide-react";
import { useStore } from "../lib/store";
import { PageHeader } from "./ui";
import { ActivityRow } from "./ActivityRow";
import { EmptyState } from "./EmptyState";
import { applyFilters, computeTotals } from "../lib/stats";
import { SPORT_COLOR, SPORT_LABEL, formatDistance, formatDurationLong } from "../lib/format";
import type { SportCategory } from "../types";

const ALL_SPORTS: SportCategory[] = [
  "running",
  "cycling",
  "walking",
  "hiking",
  "swimming",
  "strength",
  "cardio",
  "other",
];

const SORTS: { id: "date" | "distance" | "duration" | "pace" | "avgHr"; label: string }[] = [
  { id: "date", label: "Date" },
  { id: "distance", label: "Distance" },
  { id: "duration", label: "Duration" },
  { id: "pace", label: "Pace" },
  { id: "avgHr", label: "Avg HR" },
];

export function Activities() {
  const activities = useStore((s) => s.activities);
  const units = useStore((s) => s.settings.units);
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  const resetFilter = useStore((s) => s.resetFilter);
  const select = useStore((s) => s.select);

  const filtered = useMemo(() => applyFilters(activities, filter), [activities, filter]);
  const totals = useMemo(() => computeTotals(filtered), [filtered]);

  // Only show sports that actually exist in the library.
  const presentSports = useMemo(() => {
    const set = new Set(activities.map((a) => a.sport));
    return ALL_SPORTS.filter((s) => set.has(s));
  }, [activities]);

  if (!activities.length) {
    return (
      <>
        <PageHeader title="Activities" />
        <EmptyState />
      </>
    );
  }

  const toggleSport = (sport: SportCategory) => {
    const has = filter.sports.includes(sport);
    setFilter({ sports: has ? filter.sports.filter((s) => s !== sport) : [...filter.sports, sport] });
  };

  const hasActiveFilters =
    filter.search || filter.sports.length || filter.from != null || filter.to != null;

  return (
    <>
      <PageHeader
        title="Activities"
        subtitle={`${filtered.length} shown · ${formatDistance(totals.distanceM, units)} · ${formatDurationLong(
          totals.durationSec,
        )}`}
      />

      {/* Controls */}
      <div className="card mb-4 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={filter.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              placeholder="Search activities…"
              className="input pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filter.from ? toDateInput(filter.from) : ""}
              onChange={(e) => setFilter({ from: e.target.value ? new Date(e.target.value).getTime() : null })}
              className="input w-[150px]"
            />
            <span className="text-slate-600">→</span>
            <input
              type="date"
              value={filter.to ? toDateInput(filter.to) : ""}
              onChange={(e) =>
                setFilter({ to: e.target.value ? new Date(e.target.value).getTime() + 86_399_000 : null })
              }
              className="input w-[150px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filter.sortBy}
              onChange={(e) => setFilter({ sortBy: e.target.value as typeof filter.sortBy })}
              className="input w-[130px] cursor-pointer"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setFilter({ sortDir: filter.sortDir === "asc" ? "desc" : "asc" })}
              className="btn-ghost h-[38px] w-[38px] !px-0"
              title={filter.sortDir === "asc" ? "Ascending" : "Descending"}
            >
              <ArrowDownUp size={16} className={filter.sortDir === "asc" ? "rotate-180" : ""} />
            </button>
          </div>
        </div>

        {/* Sport chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {presentSports.map((sport) => {
            const active = filter.sports.includes(sport);
            const color = SPORT_COLOR[sport];
            return (
              <button
                key={sport}
                onClick={() => toggleSport(sport)}
                className="chip"
                style={
                  active
                    ? { borderColor: color, background: `${color}22`, color }
                    : { borderColor: "#252b3a", color: "#94a3b8" }
                }
              >
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                {SPORT_LABEL[sport]}
              </button>
            );
          })}
          {hasActiveFilters && (
            <button onClick={resetFilter} className="chip border-ink-700 text-slate-400 hover:text-slate-200">
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {filtered.length ? (
        <div className="card divide-y divide-ink-800/70 p-1.5">
          {filtered.map((a) => (
            <ActivityRow key={a.id} activity={a} units={units} onClick={() => select(a.id)} />
          ))}
        </div>
      ) : (
        <div className="card grid place-items-center p-12 text-center text-sm text-slate-500">
          No activities match these filters.
        </div>
      )}
    </>
  );
}

function toDateInput(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
