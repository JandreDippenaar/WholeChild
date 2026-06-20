// Aggregations & analytics over the activity set.

import type { Activity, FilterState, SportCategory } from "../types";
import { paceSecPerUnit, usesPace } from "./format";

export interface Totals {
  count: number;
  distanceM: number;
  durationSec: number;
  elevationGainM: number;
  calories: number;
  avgHr: number | undefined;
}

export function computeTotals(activities: Activity[]): Totals {
  let distanceM = 0;
  let durationSec = 0;
  let elevationGainM = 0;
  let calories = 0;
  let hrSum = 0;
  let hrCount = 0;

  for (const a of activities) {
    distanceM += a.distanceM;
    durationSec += a.durationSec;
    elevationGainM += a.elevationGainM ?? 0;
    calories += a.calories ?? 0;
    if (a.avgHr) {
      hrSum += a.avgHr;
      hrCount++;
    }
  }

  return {
    count: activities.length,
    distanceM,
    durationSec,
    elevationGainM,
    calories,
    avgHr: hrCount ? Math.round(hrSum / hrCount) : undefined,
  };
}

export interface SportBreakdown {
  sport: SportCategory;
  count: number;
  distanceM: number;
  durationSec: number;
}

export function bySport(activities: Activity[]): SportBreakdown[] {
  const map = new Map<SportCategory, SportBreakdown>();
  for (const a of activities) {
    const cur = map.get(a.sport) ?? {
      sport: a.sport,
      count: 0,
      distanceM: 0,
      durationSec: 0,
    };
    cur.count++;
    cur.distanceM += a.distanceM;
    cur.durationSec += a.durationSec;
    map.set(a.sport, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.durationSec - a.durationSec);
}

export interface TrendPoint {
  /** Period key, e.g. "2024-W12" or "2024-03". */
  key: string;
  label: string;
  ts: number;
  distanceM: number;
  durationSec: number;
  count: number;
  elevationGainM: number;
}

function weekKey(d: Date): { key: string; label: string; ts: number } {
  // ISO week.
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  // Monday of this week for ts/label.
  const monday = new Date(d);
  const offset = (d.getDay() + 6) % 7;
  monday.setDate(d.getDate() - offset);
  monday.setHours(0, 0, 0, 0);
  return {
    key: `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`,
    label: monday.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    ts: monday.getTime(),
  };
}

function monthKey(d: Date): { key: string; label: string; ts: number } {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return {
    key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    label: first.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
    ts: first.getTime(),
  };
}

export function trend(
  activities: Activity[],
  grouping: "week" | "month",
): TrendPoint[] {
  const map = new Map<string, TrendPoint>();
  for (const a of activities) {
    const d = new Date(a.startTime);
    const { key, label, ts } = grouping === "week" ? weekKey(d) : monthKey(d);
    const cur =
      map.get(key) ??
      ({ key, label, ts, distanceM: 0, durationSec: 0, count: 0, elevationGainM: 0 } as TrendPoint);
    cur.distanceM += a.distanceM;
    cur.durationSec += a.durationSec;
    cur.elevationGainM += a.elevationGainM ?? 0;
    cur.count++;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
}

export interface PersonalBest {
  label: string;
  activity: Activity;
  value: string;
}

/** Longest distance, longest duration, fastest pace (running), biggest climb. */
export function personalBests(activities: Activity[]): {
  longestDistance?: Activity;
  longestDuration?: Activity;
  biggestClimb?: Activity;
  fastestRunPace?: Activity;
} {
  let longestDistance: Activity | undefined;
  let longestDuration: Activity | undefined;
  let biggestClimb: Activity | undefined;
  let fastestRunPace: Activity | undefined;
  let bestPace = Infinity;

  for (const a of activities) {
    if (!longestDistance || a.distanceM > longestDistance.distanceM) longestDistance = a;
    if (!longestDuration || a.durationSec > longestDuration.durationSec) longestDuration = a;
    if ((a.elevationGainM ?? 0) > (biggestClimb?.elevationGainM ?? 0)) biggestClimb = a;
    if (usesPace(a.sport) && a.distanceM > 1000) {
      const pace = paceSecPerUnit(a.distanceM, a.movingSec ?? a.durationSec, "metric");
      if (pace && pace < bestPace) {
        bestPace = pace;
        fastestRunPace = a;
      }
    }
  }
  return { longestDistance, longestDuration, biggestClimb, fastestRunPace };
}

/** Current and longest streak of consecutive active days. */
export function streaks(activities: Activity[]): { current: number; longest: number } {
  if (!activities.length) return { current: 0, longest: 0 };
  const days = new Set<string>();
  for (const a of activities) {
    const d = new Date(a.startTime);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  const sorted = Array.from(days)
    .map((k) => {
      const [y, m, d] = k.split("-").map(Number);
      return new Date(y, m, d).getTime();
    })
    .sort((a, b) => a - b);

  const DAY = 86400000;
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] <= DAY * 1.5) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Current streak counts back from today/yesterday.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let current = 0;
  let cursor = today.getTime();
  const daySet = new Set(sorted);
  // Allow the streak to be "alive" if the last activity was today or yesterday.
  if (!daySet.has(cursor)) cursor -= DAY;
  while (daySet.has(cursor)) {
    current++;
    cursor -= DAY;
  }

  return { current, longest };
}

// ---- Filtering & sorting ----

export function applyFilters(activities: Activity[], f: FilterState): Activity[] {
  let result = activities.filter((a) => {
    if (f.sports.length && !f.sports.includes(a.sport)) return false;
    if (f.from != null && a.startTime < f.from) return false;
    if (f.to != null && a.startTime > f.to) return false;
    if (f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      const hay = `${a.name} ${a.rawType} ${a.sport} ${a.fileName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const dir = f.sortDir === "asc" ? 1 : -1;
  result = result.slice().sort((a, b) => {
    let av: number;
    let bv: number;
    switch (f.sortBy) {
      case "distance":
        av = a.distanceM;
        bv = b.distanceM;
        break;
      case "duration":
        av = a.durationSec;
        bv = b.durationSec;
        break;
      case "avgHr":
        av = a.avgHr ?? -1;
        bv = b.avgHr ?? -1;
        break;
      case "pace": {
        av = paceSecPerUnit(a.distanceM, a.durationSec, "metric") ?? Infinity;
        bv = paceSecPerUnit(b.distanceM, b.durationSec, "metric") ?? Infinity;
        break;
      }
      case "date":
      default:
        av = a.startTime;
        bv = b.startTime;
    }
    return (av - bv) * dir;
  });

  return result;
}
