// Shared helpers for the file parsers.

import type { Activity, Sample, SourceFormat, SportCategory } from "../../types";

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Map a raw sport/activity string (from any format) to our normalized set. */
export function normalizeSport(raw: string | undefined | null): SportCategory {
  const s = (raw || "").toLowerCase();
  if (!s) return "other";
  if (/run|jog|trail/.test(s)) return "running";
  if (/bik|cycl|ride|spinning|ebike|mtb/.test(s)) return "cycling";
  if (/walk/.test(s)) return "walking";
  if (/hik|trek|mountaineer/.test(s)) return "hiking";
  if (/swim|pool|water/.test(s)) return "swimming";
  if (/strength|weight|resist|gym|crossfit|functional/.test(s)) return "strength";
  if (/cardio|elliptical|rowing|treadmill|hiit|aerobic|step/.test(s)) return "cardio";
  return "other";
}

/** Clean Apple/Garmin enum strings like "HKWorkoutActivityTypeRunning" → "Running". */
export function humanizeType(raw: string): string {
  return raw
    .replace(/^HKWorkoutActivityType/, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

const MAX_SAMPLES = 1500;

/** Uniformly down-sample a series to keep storage + charts light. */
export function downsample(samples: Sample[], max = MAX_SAMPLES): Sample[] {
  if (samples.length <= max) return samples;
  const step = samples.length / max;
  const out: Sample[] = [];
  for (let i = 0; i < max; i++) {
    out.push(samples[Math.floor(i * step)]);
  }
  // Always keep the final point so totals line up.
  if (out[out.length - 1] !== samples[samples.length - 1]) {
    out.push(samples[samples.length - 1]);
  }
  return out;
}

function mean(nums: number[]): number | undefined {
  if (!nums.length) return undefined;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Sum positive elevation deltas, with a small smoothing threshold. */
function elevationGain(samples: Sample[]): number | undefined {
  const eles = samples.map((s) => s.ele).filter((e): e is number => e != null);
  if (eles.length < 2) return undefined;
  let gain = 0;
  let last = eles[0];
  for (let i = 1; i < eles.length; i++) {
    const diff = eles[i] - last;
    if (diff > 1) {
      gain += diff;
      last = eles[i];
    } else if (diff < -1) {
      last = eles[i];
    }
  }
  return gain;
}

/** Fill cumulative distance from GPS if the file didn't provide it. */
export function fillDistanceFromGps(samples: Sample[]): void {
  const hasDist = samples.some((s) => s.dist != null);
  if (hasDist) return;
  let cum = 0;
  let prev: Sample | undefined;
  for (const s of samples) {
    if (prev && s.lat != null && s.lng != null && prev.lat != null && prev.lng != null) {
      cum += haversineMeters(prev.lat, prev.lng, s.lat, s.lng);
    }
    s.dist = cum;
    if (s.lat != null && s.lng != null) prev = s;
  }
}

/** Derive instantaneous speed from distance deltas when missing. */
export function fillSpeedFromDistance(samples: Sample[]): void {
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (b.speed == null && a.dist != null && b.dist != null) {
      const dt = b.t - a.t;
      if (dt > 0) b.speed = Math.max(0, (b.dist - a.dist) / dt);
    }
  }
}

let counter = 0;
export function makeId(startTime: number, source: string): string {
  counter += 1;
  return `${source}-${startTime}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

interface BuildOpts {
  source: SourceFormat;
  fileName: string;
  rawType: string;
  startTime: number;
  samples: Sample[];
  /** Overrides — used when the file provides authoritative totals. */
  distanceM?: number;
  durationSec?: number;
  movingSec?: number;
  avgHr?: number;
  maxHr?: number;
  avgCadence?: number;
  avgPowerW?: number;
  elevationGainM?: number;
  calories?: number;
}

/**
 * Assemble an Activity from samples, computing any metrics not supplied.
 */
export function buildActivity(opts: BuildOpts): Activity {
  const raw = opts.samples;
  fillDistanceFromGps(raw);
  fillSpeedFromDistance(raw);

  const hasGps = raw.some((s) => s.lat != null && s.lng != null);
  const last = raw[raw.length - 1];

  const distanceM =
    opts.distanceM ?? (last?.dist != null ? last.dist : 0);
  const durationSec =
    opts.durationSec ?? (last ? last.t : 0);

  const hrs = raw.map((s) => s.hr).filter((h): h is number => h != null && h > 0);
  const cads = raw.map((s) => s.cad).filter((c): c is number => c != null && c > 0);
  const powers = raw.map((s) => s.power).filter((p): p is number => p != null && p > 0);

  const samples = downsample(raw);
  const sport = normalizeSport(opts.rawType);

  return {
    id: makeId(opts.startTime, opts.source),
    source: opts.source,
    fileName: opts.fileName,
    rawType: opts.rawType || "Activity",
    sport,
    name: `${humanizeType(opts.rawType) || "Activity"}`,
    startTime: opts.startTime,
    durationSec,
    movingSec: opts.movingSec,
    distanceM,
    avgHr: opts.avgHr ?? (hrs.length ? Math.round(mean(hrs)!) : undefined),
    maxHr: opts.maxHr ?? (hrs.length ? Math.max(...hrs) : undefined),
    avgCadence: opts.avgCadence ?? (cads.length ? Math.round(mean(cads)!) : undefined),
    avgPowerW: opts.avgPowerW ?? (powers.length ? Math.round(mean(powers)!) : undefined),
    elevationGainM: opts.elevationGainM ?? elevationGain(raw),
    calories: opts.calories,
    sampleCount: raw.length,
    hasGps,
    samples,
  };
}

/** A summary-only activity (no time series) — for Apple/Samsung exports. */
export function buildSummaryActivity(opts: {
  source: SourceFormat;
  fileName: string;
  rawType: string;
  startTime: number;
  durationSec: number;
  distanceM?: number;
  calories?: number;
  avgHr?: number;
}): Activity {
  return {
    id: makeId(opts.startTime, opts.source),
    source: opts.source,
    fileName: opts.fileName,
    rawType: opts.rawType,
    sport: normalizeSport(opts.rawType),
    name: humanizeType(opts.rawType) || "Activity",
    startTime: opts.startTime,
    durationSec: opts.durationSec,
    distanceM: opts.distanceM ?? 0,
    avgHr: opts.avgHr,
    calories: opts.calories,
    sampleCount: 0,
    hasGps: false,
    samples: [],
  };
}
