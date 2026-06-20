// File router: detect format (by extension and content), unpack zips, and
// dispatch to the right parser. Everything runs in the browser.

import { unzipSync, strFromU8 } from "fflate";
import type { Activity, ParseResult } from "../../types";
import { parseGpx } from "./gpx";
import { parseTcx } from "./tcx";
import { parseFit } from "./fit";
import { parseAppleHealth } from "./appleHealth";
import { parseCsv } from "./csv";

function ext(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

/** Route XML/text content to gpx/tcx/apple by sniffing the markup. */
function parseTextByContent(content: string, fileName: string): Activity[] {
  const head = content.slice(0, 4000);
  if (/<TrainingCenterDatabase/i.test(head)) return parseTcx(content, fileName);
  if (/<gpx[\s>]/i.test(head)) return parseGpx(content, fileName);
  if (/HealthData|<Workout/i.test(head)) return parseAppleHealth(content, fileName);
  // Fall back by extension hint.
  const e = ext(fileName);
  if (e === "tcx") return parseTcx(content, fileName);
  if (e === "gpx") return parseGpx(content, fileName);
  if (e === "csv") return parseCsv(content, fileName);
  throw new Error(`Unrecognized file format: ${fileName}`);
}

async function parseEntry(
  name: string,
  bytes: Uint8Array,
  warnings: string[],
): Promise<Activity[]> {
  const e = ext(name);
  try {
    if (e === "fit") {
      // Copy into a fresh ArrayBuffer (zip entries may be backed by a shared buffer).
      const ab = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(ab).set(bytes);
      return await parseFit(ab, name);
    }
    if (e === "csv") {
      return parseCsv(strFromU8(bytes), name);
    }
    if (e === "gpx" || e === "tcx" || e === "xml" || e === "") {
      return parseTextByContent(strFromU8(bytes), name);
    }
    // Unknown extension inside a zip — try text sniffing, ignore binaries.
    if (e === "json" || e === "txt") return parseTextByContent(strFromU8(bytes), name);
    return [];
  } catch (err) {
    warnings.push(`${name}: ${(err as Error).message}`);
    return [];
  }
}

async function readBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export async function parseFiles(files: File[]): Promise<ParseResult> {
  const activities: Activity[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    const e = ext(file.name);
    try {
      if (e === "fit") {
        activities.push(...(await parseFit(await file.arrayBuffer(), file.name)));
      } else if (e === "zip") {
        const zipped = unzipSync(await readBytes(file));
        const names = Object.keys(zipped);
        // Apple export.zip → process export.xml; otherwise process everything.
        const ordered = names.sort((a, b) => {
          const ax = /export\.xml$/i.test(a) ? 0 : 1;
          const bx = /export\.xml$/i.test(b) ? 0 : 1;
          return ax - bx;
        });
        let foundAppleSummary = false;
        for (const name of ordered) {
          if (name.endsWith("/")) continue;
          // Skip per-workout route GPX once we have Apple summaries to avoid dupes.
          if (foundAppleSummary && /workout-routes\//i.test(name)) continue;
          const got = await parseEntry(name, zipped[name], warnings);
          if (got.length && got[0].source === "apple") foundAppleSummary = true;
          activities.push(...got);
        }
      } else if (e === "csv") {
        activities.push(...parseCsv(await file.text(), file.name));
      } else {
        activities.push(...parseTextByContent(await file.text(), file.name));
      }
    } catch (err) {
      warnings.push(`${file.name}: ${(err as Error).message}`);
    }
  }

  // Sort newest first and de-duplicate by start time + distance fingerprint.
  const seen = new Set<string>();
  const deduped: Activity[] = [];
  for (const a of activities.sort((x, y) => y.startTime - x.startTime)) {
    const key = `${Math.round(a.startTime / 1000)}-${Math.round(a.distanceM)}-${a.sport}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(a);
  }

  return { activities: deduped, warnings };
}
