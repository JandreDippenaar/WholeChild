// Formatting + unit helpers. Coach Claude works in metric internally and
// converts on display based on the user's chosen unit system.

import type { SportCategory } from "../types";

export type UnitSystem = "metric" | "imperial";

const KM_PER_MILE = 1.609344;
const M_PER_FOOT = 0.3048;

export function formatDistance(meters: number, units: UnitSystem): string {
  if (!meters) return units === "metric" ? "0 km" : "0 mi";
  if (units === "metric") {
    const km = meters / 1000;
    return km < 1 ? `${Math.round(meters)} m` : `${km.toFixed(2)} km`;
  }
  const miles = meters / 1000 / KM_PER_MILE;
  return `${miles.toFixed(2)} mi`;
}

export function distanceValue(meters: number, units: UnitSystem): number {
  return units === "metric" ? meters / 1000 : meters / 1000 / KM_PER_MILE;
}

export function distanceUnit(units: UnitSystem): string {
  return units === "metric" ? "km" : "mi";
}

export function formatElevation(meters: number | undefined, units: UnitSystem): string {
  if (meters == null) return "—";
  if (units === "metric") return `${Math.round(meters)} m`;
  return `${Math.round(meters / M_PER_FOOT)} ft`;
}

export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) return "0:00";
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatDurationLong(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Pace from distance + duration. Returns sec per km (metric) or sec per mile.
 * Returns null when not meaningful (e.g. cycling, no distance).
 */
export function paceSecPerUnit(
  meters: number,
  seconds: number,
  units: UnitSystem,
): number | null {
  if (!meters || !seconds) return null;
  const unitMeters = units === "metric" ? 1000 : 1000 * KM_PER_MILE;
  return (seconds / meters) * unitMeters;
}

export function formatPace(secPerUnit: number | null, units: UnitSystem): string {
  if (secPerUnit == null || !isFinite(secPerUnit)) return "—";
  const m = Math.floor(secPerUnit / 60);
  const s = Math.round(secPerUnit % 60);
  return `${m}:${String(s).padStart(2, "0")} /${distanceUnit(units)}`;
}

export function formatSpeed(meters: number, seconds: number, units: UnitSystem): string {
  if (!meters || !seconds) return "—";
  const mps = meters / seconds;
  const kmh = mps * 3.6;
  if (units === "metric") return `${kmh.toFixed(1)} km/h`;
  return `${(kmh / KM_PER_MILE).toFixed(1)} mph`;
}

/** Pace makes sense for foot sports; speed for wheels/water. */
export function usesPace(sport: SportCategory): boolean {
  return sport === "running" || sport === "walking" || sport === "hiking";
}

export const SPORT_LABEL: Record<SportCategory, string> = {
  running: "Running",
  cycling: "Cycling",
  walking: "Walking",
  hiking: "Hiking",
  swimming: "Swimming",
  strength: "Strength",
  cardio: "Cardio",
  other: "Other",
};

export const SPORT_COLOR: Record<SportCategory, string> = {
  running: "#f55a2a",
  cycling: "#38bdf8",
  walking: "#a3e635",
  hiking: "#fbbf24",
  swimming: "#2dd4bf",
  strength: "#a78bfa",
  cardio: "#fb7185",
  other: "#94a3b8",
};

export function formatNumber(n: number | undefined, digits = 0): string {
  if (n == null || !isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
