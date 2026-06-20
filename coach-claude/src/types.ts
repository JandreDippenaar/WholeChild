// Core domain model for Coach Claude.

export type SourceFormat = "gpx" | "tcx" | "fit" | "apple" | "samsung" | "csv" | "demo";

/** A single point in an activity's time series. */
export interface Sample {
  /** Seconds since activity start. */
  t: number;
  lat?: number;
  lng?: number;
  /** Elevation, meters. */
  ele?: number;
  /** Heart rate, bpm. */
  hr?: number;
  /** Cadence, rpm or spm. */
  cad?: number;
  /** Instantaneous speed, m/s. */
  speed?: number;
  /** Power, watts. */
  power?: number;
  /** Cumulative distance, meters. */
  dist?: number;
}

/** A normalized sport category we group/colour by. */
export type SportCategory =
  | "running"
  | "cycling"
  | "walking"
  | "hiking"
  | "swimming"
  | "strength"
  | "cardio"
  | "other";

export interface Activity {
  id: string;
  source: SourceFormat;
  fileName: string;
  /** Raw sport string from the file, e.g. "trail_running". */
  rawType: string;
  sport: SportCategory;
  /** Display name (often the sport + date). */
  name: string;
  /** Epoch milliseconds at activity start. */
  startTime: number;
  /** Total elapsed seconds. */
  durationSec: number;
  /** Moving time seconds (best-effort; falls back to duration). */
  movingSec?: number;
  /** Distance, meters. */
  distanceM: number;
  avgHr?: number;
  maxHr?: number;
  avgCadence?: number;
  avgPowerW?: number;
  /** Elevation gain, meters. */
  elevationGainM?: number;
  calories?: number;
  /** Number of samples retained. */
  sampleCount: number;
  /** Whether GPS track is present. */
  hasGps: boolean;
  /** Down-sampled time series (kept reasonably small). */
  samples: Sample[];
}

/** Result of parsing one uploaded file (may yield several activities). */
export interface ParseResult {
  activities: Activity[];
  warnings: string[];
}

export interface FilterState {
  search: string;
  sports: SportCategory[];
  /** Epoch ms range, inclusive. null = open ended. */
  from: number | null;
  to: number | null;
  sortBy: "date" | "distance" | "duration" | "pace" | "avgHr";
  sortDir: "asc" | "desc";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** True while the assistant message is still streaming. */
  streaming?: boolean;
  error?: boolean;
}
