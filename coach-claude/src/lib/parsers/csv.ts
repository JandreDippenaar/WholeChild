// CSV parser. Primary target is Samsung Health's exercise export
// (com.samsung.shealth.exercise.csv), with a flexible generic fallback that
// maps columns by fuzzy header matching.

import type { Activity } from "../../types";
import { buildSummaryActivity, normalizeSport } from "./common";

// Best-effort Samsung Health exercise_type codes → sport names. Samsung's
// numeric codes vary by app version, so unmapped codes fall back to "other".
const SAMSUNG_TYPES: Record<number, string> = {
  1001: "walking",
  1002: "running",
  11007: "walking",
  11008: "cycling",
  13001: "hiking",
  14001: "swimming",
  15006: "strength",
};

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function findCol(headers: string[], keywords: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (keywords.some((k) => h.includes(k))) return i;
  }
  return -1;
}

function parseDuration(raw: string): number {
  const v = raw.trim();
  if (!v) return 0;
  if (v.includes(":")) {
    const parts = v.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }
  const n = parseFloat(v);
  if (!isFinite(n)) return 0;
  // Heuristic: very large values are milliseconds.
  return n > 100000 ? n / 1000 : n;
}

function parseDate(raw: string): number {
  const v = raw.trim();
  if (!v) return NaN;
  // Pure epoch?
  if (/^\d{10,13}$/.test(v)) {
    const n = parseInt(v, 10);
    return v.length === 13 ? n : n * 1000;
  }
  const iso = v.replace(" ", "T");
  const t = Date.parse(iso);
  return isFinite(t) ? t : Date.parse(v);
}

export function parseCsv(content: string, fileName: string): Activity[] {
  const isSamsung = /com\.samsung/i.test(content) || /shealth/i.test(fileName);
  const rawLines = content.split(/\r?\n/).filter((l) => l.trim().length);
  if (!rawLines.length) throw new Error("Empty CSV");

  // Find the header row: the first line that contains a date/time-ish column.
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rawLines.length, 5); i++) {
    const cols = splitLine(rawLines[i]).map((c) => c.toLowerCase());
    if (cols.some((c) => /date|time|start/.test(c))) {
      headerIdx = i;
      break;
    }
  }

  const headers = splitLine(rawLines[headerIdx]);
  const dateCol = findCol(headers, ["start_time", "start time", "startdate", "date", "time"]);
  const durCol = findCol(headers, ["duration", "elapsed", "total_time", "moving"]);
  const distCol = findCol(headers, ["distance"]);
  const calCol = findCol(headers, ["calorie", "energy", "kcal"]);
  const hrCol = findCol(headers, ["heart_rate", "heart rate", "mean_heart", "avg_hr", "heartrate"]);
  const typeCol = findCol(headers, ["exercise_type", "workout", "activity_type", "sport", "type"]);

  if (dateCol === -1) {
    throw new Error("Could not find a date/time column in CSV");
  }

  const activities: Activity[] = [];
  for (let i = headerIdx + 1; i < rawLines.length; i++) {
    const cols = splitLine(rawLines[i]);
    if (cols.length <= dateCol) continue;

    const startMs = parseDate(cols[dateCol]);
    if (!isFinite(startMs)) continue;

    const durationSec = durCol !== -1 ? parseDuration(cols[durCol]) : 0;

    let distanceM: number | undefined;
    if (distCol !== -1) {
      const d = parseFloat(cols[distCol]);
      if (isFinite(d)) distanceM = isSamsung ? d : d; // Samsung distance is meters
    }

    let calories: number | undefined;
    if (calCol !== -1) {
      const c = parseFloat(cols[calCol]);
      if (isFinite(c)) calories = c;
    }

    let avgHr: number | undefined;
    if (hrCol !== -1) {
      const h = parseFloat(cols[hrCol]);
      if (isFinite(h) && h > 0) avgHr = Math.round(h);
    }

    let rawType = "Activity";
    if (typeCol !== -1) {
      const tv = cols[typeCol]?.trim();
      if (tv) {
        const asNum = parseInt(tv, 10);
        if (isSamsung && isFinite(asNum) && /^\d+$/.test(tv)) {
          rawType = SAMSUNG_TYPES[asNum] || "other";
        } else {
          rawType = tv;
        }
      }
    }

    // Skip rows with no useful payload.
    if (!durationSec && !distanceM && !calories) continue;

    const act = buildSummaryActivity({
      source: isSamsung ? "samsung" : "csv",
      fileName,
      rawType,
      startTime: startMs,
      durationSec,
      distanceM,
      calories,
      avgHr,
    });
    act.sport = normalizeSport(rawType);
    activities.push(act);
  }

  if (!activities.length) throw new Error("No data rows parsed from CSV");
  return activities;
}
