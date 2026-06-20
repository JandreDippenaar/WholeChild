import { useState } from "react";
import { ChevronDown, FileDown, FlaskConical, KeyRound, Watch } from "lucide-react";
import { ImportButton } from "./ImportButton";
import { EXPORT_GUIDES } from "./exportGuides";
import { useStore } from "../lib/store";

export function EmptyState() {
  const openHelp = useStore((s) => s.openHelp);
  const loadDemo = useStore((s) => s.loadDemo);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-500/15 text-brand-400">
          <Watch size={30} />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Import your fitness data to begin</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-400">
            Drag & drop files anywhere, or use the button below. Coach Claude reads Garmin, Apple
            Health, Samsung Health, Strava and standard <code>.fit</code> / <code>.gpx</code> /{" "}
            <code>.tcx</code> / <code>.csv</code> exports — all locally, nothing is uploaded.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 sm:flex-row">
          <div className="w-56">
            <ImportButton />
          </div>
          <button onClick={() => openHelp("claude")} className="btn-ghost w-56 sm:w-auto">
            <KeyRound size={15} /> Connect Claude
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-px w-8 bg-ink-700" />
          just exploring?
          <span className="h-px w-8 bg-ink-700" />
        </div>
        <button onClick={loadDemo} className="btn-subtle -mt-1 text-brand-400 hover:bg-brand-500/10">
          <FlaskConical size={15} /> Load demo data
        </button>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
          <FileDown size={15} className="text-brand-400" />
          How to export from your device
        </h3>
        <div className="space-y-2">
          {EXPORT_GUIDES.map((g) => (
            <Guide key={g.id} guide={g} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Guide({ guide }: { guide: (typeof EXPORT_GUIDES)[number] }) {
  const [open, setOpen] = useState(guide.id === "samsung");
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-ink-800/40"
      >
        <div>
          <div className="text-sm font-medium">{guide.device}</div>
          <div className="text-xs text-slate-500">{guide.formats}</div>
        </div>
        <ChevronDown size={18} className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-ink-800/70 px-4 py-3">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-300">
            {guide.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {guide.note && (
            <p className="mt-3 rounded-lg bg-ink-900/60 px-3 py-2 text-xs text-slate-400">💡 {guide.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
