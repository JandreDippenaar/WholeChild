import { useEffect, useRef, useState } from "react";
import {
  Activity as ActivityIcon,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  MessageSquareHeart,
  Settings as SettingsIcon,
  Upload,
  X,
} from "lucide-react";
import { useStore } from "./lib/store";
import { Dashboard } from "./components/Dashboard";
import { Activities } from "./components/Activities";
import { Coach } from "./components/Coach";
import { Settings } from "./components/Settings";
import { ImportButton } from "./components/ImportButton";
import { ActivityDetail } from "./components/ActivityDetail";
import { HelpModal } from "./components/HelpModal";

import type { View } from "./lib/store";

const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "activities", label: "Activities", icon: ListChecks },
  { id: "coach", label: "Coach Claude", icon: MessageSquareHeart },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export default function App() {
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const activities = useStore((s) => s.activities);
  const apiKey = useStore((s) => s.settings.apiKey);
  const importStatus = useStore((s) => s.importStatus);
  const importFiles = useStore((s) => s.importFiles);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const help = useStore((s) => s.help);
  const openHelp = useStore((s) => s.openHelp);
  const closeHelp = useStore((s) => s.closeHelp);
  const maybeGenerateInsights = useStore((s) => s.maybeGenerateInsights);

  // Fire the dormant insight whenever data + a connected key become available.
  useEffect(() => {
    maybeGenerateInsights();
  }, [activities.length, apiKey, maybeGenerateInsights]);

  // Global drag & drop for importing anywhere in the app.
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    const onDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        dragDepth.current++;
        setDragging(true);
      }
    };
    const onDragLeave = () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const files = e.dataTransfer?.files;
      if (files && files.length) void importFiles(Array.from(files));
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [importFiles]);

  return (
    <div className="flex h-screen overflow-hidden text-slate-100">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-ink-700/60 bg-ink-900/60 px-3 py-4">
        <div className="flex items-center gap-2 px-2 pb-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
            <ActivityIcon size={20} />
          </div>
          <div className="leading-tight">
            <div className="font-semibold">Coach Claude</div>
            <div className="text-[11px] text-slate-500">Fitness intelligence</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  if (item.id !== "activities") select(null);
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-brand-500/15 text-brand-300"
                    : "text-slate-400 hover:bg-ink-800 hover:text-slate-200"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 px-1">
          <ImportButton />
          <button
            onClick={() => openHelp("import")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-ink-800 hover:text-slate-200"
          >
            <HelpCircle size={18} />
            Help &amp; guides
          </button>
          <div className="rounded-xl border border-ink-700/60 bg-ink-850/60 px-3 py-2 text-[11px] text-slate-500">
            {activities.length} activities stored locally
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="relative flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-6">
          {view === "dashboard" && <Dashboard onSeeAll={() => setView("activities")} />}
          {view === "activities" && <Activities />}
          {view === "coach" && <Coach />}
          {view === "settings" && <Settings />}
        </div>
      </main>

      {/* Activity detail overlay */}
      {selectedId && <ActivityDetail id={selectedId} onClose={() => select(null)} />}

      {/* Help & guides */}
      {help && <HelpModal initialTab={help} onClose={closeHelp} />}

      {/* Import toast */}
      {(importStatus.message || importStatus.warnings.length > 0) && <ImportToast />}

      {/* Drag overlay */}
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-ink-950/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-brand-500/60 bg-ink-900/80 px-16 py-12">
            <Upload className="text-brand-400" size={40} />
            <div className="text-lg font-semibold">Drop fitness files to import</div>
            <div className="text-sm text-slate-400">
              .fit · .gpx · .tcx · .csv · Apple/Samsung .zip
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImportToast() {
  const { message, warnings, busy } = useStore((s) => s.importStatus);
  const dismiss = useStore((s) => s.dismissWarnings);

  return (
    <div className="fixed bottom-5 right-5 z-40 w-96 max-w-[calc(100vw-2rem)] animate-fade-in">
      <div className="card overflow-hidden p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            {busy && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
            )}
            <span>{message || "Import"}</span>
          </div>
          {!busy && (
            <button onClick={dismiss} className="text-slate-500 hover:text-slate-300">
              <X size={16} />
            </button>
          )}
        </div>
        {warnings.length > 0 && (
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-amber-300/90">
            {warnings.map((w, i) => (
              <li key={i}>⚠ {w}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
