import { useState } from "react";
import Anthropic from "@anthropic-ai/sdk";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Loader2,
  Ruler,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useStore } from "../lib/store";
import { PageHeader, SectionTitle } from "./ui";
import { CLAUDE_CONNECT_NOTE, CLAUDE_CONNECT_STEPS, EXPORT_GUIDES } from "./exportGuides";

const MODELS = [
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 (most capable)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (faster, cheaper)" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fastest)" },
];

export function Settings() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const activities = useStore((s) => s.activities);
  const clearAll = useStore((s) => s.clearAll);

  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [testMsg, setTestMsg] = useState("");

  const testConnection = async () => {
    if (!settings.apiKey.trim()) return;
    setTestState("testing");
    setTestMsg("");
    try {
      const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });
      await client.messages.create({
        model: settings.model,
        max_tokens: 8,
        messages: [{ role: "user", content: "Reply with: ok" }],
      });
      setTestState("ok");
      setTestMsg("Connected — Coach Claude is ready.");
    } catch (err) {
      setTestState("fail");
      setTestMsg((err as Error).message || "Connection failed.");
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Connect Claude, choose units, manage your data" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Connect Claude */}
        <section className="card p-5">
          <SectionTitle>
            <span className="flex items-center gap-2">
              <KeyRound size={15} className="text-brand-400" /> Connect Claude
            </span>
          </SectionTitle>

          <label className="text-xs font-medium text-slate-400">Anthropic API key</label>
          <div className="mt-1.5 flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) => {
                  update({ apiKey: e.target.value });
                  setTestState("idle");
                }}
                placeholder="sk-ant-…"
                className="input pr-10 font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button onClick={testConnection} disabled={!settings.apiKey.trim() || testState === "testing"} className="btn-ghost">
              {testState === "testing" ? <Loader2 size={15} className="animate-spin" /> : "Test"}
            </button>
          </div>

          {testState === "ok" && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 size={14} /> {testMsg}
            </p>
          )}
          {testState === "fail" && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-400">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {testMsg}
            </p>
          )}

          <label className="mt-4 block text-xs font-medium text-slate-400">Model</label>
          <select value={settings.model} onChange={(e) => update({ model: e.target.value })} className="input mt-1.5 cursor-pointer">
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>

          <div className="mt-4 rounded-xl border border-ink-800 bg-ink-900/50 p-3.5">
            <div className="mb-2 text-xs font-semibold text-slate-300">How to get your key</div>
            <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-400">
              {CLAUDE_CONNECT_STEPS.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300"
            >
              Open Anthropic Console <ExternalLink size={12} />
            </a>
            <p className="mt-3 border-t border-ink-800 pt-2.5 text-[11px] leading-relaxed text-slate-500">
              {CLAUDE_CONNECT_NOTE}
            </p>
          </div>
        </section>

        {/* Preferences + data */}
        <div className="space-y-5">
          <section className="card p-5">
            <SectionTitle>
              <span className="flex items-center gap-2">
                <Ruler size={15} className="text-accent-sky" /> Units
              </span>
            </SectionTitle>
            <div className="flex gap-2">
              {(["metric", "imperial"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => update({ units: u })}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm capitalize transition-colors ${
                    settings.units === u
                      ? "border-brand-500/60 bg-brand-500/10 text-brand-300"
                      : "border-ink-700 text-slate-400 hover:bg-ink-800"
                  }`}
                >
                  {u}
                  <div className="text-[11px] text-slate-500">{u === "metric" ? "km, m, km/h" : "mi, ft, mph"}</div>
                </button>
              ))}
            </div>

            <label className="mt-4 block text-xs font-medium text-slate-400">Max heart rate (optional)</label>
            <input
              type="number"
              value={settings.maxHr ?? ""}
              onChange={(e) => update({ maxHr: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 190"
              className="input mt-1.5 w-40"
            />
          </section>

          <section className="card p-5">
            <SectionTitle>
              <span className="flex items-center gap-2">
                <Database size={15} className="text-accent-violet" /> Your data
              </span>
            </SectionTitle>
            <p className="text-sm text-slate-400">
              {activities.length} activities are stored locally in this browser (IndexedDB). Nothing is uploaded
              anywhere except the data summary you send to Claude when you ask a question.
            </p>
            <button
              onClick={() => {
                if (confirm("Delete all imported activities? This cannot be undone.")) clearAll();
              }}
              disabled={!activities.length}
              className="btn-ghost mt-3 text-rose-400 hover:bg-rose-500/10"
            >
              <Trash2 size={15} /> Delete all activities
            </button>
          </section>
        </div>
      </div>

      {/* Export guides */}
      <section className="mt-5 card p-5">
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Sparkles size={15} className="text-accent-amber" /> Exporting data from your devices
          </span>
        </SectionTitle>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {EXPORT_GUIDES.map((g) => (
            <div key={g.id} className="rounded-xl border border-ink-800 bg-ink-900/50 p-4">
              <div className="text-sm font-medium">{g.device}</div>
              <div className="mb-2 text-[11px] text-slate-500">{g.formats}</div>
              <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-400">
                {g.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              {g.note && <p className="mt-2 text-[11px] text-slate-500">💡 {g.note}</p>}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
