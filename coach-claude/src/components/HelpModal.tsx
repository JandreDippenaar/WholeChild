import { useEffect, useState } from "react";
import { ChevronDown, Download, ExternalLink, KeyRound, X } from "lucide-react";
import { CLAUDE_CONNECT_NOTE, CLAUDE_CONNECT_STEPS, EXPORT_GUIDES } from "./exportGuides";

type Tab = "import" | "claude";

export function HelpModal({ onClose, initialTab = "import" }: { onClose: () => void; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl animate-fade-in flex-col overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header + tabs */}
        <div className="flex items-center justify-between border-b border-ink-800 px-5 py-4">
          <h2 className="text-base font-semibold">Getting started</h2>
          <button onClick={onClose} className="btn-subtle" title="Close">
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-1 border-b border-ink-800 px-3 pt-3">
          <TabBtn active={tab === "import"} onClick={() => setTab("import")} icon={<Download size={15} />}>
            Import your data
          </TabBtn>
          <TabBtn active={tab === "claude"} onClick={() => setTab("claude")} icon={<KeyRound size={15} />}>
            Connect Claude
          </TabBtn>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4">
          {tab === "import" ? (
            <>
              <p className="mb-4 text-sm text-slate-400">
                Export a file from your device, then drag it anywhere into Coach Claude (or use the
                <span className="mx-1 rounded-md bg-ink-800 px-1.5 py-0.5 text-xs">Import data</span>
                button). Everything is processed locally — nothing is uploaded.
              </p>
              <div className="space-y-2">
                {EXPORT_GUIDES.map((g, i) => (
                  <Guide key={g.id} guide={g} defaultOpen={i === 0} />
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-400">
                Coach Claude uses the Anthropic API with your own key, stored only in this browser.
              </p>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
                {CLAUDE_CONNECT_STEPS.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-400 hover:text-brand-300"
              >
                Open Anthropic Console <ExternalLink size={13} />
              </a>
              <p className="mt-4 rounded-xl border border-ink-800 bg-ink-900/60 px-3.5 py-3 text-[12px] leading-relaxed text-slate-500">
                {CLAUDE_CONNECT_NOTE}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-brand-500 text-brand-300"
          : "border-transparent text-slate-500 hover:text-slate-300"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Guide({ guide, defaultOpen }: { guide: (typeof EXPORT_GUIDES)[number]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-ink-800">
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
