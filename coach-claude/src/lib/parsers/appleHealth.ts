// Apple Health export parser. Apple's export.xml can be hundreds of MB, so we
// extract <Workout> blocks with a regex instead of building a full DOM.
// Distance/energy live either as attributes (older exports) or in nested
// <WorkoutStatistics> elements (newer exports) — we read both.

import type { Activity } from "../../types";
import { buildSummaryActivity } from "./common";

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : undefined;
}

function parseAppleDate(s: string | undefined): number {
  if (!s) return NaN;
  // "2024-03-01 07:00:00 +0200" -> "2024-03-01T07:00:00+0200"
  const iso = s.trim().replace(" ", "T").replace(" ", "");
  return Date.parse(iso);
}

function toMeters(value: number, unit: string | undefined): number {
  const u = (unit || "").toLowerCase();
  if (u === "km") return value * 1000;
  if (u === "mi") return value * 1609.344;
  if (u === "m") return value;
  if (u === "ft") return value * 0.3048;
  return value * 1000; // Apple distance defaults to km
}

export function parseAppleHealth(content: string, fileName: string): Activity[] {
  const out: Activity[] = [];
  const workoutRe = /<Workout\b[^>]*?(?:\/>|>[\s\S]*?<\/Workout>)/g;
  let match: RegExpExecArray | null;

  while ((match = workoutRe.exec(content))) {
    const block = match[0];
    const openTag = block.match(/<Workout\b[^>]*>/)?.[0] || block;

    const rawType = attr(openTag, "workoutActivityType") || "Workout";
    const startMs = parseAppleDate(attr(openTag, "startDate"));
    if (!isFinite(startMs)) continue;

    // Duration.
    let durationSec = 0;
    const dur = parseFloat(attr(openTag, "duration") || "");
    if (isFinite(dur)) {
      const unit = (attr(openTag, "durationUnit") || "min").toLowerCase();
      durationSec = unit === "min" ? dur * 60 : unit === "h" ? dur * 3600 : dur;
    }

    // Distance + energy: attributes first, then WorkoutStatistics.
    let distanceM: number | undefined;
    const distAttr = parseFloat(attr(openTag, "totalDistance") || "");
    if (isFinite(distAttr)) distanceM = toMeters(distAttr, attr(openTag, "totalDistanceUnit"));

    let calories: number | undefined;
    const energyAttr = parseFloat(attr(openTag, "totalEnergyBurned") || "");
    if (isFinite(energyAttr)) calories = energyAttr;

    const statsRe = /<WorkoutStatistics\b[^>]*\/?>/g;
    let stat: RegExpExecArray | null;
    while ((stat = statsRe.exec(block))) {
      const tag = stat[0];
      const type = attr(tag, "type") || "";
      const sum = parseFloat(attr(tag, "sum") || "");
      if (!isFinite(sum)) continue;
      if (/Distance/i.test(type) && distanceM == null) {
        distanceM = toMeters(sum, attr(tag, "unit"));
      } else if (/EnergyBurned/i.test(type) && calories == null) {
        calories = sum;
      }
    }

    out.push(
      buildSummaryActivity({
        source: "apple",
        fileName,
        rawType,
        startTime: startMs,
        durationSec,
        distanceM,
        calories,
      }),
    );
  }

  if (!out.length) {
    throw new Error("No <Workout> entries found in Apple Health export");
  }
  return out;
}
