// Export the activity library as CSV (summaries) or JSON (full, incl. samples).

import type { Activity } from "../types";

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function cell(v: string | number | undefined | null): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_HEADER = [
  "date",
  "time",
  "sport",
  "name",
  "distance_m",
  "duration_s",
  "moving_s",
  "avg_hr",
  "max_hr",
  "avg_cadence",
  "avg_power_w",
  "elevation_gain_m",
  "calories",
  "has_gps",
  "source",
  "file",
];

export function exportLibraryCsv(activities: Activity[]) {
  const rows = activities.map((a) => {
    const d = new Date(a.startTime);
    return [
      d.toISOString().slice(0, 10),
      d.toISOString().slice(11, 19),
      a.sport,
      cell(a.name),
      Math.round(a.distanceM),
      Math.round(a.durationSec),
      a.movingSec != null ? Math.round(a.movingSec) : "",
      a.avgHr ?? "",
      a.maxHr ?? "",
      a.avgCadence ?? "",
      a.avgPowerW ?? "",
      a.elevationGainM != null ? Math.round(a.elevationGainM) : "",
      a.calories != null ? Math.round(a.calories) : "",
      a.hasGps ? "yes" : "no",
      a.source,
      cell(a.fileName),
    ].join(",");
  });
  const csv = [CSV_HEADER.join(","), ...rows].join("\n");
  download(csv, `coach-claude-library-${stamp()}.csv`, "text/csv;charset=utf-8");
}

export function exportLibraryJson(activities: Activity[]) {
  const payload = {
    app: "Coach Claude",
    exportedAt: new Date().toISOString(),
    count: activities.length,
    activities,
  };
  download(JSON.stringify(payload, null, 2), `coach-claude-library-${stamp()}.json`, "application/json");
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}
