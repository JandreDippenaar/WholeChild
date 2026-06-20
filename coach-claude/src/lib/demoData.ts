// Generates a realistic ~10-week training history so new users can explore the
// dashboard, trends, HR zones, route map and Coach insights without a file.

import type { Activity, Sample, SportCategory } from "../types";
import { buildActivity } from "./parsers/common";

const DAY = 86400000;

interface Session {
  /** Days offset within the week (0 = Monday). */
  day: number;
  sport: SportCategory;
  rawType: string;
  minutes: number;
  speedKmh: number; // 0 for non-distance sessions
  hr: number; // target average
  gps: boolean;
}

// One representative training week; repeated with light week-to-week variation.
const WEEK: Session[] = [
  { day: 0, sport: "running", rawType: "running", minutes: 38, speedKmh: 10.5, hr: 150, gps: true },
  { day: 1, sport: "strength", rawType: "strength training", minutes: 45, speedKmh: 0, hr: 118, gps: false },
  { day: 2, sport: "cycling", rawType: "cycling", minutes: 65, speedKmh: 27, hr: 138, gps: true },
  { day: 3, sport: "running", rawType: "interval running", minutes: 42, speedKmh: 11.6, hr: 165, gps: true },
  { day: 5, sport: "running", rawType: "long run", minutes: 82, speedKmh: 9.8, hr: 146, gps: true },
  { day: 6, sport: "walking", rawType: "walking", minutes: 52, speedKmh: 5.4, hr: 102, gps: true },
];

function jitter(base: number, pct: number): number {
  return base * (1 + (Math.random() - 0.5) * 2 * pct);
}

function makeSamples(s: Session, weekIdx: number): Sample[] {
  const totalSec = Math.round(jitter(s.minutes, 0.12) * 60);
  const step = 15; // one sample every 15s
  const n = Math.max(20, Math.round(totalSec / step));
  const speedMps = s.speedKmh / 3.6;
  const totalDist = speedMps * totalSec;

  const baseLat = 37.773 + (Math.random() - 0.5) * 0.08;
  const baseLng = -122.42 + (Math.random() - 0.5) * 0.08;
  const radius = 0.008 + (totalDist / 5000) * 0.006;

  const samples: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const frac = i / (n - 1);
    const t = i * step;
    // Slight progressive fitness bump across weeks shows up in HR drift.
    const hr =
      s.hr +
      Math.sin(frac * Math.PI * 3) * 7 +
      frac * 9 -
      weekIdx * 0.4 +
      (Math.random() - 0.5) * 5;
    const sample: Sample = {
      t,
      hr: Math.round(Math.max(80, hr)),
      speed: s.speedKmh > 0 ? speedMps : undefined,
      dist: s.speedKmh > 0 ? totalDist * frac : undefined,
    };
    if (s.gps) {
      const ang = frac * Math.PI * 2;
      sample.lat = baseLat + radius * Math.sin(ang) + Math.sin(ang * 5) * 0.0004;
      sample.lng = baseLng + radius * Math.cos(ang) * 1.3;
      sample.ele = 40 + Math.sin(ang * 2) * 22 + Math.sin(ang * 6) * 6;
    }
    samples.push(sample);
  }
  return samples;
}

export function generateDemoActivities(weeks = 10): Activity[] {
  const out: Activity[] = [];
  const now = new Date();
  // Monday of the current week.
  const monday = new Date(now);
  monday.setHours(7, 0, 0, 0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  for (let w = 0; w < weeks; w++) {
    const weekIdx = weeks - 1 - w; // oldest first for progression feel
    const weekStart = monday.getTime() - weekIdx * 7 * DAY;
    for (const s of WEEK) {
      // Occasionally skip a session for realism.
      if (Math.random() < 0.12) continue;
      const start = weekStart + s.day * DAY + Math.round((Math.random() - 0.5) * 2) * 3600000;
      const samples = makeSamples(s, weekIdx);
      const cal = Math.round(jitter(s.minutes * (s.sport === "cycling" ? 9 : 11), 0.1));
      out.push(
        buildActivity({
          source: "demo",
          fileName: "demo-data",
          rawType: s.rawType,
          startTime: start,
          samples,
          calories: cal,
        }),
      );
    }
  }

  return out.sort((a, b) => b.startTime - a.startTime);
}
