// FIT parser (Garmin, Wahoo, Coros, Suunto, many Samsung exports).
// Uses fit-file-parser for the binary decode, then maps records → samples.

import FitParser from "fit-file-parser";
import type { Activity, Sample } from "../../types";
import { buildActivity } from "./common";

interface FitRecord {
  timestamp?: Date;
  elapsed_time?: number;
  position_lat?: number;
  position_long?: number;
  altitude?: number;
  enhanced_altitude?: number;
  heart_rate?: number;
  cadence?: number;
  speed?: number;
  enhanced_speed?: number;
  power?: number;
  distance?: number;
}

interface FitSession {
  sport?: string;
  sub_sport?: string;
  start_time?: Date;
  total_distance?: number;
  total_elapsed_time?: number;
  total_timer_time?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  total_calories?: number;
  total_ascent?: number;
  avg_cadence?: number;
  avg_power?: number;
}

interface FitData {
  records?: FitRecord[];
  sessions?: FitSession[];
  activity?: { timestamp?: Date };
}

function parseBuffer(buf: ArrayBuffer): Promise<FitData> {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({
      force: true,
      speedUnit: "m/s",
      lengthUnit: "m",
      temperatureUnit: "celsius",
      elapsedRecordField: true,
      mode: "list",
    });
    parser.parse(buf, (err: unknown, data: FitData) => {
      if (err) reject(err instanceof Error ? err : new Error(String(err)));
      else resolve(data);
    });
  });
}

export async function parseFit(buf: ArrayBuffer, fileName: string): Promise<Activity[]> {
  const data = await parseBuffer(buf);
  const records = data.records || [];
  const session = data.sessions?.[0];

  let startMs = 0;
  if (session?.start_time) startMs = session.start_time.getTime();
  else if (records[0]?.timestamp) startMs = records[0].timestamp.getTime();
  else if (data.activity?.timestamp) startMs = data.activity.timestamp.getTime();
  if (!startMs) startMs = Date.now();

  const samples: Sample[] = [];
  for (const r of records) {
    const t =
      r.elapsed_time != null
        ? r.elapsed_time
        : r.timestamp
          ? (r.timestamp.getTime() - startMs) / 1000
          : samples.length;
    samples.push({
      t,
      lat: r.position_lat,
      lng: r.position_long,
      ele: r.enhanced_altitude ?? r.altitude,
      hr: r.heart_rate,
      cad: r.cadence,
      speed: r.enhanced_speed ?? r.speed,
      power: r.power,
      dist: r.distance,
    });
  }

  const rawType = [session?.sub_sport, session?.sport].filter(Boolean).join(" ") || "Activity";

  if (!samples.length && !session) {
    throw new Error("No records found in FIT file");
  }

  return [
    buildActivity({
      source: "fit",
      fileName,
      rawType,
      startTime: startMs,
      samples,
      distanceM: session?.total_distance,
      durationSec: session?.total_elapsed_time,
      movingSec: session?.total_timer_time,
      avgHr: session?.avg_heart_rate,
      maxHr: session?.max_heart_rate,
      avgCadence: session?.avg_cadence,
      avgPowerW: session?.avg_power,
      elevationGainM: session?.total_ascent,
      calories: session?.total_calories,
    }),
  ];
}
