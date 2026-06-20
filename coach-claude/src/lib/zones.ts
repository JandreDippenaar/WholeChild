// Heart-rate zone analysis (% of max HR).

import type { Activity, Sample } from "../types";

export interface Zone {
  id: number;
  name: string;
  short: string;
  /** Lower bound as fraction of max HR (inclusive). */
  min: number;
  /** Upper bound as fraction of max HR (exclusive). */
  max: number;
  color: string;
}

export const ZONES: Zone[] = [
  { id: 1, name: "Recovery", short: "Z1", min: 0.0, max: 0.6, color: "#38bdf8" },
  { id: 2, name: "Endurance", short: "Z2", min: 0.6, max: 0.7, color: "#22c55e" },
  { id: 3, name: "Tempo", short: "Z3", min: 0.7, max: 0.8, color: "#fbbf24" },
  { id: 4, name: "Threshold", short: "Z4", min: 0.8, max: 0.9, color: "#fb923c" },
  { id: 5, name: "VO₂ Max", short: "Z5", min: 0.9, max: 2.0, color: "#ef4444" },
];

export function zoneIndexOf(hr: number, maxHr: number): number {
  const f = hr / maxHr;
  for (let i = 0; i < ZONES.length; i++) {
    if (f < ZONES[i].max) return i;
  }
  return ZONES.length - 1;
}

/** Seconds spent in each zone, from a sample series. */
export function timeInZones(samples: Sample[], maxHr: number): number[] {
  const secs = [0, 0, 0, 0, 0];
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (s.hr == null || s.hr <= 0) continue;
    const next = samples[i + 1];
    let dt = next ? next.t - s.t : 0;
    if (dt <= 0) dt = 0;
    // A large gap usually means a pause; don't attribute it all to one zone.
    if (dt > 30) dt = 1;
    secs[zoneIndexOf(s.hr, maxHr)] += dt;
  }
  return secs;
}

/** Pick a max HR: explicit setting → highest observed → 190 default. */
export function resolveMaxHr(settingsMaxHr: number | undefined, activities: Activity[]): number {
  if (settingsMaxHr && settingsMaxHr > 0) return settingsMaxHr;
  let m = 0;
  for (const a of activities) if (a.maxHr && a.maxHr > m) m = a.maxHr;
  return m > 0 ? m : 190;
}

/** Aggregate zone seconds across many activities (those with HR samples). */
export function aggregateZones(activities: Activity[], maxHr: number): number[] {
  const total = [0, 0, 0, 0, 0];
  for (const a of activities) {
    if (!a.samples.length) continue;
    const z = timeInZones(a.samples, maxHr);
    for (let i = 0; i < 5; i++) total[i] += z[i];
  }
  return total;
}

/** HR bounds (bpm) for each zone given a max HR — for display. */
export function zoneBounds(zone: Zone, maxHr: number): { lo: number; hi: number | null } {
  return {
    lo: Math.round(zone.min * maxHr),
    hi: zone.id === 5 ? null : Math.round(zone.max * maxHr),
  };
}
