# Coach Claude 🏃‍♂️⚡

Import your fitness data from **Garmin, Apple Watch, Samsung Galaxy Watch, Strava**
and any standard workout file, visualize it with rich dashboards, and **ask Claude**
about your training — all running locally in your browser.

> MVP first iteration. Everything runs on your machine: your activity files are parsed
> in the browser and stored in IndexedDB. Nothing is uploaded anywhere except the
> data **summary** sent to the Anthropic API when you ask Coach Claude a question.

---

## Features

- **Universal import** — drag & drop `.fit`, `.gpx`, `.tcx`, `.csv`, Apple Health
  `export.zip`, or Samsung Health `.zip`. Formats are auto-detected; zips are unpacked
  in-browser.
- **Dashboard** — totals, weekly/monthly volume trends, sport mix, personal bests,
  activity streaks.
- **Activity explorer** — search, filter by sport and date range, sort by date /
  distance / duration / pace / heart rate.
- **Activity detail** — offline route map (colour-graded by speed), heart-rate,
  elevation and pace/speed charts, and per-km/mi splits.
- **Coach Claude** — a chat coach grounded in *your* data. It sees a compact summary
  of your history and answers questions, spots trends, and suggests training tweaks.
- **Local-first & private** — data lives in your browser; metric/imperial units;
  delete everything anytime.

---

## Run it locally (test in Chrome)

```bash
cd coach-claude
npm install
npm run dev
```

Open **http://localhost:5180** in Chrome.

Two sample files are included to try it immediately — drag them in from
`coach-claude/public/samples/` (`sample-run.gpx`, `sample-ride.tcx`).

Production build: `npm run build` then `npm run preview`.

---

## Exporting your data from each device

You can also do this in-app (the empty Dashboard and **Settings → Exporting data**
show the same steps).

### Samsung Health (Galaxy Watch)
1. On your phone, open **Samsung Health**.
2. Open the menu → **Settings**.
3. Choose **Download personal data**.
4. Samsung saves a **`.zip` of `.csv` files** to your phone.
5. Move the `.zip` to your computer and drop it into Coach Claude.
   *(For a single workout with its GPS route: open the exercise → ⋮ → export as GPX.)*

### Garmin (Connect / watch)
1. Per activity: open **connect.garmin.com**, open an activity → ⚙ (top-right) →
   **Export to GPX** or **Export Original** (`.fit`).
2. Or copy `.fit` files directly from the watch over USB: `/GARMIN/Activity/*.fit`.
3. Whole account: Garmin **Account → Export Your Data**.
4. Drop the `.fit` / `.gpx` / `.tcx` files in. `.fit` is the richest (HR, cadence, power, laps).

### Apple Health (Apple Watch / iPhone)
1. Open the **Health** app on iPhone.
2. Tap your **profile photo** (top-right).
3. Scroll down → **Export All Health Data**.
4. Share **`export.zip`** to your computer and drop it in. Coach Claude pulls out
   every Workout. *(Apple's export is workout summaries — no per-second streams.)*

### Strava / other apps
- Strava: open an activity → ⋯ → **Export GPX** (or Export Original for `.fit`).
- Coros, Suunto, Wahoo, Polar etc. all export `.fit`, `.gpx`, or `.tcx`. Just drop them in.

---

## Connecting Claude

Coach Claude uses the **Anthropic API** with your own key.

1. Go to **console.anthropic.com** and sign in with your Claude account.
2. Open **API Keys → Create Key**, copy the key (starts with `sk-ant-`).
3. In Coach Claude, open **Settings → Connect Claude**, paste the key, click **Test**.
4. Head to **Coach Claude** and start asking questions.

The key is stored **only in your browser** (localStorage) and is sent only to
`api.anthropic.com`. The default model is `claude-opus-4-8` (you can switch to
Sonnet/Haiku in Settings).

**Why an API key and not "Log in with Claude Pro/Max"?**
A hosted "Log in with Claude" (OAuth) flow needs a registered OAuth client and a
server to receive the redirect — which a purely local app can't host. The API key
uses your same Anthropic account. (API usage is billed per token, separately from a
Pro/Max chat subscription.) The Claude call is isolated in `src/lib/claude.ts`, so an
OAuth flow can be added later without touching the UI.

---

## Tech & architecture

- **Vite + React + TypeScript + Tailwind**, **Recharts** for charts, **Zustand** for
  state, **idb-keyval** for local persistence.
- Parsing is all client-side: `fflate` (zip), `fit-file-parser` (FIT binary),
  `DOMParser` (GPX/TCX), regex streaming (Apple Health XML), flexible CSV (Samsung +
  generic).
- `src/lib/parsers/` — one module per format + a router (`index.ts`).
- `src/lib/stats.ts` — aggregations (totals, trends, PBs, streaks, filtering).
- `src/lib/claude.ts` — builds the data summary and streams the coaching reply.

## Roadmap / known limitations

- Apple & Samsung CSV exports are summaries (no per-second streams), so those
  activities show totals without detailed charts; FIT/GPX/TCX include full detail.
- Samsung numeric sport codes are mapped best-effort; unknown codes show as "Other".
- Possible next steps: tiled maps, HR-zone analysis, training load / fitness-fatigue,
  OAuth "Log in with Claude", and CSV/JSON export of your library.
