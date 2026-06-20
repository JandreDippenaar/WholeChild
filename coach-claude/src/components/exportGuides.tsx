// Per-device export instructions, shown in onboarding, the Help modal, and the
// Activities empty state. Kept in one place so they stay consistent.

export interface ExportGuide {
  id: string;
  device: string;
  formats: string;
  steps: string[];
  note?: string;
}

export const EXPORT_GUIDES: ExportGuide[] = [
  {
    id: "samsung",
    device: "Samsung Health (Galaxy Watch)",
    formats: ".zip of .csv (whole history) · .gpx (per workout)",
    steps: [
      "On your phone, open Samsung Health.",
      "Tap the ☰ / Settings (⋮) menu → Settings.",
      "Choose “Download personal data” (under About / Personal data).",
      "Confirm — Samsung emails/saves a .zip of .csv files to your phone storage.",
      "Transfer the .zip to this computer and drop it here. Coach Claude reads the exercise CSV automatically.",
    ],
    note: "For a single workout with the GPS route, open the exercise → ⋮ → Share/Export as GPX.",
  },
  {
    id: "garmin",
    device: "Garmin (Connect / watch)",
    formats: ".fit · .gpx · .tcx",
    steps: [
      "Best per activity: open Garmin Connect on the web (connect.garmin.com).",
      "Open an activity → gear icon (⚙) top-right → “Export to GPX” or “Export Original” (.fit).",
      "Or pull .fit files directly: plug the watch in via USB and copy /GARMIN/Activity/*.fit.",
      "Whole account: Garmin → Account → “Export Your Data” gives a large archive (look inside for .fit/.tcx).",
      "Drop the .fit / .gpx / .tcx files (or the folder) here.",
    ],
    note: ".fit is richest (HR, cadence, power, laps). Coach Claude reads all three.",
  },
  {
    id: "apple",
    device: "Apple Health (Apple Watch / iPhone)",
    formats: "export.zip (contains export.xml)",
    steps: [
      "On your iPhone open the Health app.",
      "Tap your profile photo (top-right).",
      "Scroll down → “Export All Health Data”.",
      "Share the resulting export.zip to this computer (AirDrop, email, or Files).",
      "Drop export.zip here — Coach Claude pulls out every Workout.",
    ],
    note: "Apple's export is workout summaries (no per-second streams). For routes, export individual workouts via a third-party app as GPX.",
  },
  {
    id: "strava",
    device: "Strava / other apps",
    formats: ".gpx · .tcx · .fit",
    steps: [
      "Strava: open an activity → ⋯ → “Export GPX” (or Export Original for .fit).",
      "Most run/ride apps (Coros, Suunto, Wahoo, Polar) export .fit, .gpx or .tcx.",
      "Drop whatever you get here — the format is detected automatically.",
    ],
  },
];

export const CLAUDE_CONNECT_STEPS: string[] = [
  "Go to console.anthropic.com and sign in with your Claude account.",
  "Open “API Keys” → “Create Key”, give it a name, and copy the key (starts with sk-ant-).",
  "Paste it into Settings → Connect Claude here in Coach Claude.",
  "The key is stored only in this browser (localStorage) and is sent only to api.anthropic.com.",
];

export const CLAUDE_CONNECT_NOTE =
  "Coach Claude runs entirely on your machine, so it can't host the OAuth redirect that a hosted “Log in with Claude” (Pro/Max) flow needs. The API key above uses your same Anthropic account. Usage of claude-opus-4-8 is billed per token via the API — separate from a Pro/Max chat subscription.";
