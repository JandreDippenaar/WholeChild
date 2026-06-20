// Coach Claude — Anthropic integration.
//
// This is a local-first app, so we call the Anthropic API directly from the
// browser using the user's own key (stored only in their browser). The key is
// never sent anywhere except api.anthropic.com.
//
// "Linking a Claude Pro/Max account" via OAuth requires a registered OAuth
// client and a backend redirect handler, which a purely local app can't host.
// For this MVP we use an API key from console.anthropic.com; the call site is
// isolated here so an OAuth flow can be added later without touching the UI.

import type AnthropicNS from "@anthropic-ai/sdk";
import type { Activity, ChatMessage } from "../types";
import type { UnitSystem } from "./format";
import {
  SPORT_LABEL,
  formatDistance,
  formatDuration,
  formatPace,
  paceSecPerUnit,
  usesPace,
} from "./format";
import { bySport, computeTotals, personalBests, streaks, trend } from "./stats";

const MAX_CONTEXT_ACTIVITIES = 160;

function fmtDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Build a compact, token-efficient text summary of the user's data. */
export function buildContext(activities: Activity[], units: UnitSystem): string {
  if (!activities.length) {
    return "The user has not imported any fitness data yet.";
  }

  const totals = computeTotals(activities);
  const sports = bySport(activities);
  const pbs = personalBests(activities);
  const streak = streaks(activities);
  const weekly = trend(activities, "week").slice(-8);

  const lines: string[] = [];
  lines.push(`UNITS: ${units}`);
  lines.push(
    `LIBRARY: ${totals.count} activities, ${formatDistance(totals.distanceM, units)} total, ` +
      `${formatDuration(totals.durationSec)} moving time, ${Math.round(totals.calories)} kcal, ` +
      `avg HR ${totals.avgHr ?? "n/a"}.`,
  );
  lines.push(
    `DATE RANGE: ${fmtDate(activities[activities.length - 1].startTime)} to ${fmtDate(
      activities[0].startTime,
    )}.`,
  );
  lines.push(`STREAK: current ${streak.current} day(s), longest ${streak.longest} day(s).`);

  lines.push("\nBY SPORT:");
  for (const s of sports) {
    lines.push(
      `- ${SPORT_LABEL[s.sport]}: ${s.count} sessions, ${formatDistance(s.distanceM, units)}, ${formatDuration(
        s.durationSec,
      )}.`,
    );
  }

  lines.push("\nPERSONAL BESTS:");
  if (pbs.longestDistance)
    lines.push(
      `- Longest distance: ${formatDistance(pbs.longestDistance.distanceM, units)} (${SPORT_LABEL[pbs.longestDistance.sport]}, ${fmtDate(pbs.longestDistance.startTime)}).`,
    );
  if (pbs.longestDuration)
    lines.push(
      `- Longest duration: ${formatDuration(pbs.longestDuration.durationSec)} (${SPORT_LABEL[pbs.longestDuration.sport]}, ${fmtDate(pbs.longestDuration.startTime)}).`,
    );
  if (pbs.fastestRunPace) {
    const pace = paceSecPerUnit(
      pbs.fastestRunPace.distanceM,
      pbs.fastestRunPace.movingSec ?? pbs.fastestRunPace.durationSec,
      units,
    );
    lines.push(`- Fastest run pace: ${formatPace(pace, units)} (${fmtDate(pbs.fastestRunPace.startTime)}).`);
  }
  if (pbs.biggestClimb?.elevationGainM)
    lines.push(
      `- Biggest climb: ${Math.round(pbs.biggestClimb.elevationGainM)} m (${fmtDate(pbs.biggestClimb.startTime)}).`,
    );

  if (weekly.length) {
    lines.push("\nRECENT WEEKLY VOLUME (week start → distance, time, sessions):");
    for (const w of weekly) {
      lines.push(`- ${w.label}: ${formatDistance(w.distanceM, units)}, ${formatDuration(w.durationSec)}, ${w.count}.`);
    }
  }

  const recent = activities.slice(0, MAX_CONTEXT_ACTIVITIES);
  lines.push(`\nACTIVITIES (most recent ${recent.length}):`);
  lines.push("date | sport | distance | duration | avgHR | pace/speed | elev | kcal");
  for (const a of recent) {
    const dur = a.movingSec ?? a.durationSec;
    let rate = "—";
    if (a.distanceM > 0) {
      if (usesPace(a.sport)) {
        rate = formatPace(paceSecPerUnit(a.distanceM, dur, units), units);
      } else if (dur > 0) {
        const kmh = (a.distanceM / dur) * 3.6;
        rate = `${(units === "metric" ? kmh : kmh / 1.609344).toFixed(1)} ${units === "metric" ? "km/h" : "mph"}`;
      }
    }
    lines.push(
      `${fmtDate(a.startTime)} | ${SPORT_LABEL[a.sport]} | ${formatDistance(a.distanceM, units)} | ${formatDuration(
        dur,
      )} | ${a.avgHr ?? "—"} | ${rate} | ${a.elevationGainM != null ? Math.round(a.elevationGainM) + "m" : "—"} | ${
        a.calories != null ? Math.round(a.calories) : "—"
      }`,
    );
  }

  if (activities.length > MAX_CONTEXT_ACTIVITIES) {
    lines.push(`…and ${activities.length - MAX_CONTEXT_ACTIVITIES} older activities (totals above include all).`);
  }

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are Coach Claude, a knowledgeable, encouraging endurance and fitness coach embedded in a personal fitness dashboard.

You have access to a summary of the user's imported workout data (provided below). Use it to give specific, data-grounded answers: cite real numbers, dates, and trends from their history rather than generalities. When you reference a value, make sure it actually appears in the data.

Guidelines:
- Be concise and direct. Lead with the answer, then brief supporting detail. Respond with your final answer directly — do not narrate your reasoning process.
- When giving training advice, ground it in their actual recent volume, pace/HR trends, and consistency. Flag big week-over-week jumps (injury risk) when relevant.
- Use the user's unit system (shown in the data).
- If the data is insufficient to answer, say so plainly and suggest what to import.
- You are not a medical professional; for pain, injury, or medical questions, add a short note to consult a professional.
- Format with short paragraphs and bullet lists. Use markdown sparingly.

USER FITNESS DATA
-----------------
`;

export function buildSystemPrompt(activities: Activity[], units: UnitSystem): string {
  return SYSTEM_PROMPT + buildContext(activities, units);
}

/**
 * The "dormant" prompt fired automatically the first time a user connects
 * Claude with data loaded. Reads cleanly as the opening user message and
 * primes the conversation for follow-up questions.
 */
export const INSIGHTS_PROMPT =
  "Give me a personalized read on my training so far. Cover: (1) a one-line overall summary, " +
  "(2) the most notable trends in my volume, pace/speed and heart rate, (3) how consistent I've been, " +
  "and (4) two or three specific, actionable suggestions. Keep it skimmable with short bullets.";

export interface StreamArgs {
  apiKey: string;
  model: string;
  system: string;
  history: ChatMessage[];
  onDelta: (text: string) => void;
  signal?: AbortSignal;
}

/** Stream a coaching reply. Returns the full assistant text. */
export async function streamCoach(args: StreamArgs): Promise<string> {
  // Dynamic import keeps the Anthropic SDK out of the initial bundle.
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({
    apiKey: args.apiKey,
    dangerouslyAllowBrowser: true,
  });

  const messages = args.history
    .filter((m) => m.content.trim().length > 0 && !m.error)
    .map((m) => ({ role: m.role, content: m.content }));

  const stream = client.messages.stream(
    {
      model: args.model || "claude-opus-4-8",
      max_tokens: 4096,
      system: args.system,
      messages,
    },
    { signal: args.signal },
  );

  stream.on("text", (delta) => args.onDelta(delta));

  const final = await stream.finalMessage();
  return final.content
    .filter((b): b is AnthropicNS.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
