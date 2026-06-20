// TCX parser (Garmin Training Center). Reads Activities → Laps → Trackpoints,
// preferring lap totals when present.

import type { Activity, Sample } from "../../types";
import { buildActivity } from "./common";

function firstText(parent: Element, tag: string): string | undefined {
  const el = parent.getElementsByTagName(tag);
  return el.length ? el[0].textContent?.trim() || undefined : undefined;
}

function num(parent: Element, tag: string): number | undefined {
  const v = firstText(parent, tag);
  if (v == null) return undefined;
  const n = parseFloat(v);
  return isFinite(n) ? n : undefined;
}

export function parseTcx(content: string, fileName: string): Activity[] {
  const doc = new DOMParser().parseFromString(content, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) {
    throw new Error("Invalid TCX XML");
  }

  const activityEls = Array.from(doc.getElementsByTagName("Activity"));
  const out: Activity[] = [];

  for (const actEl of activityEls) {
    const sport = actEl.getAttribute("Sport") || "Activity";
    const laps = Array.from(actEl.getElementsByTagName("Lap"));

    let startMs = 0;
    let totalDistance = 0;
    let totalCalories = 0;
    let totalTime = 0;
    const samples: Sample[] = [];

    for (const lap of laps) {
      const startStr = lap.getAttribute("StartTime");
      const tStart = startStr ? Date.parse(startStr) : NaN;
      if (!startMs && isFinite(tStart)) startMs = tStart;

      totalDistance += num(lap, "DistanceMeters") ?? 0;
      totalCalories += num(lap, "Calories") ?? 0;
      totalTime += num(lap, "TotalTimeSeconds") ?? 0;

      const trackpoints = Array.from(lap.getElementsByTagName("Trackpoint"));
      for (const tp of trackpoints) {
        const timeStr = firstText(tp, "Time");
        const t = timeStr ? Date.parse(timeStr) : NaN;
        if (!startMs && isFinite(t)) startMs = t;

        const pos = tp.getElementsByTagName("Position")[0];
        const lat = pos ? num(pos, "LatitudeDegrees") : undefined;
        const lng = pos ? num(pos, "LongitudeDegrees") : undefined;

        // HeartRateBpm has a nested <Value>.
        const hrEl = tp.getElementsByTagName("HeartRateBpm")[0];
        const hr = hrEl ? parseFloat(hrEl.getElementsByTagName("Value")[0]?.textContent || "") : NaN;

        // Speed/Watts live in Extensions.
        const speed = num(tp, "Speed");
        const watts = num(tp, "Watts");

        samples.push({
          t: isFinite(t) && startMs ? (t - startMs) / 1000 : samples.length,
          lat,
          lng,
          ele: num(tp, "AltitudeMeters"),
          dist: num(tp, "DistanceMeters"),
          hr: isFinite(hr) ? hr : undefined,
          cad: num(tp, "Cadence"),
          speed: speed != null ? speed : undefined,
          power: watts,
        });
      }
    }

    if (!samples.length && !totalDistance) continue;

    out.push(
      buildActivity({
        source: "tcx",
        fileName,
        rawType: sport,
        startTime: startMs || Date.now(),
        samples,
        distanceM: totalDistance || undefined,
        durationSec: totalTime || undefined,
        calories: totalCalories || undefined,
      }),
    );
  }

  if (!out.length) throw new Error("No activities found in TCX");
  return out;
}
