// GPX parser. Handles tracks with Garmin TrackPointExtension (hr/cad) and
// the common gpxdata extensions.

import type { Activity, Sample } from "../../types";
import { buildActivity } from "./common";

function text(el: Element | null | undefined, tag: string): string | undefined {
  if (!el) return undefined;
  const found = el.getElementsByTagName(tag);
  return found.length ? found[0].textContent?.trim() || undefined : undefined;
}

/** Find a numeric value from any descendant whose local tag name matches. */
function extNumber(point: Element, names: string[]): number | undefined {
  for (const name of names) {
    const all = point.getElementsByTagName("*");
    for (let i = 0; i < all.length; i++) {
      const local = all[i].localName?.toLowerCase();
      if (local && names.includes(local)) {
        const v = parseFloat(all[i].textContent || "");
        if (isFinite(v)) return v;
      }
    }
    void name;
  }
  return undefined;
}

export function parseGpx(content: string, fileName: string): Activity[] {
  const doc = new DOMParser().parseFromString(content, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) {
    throw new Error("Invalid GPX XML");
  }

  const trks = Array.from(doc.getElementsByTagName("trk"));
  const activities: Activity[] = [];

  // Fall back to all trkpt if there's no <trk> wrapper.
  const trackEls = trks.length
    ? trks
    : doc.getElementsByTagName("trkpt").length
      ? [doc.documentElement]
      : [];

  for (const trk of trackEls) {
    const pts = Array.from(trk.getElementsByTagName("trkpt"));
    if (!pts.length) continue;

    const rawType =
      text(trk, "type") ||
      doc.documentElement.getAttribute("creator")?.match(/run|ride|bik|walk|hik|swim/i)?.[0] ||
      "Activity";

    let startMs = 0;
    const samples: Sample[] = [];

    for (const pt of pts) {
      const lat = parseFloat(pt.getAttribute("lat") || "");
      const lng = parseFloat(pt.getAttribute("lon") || "");
      const timeStr = text(pt, "time");
      const t = timeStr ? Date.parse(timeStr) : NaN;
      if (!startMs && isFinite(t)) startMs = t;

      const ele = text(pt, "ele");
      const hr = extNumber(pt, ["hr"]);
      const cad = extNumber(pt, ["cad"]);
      const speedExt = extNumber(pt, ["speed"]);

      samples.push({
        t: isFinite(t) && startMs ? (t - startMs) / 1000 : samples.length,
        lat: isFinite(lat) ? lat : undefined,
        lng: isFinite(lng) ? lng : undefined,
        ele: ele != null ? parseFloat(ele) : undefined,
        hr,
        cad,
        speed: speedExt,
      });
    }

    if (!samples.length) continue;

    const name = text(trk, "name");
    const act = buildActivity({
      source: "gpx",
      fileName,
      rawType,
      startTime: startMs || Date.now(),
      samples,
    });
    if (name) act.name = name;
    activities.push(act);
  }

  if (!activities.length) {
    throw new Error("No track points found in GPX");
  }
  return activities;
}
