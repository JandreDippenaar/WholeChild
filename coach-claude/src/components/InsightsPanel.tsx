import { useEffect, useState } from "react";
import { ArrowUp, Eye, EyeOff, KeyRound, Loader2, MessageSquareHeart, RefreshCw, Sparkles } from "lucide-react";
import { useStore } from "../lib/store";
import { Markdown } from "./Markdown";

export function InsightsPanel() {
  const apiKey = useStore((s) => s.settings.apiKey);
  const chat = useStore((s) => s.chat);
  const chatBusy = useStore((s) => s.chatBusy);
  const activities = useStore((s) => s.activities);
  const runCoach = useStore((s) => s.runCoach);
  const setView = useStore((s) => s.setView);
  const openHelp = useStore((s) => s.openHelp);
  const updateSettings = useStore((s) => s.updateSettings);
  const clearChat = useStore((s) => s.clearChat);
  const maybeGenerateInsights = useStore((s) => s.maybeGenerateInsights);

  const hasKey = apiKey.trim().length > 0;
  const firstAssistant = chat.find((m) => m.role === "assistant");
  const insight = firstAssistant?.content;
  const generating = chatBusy && (!insight || firstAssistant?.streaming);

  // Belt-and-suspenders: also trigger from here once a key is present.
  useEffect(() => {
    if (hasKey) maybeGenerateInsights();
  }, [hasKey, activities.length, maybeGenerateInsights]);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-800/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500/15 text-brand-400">
            <Sparkles size={15} />
          </span>
          <span className="text-sm font-semibold">AI insights</span>
        </div>
        {hasKey && insight && !generating && (
          <button
            onClick={() => {
              clearChat();
              setTimeout(() => useStore.getState().maybeGenerateInsights(), 0);
            }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
          >
            <RefreshCw size={13} /> Regenerate
          </button>
        )}
      </div>

      <div className="p-4">
        {!hasKey ? (
          <ConnectForm onConnect={(key) => updateSettings({ apiKey: key })} onNeedKey={() => openHelp("claude")} />
        ) : generating && !insight ? (
          <div className="flex items-center gap-3 py-6 text-sm text-slate-400">
            <Loader2 size={18} className="animate-spin text-brand-400" />
            Coach Claude is analyzing your {activities.length} activities…
          </div>
        ) : insight ? (
          <>
            <Markdown text={insight} />
            {generating && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-brand-400 align-middle" />}
            {!generating && <FollowUp onAsk={(q) => { void runCoach(q); setView("coach"); }} onOpen={() => setView("coach")} />}
          </>
        ) : (
          <div className="flex items-center gap-3 py-6 text-sm text-slate-400">
            <Loader2 size={18} className="animate-spin text-brand-400" /> Preparing your insights…
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectForm({ onConnect, onNeedKey }: { onConnect: (key: string) => void; onNeedKey: () => void }) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
          <MessageSquareHeart size={18} />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-200">Want AI insights on your data?</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Connect Claude and Coach Claude will instantly analyze your training — then you can ask follow-up questions.
          </p>
        </div>
      </div>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (key.trim()) onConnect(key.trim());
        }}
      >
        <div className="relative flex-1">
          <KeyRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type={show ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Paste your Anthropic API key (sk-ant-…)"
            className="input pl-9 pr-10 font-mono text-xs"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <button type="submit" disabled={!key.trim()} className="btn-primary shrink-0">
          <Sparkles size={15} /> Connect &amp; get insights
        </button>
      </form>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <button onClick={onNeedKey} className="text-brand-400 hover:text-brand-300">
          Where do I get a key?
        </button>
        <span>Stored only in this browser.</span>
      </div>
    </div>
  );
}

function FollowUp({ onAsk, onOpen }: { onAsk: (q: string) => void; onOpen: () => void }) {
  const [q, setQ] = useState("");
  return (
    <div className="mt-4 border-t border-ink-800/70 pt-3">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) {
            onAsk(q.trim());
            setQ("");
          }
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask a follow-up about these insights…"
          className="input flex-1"
        />
        <button type="submit" disabled={!q.trim()} className="btn-primary h-[38px] w-[38px] !px-0" title="Ask">
          <ArrowUp size={17} />
        </button>
      </form>
      <button onClick={onOpen} className="mt-2 text-xs font-medium text-brand-400 hover:text-brand-300">
        Open full conversation in Coach Claude →
      </button>
    </div>
  );
}
