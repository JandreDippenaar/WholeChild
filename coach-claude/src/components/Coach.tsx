import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, KeyRound, MessageSquareHeart, Sparkles, Square, Trash2 } from "lucide-react";
import { useStore } from "../lib/store";
import { PageHeader } from "./ui";
import { Markdown } from "./Markdown";
import { buildSystemPrompt, streamCoach } from "../lib/claude";
import type { ChatMessage } from "../types";

const SUGGESTIONS = [
  "How's my training trending over the last month?",
  "Am I increasing my weekly volume too fast?",
  "Summarize my running fitness and suggest one thing to improve.",
  "What was my best week and why?",
  "Build me a simple 4-week plan based on my current volume.",
];

export function Coach() {
  const activities = useStore((s) => s.activities);
  const settings = useStore((s) => s.settings);
  const chat = useStore((s) => s.chat);
  const setChat = useStore((s) => s.setChat);
  const clearChat = useStore((s) => s.clearChat);
  const openHelp = useStore((s) => s.openHelp);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const system = useMemo(
    () => buildSystemPrompt(activities, settings.units),
    [activities, settings.units],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat]);

  const hasKey = settings.apiKey.trim().length > 0;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy || !hasKey) return;
    setInput("");

    const history: ChatMessage[] = [...chat, { role: "user", content }];
    const withPlaceholder: ChatMessage[] = [...history, { role: "assistant", content: "", streaming: true }];
    setChat(withPlaceholder);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let acc = "";
    try {
      await streamCoach({
        apiKey: settings.apiKey,
        model: settings.model,
        system,
        history,
        signal: controller.signal,
        onDelta: (delta) => {
          acc += delta;
          // Update the streaming assistant message in place.
          useStore.getState().setChat([...history, { role: "assistant", content: acc, streaming: true }]);
        },
      });
      useStore.getState().setChat([...history, { role: "assistant", content: acc, streaming: false }]);
    } catch (err) {
      const aborted = controller.signal.aborted;
      const msg = aborted
        ? acc + (acc ? "\n\n_(stopped)_" : "_(stopped)_")
        : `⚠ ${(err as Error).message || "Request failed."} Check your API key and model in Settings.`;
      useStore.getState().setChat([
        ...history,
        { role: "assistant", content: msg, streaming: false, error: !aborted },
      ]);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <PageHeader
        title="Coach Claude"
        subtitle={
          activities.length
            ? `Grounded in your ${activities.length} imported activities`
            : "Import data first, then ask away"
        }
        right={
          chat.length > 0 ? (
            <button onClick={clearChat} className="btn-ghost text-xs">
              <Trash2 size={14} /> Clear chat
            </button>
          ) : undefined
        }
      />

      {!hasKey ? (
        <div className="card grid flex-1 place-items-center p-10 text-center">
          <div className="max-w-sm">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15 text-brand-400">
              <KeyRound size={26} />
            </div>
            <h3 className="text-lg font-semibold">Connect Claude to start coaching</h3>
            <p className="mt-1.5 text-sm text-slate-400">
              Add your Anthropic API key in Settings. Coach Claude then analyzes your imported data
              and answers questions about your training.
            </p>
            <button onClick={() => openHelp("claude")} className="btn-primary mx-auto mt-4">
              <KeyRound size={15} /> How to connect Claude
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="card flex-1 space-y-4 overflow-y-auto p-5">
            {chat.length === 0 ? (
              <div className="grid h-full place-items-center">
                <div className="text-center">
                  <MessageSquareHeart className="mx-auto mb-3 text-brand-400/70" size={34} />
                  <p className="text-sm text-slate-400">Ask Coach Claude anything about your fitness data.</p>
                </div>
              </div>
            ) : (
              chat.map((m, i) => <Bubble key={i} message={m} />)
            )}
          </div>

          {/* Suggestions */}
          {chat.length === 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={!activities.length}
                  className="chip border-ink-700 text-slate-300 hover:border-brand-500/50 hover:text-brand-300 disabled:opacity-40"
                >
                  <Sparkles size={12} className="text-brand-400" />
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <div className="mt-3">
            <div className="card flex items-end gap-2 p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                rows={1}
                placeholder={activities.length ? "Ask about your training…" : "Import activities to get grounded answers…"}
                className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
              {busy ? (
                <button onClick={stop} className="btn-ghost h-10 w-10 !px-0" title="Stop">
                  <Square size={16} className="fill-current" />
                </button>
              ) : (
                <button
                  onClick={() => void send(input)}
                  disabled={!input.trim()}
                  className="btn-primary h-10 w-10 !px-0"
                  title="Send"
                >
                  <ArrowUp size={18} />
                </button>
              )}
            </div>
            <p className="mt-1.5 px-1 text-[11px] text-slate-600">
              Using {settings.model}. Your data summary is sent with each question. Not medical advice.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-brand-500 text-white"
            : message.error
              ? "border border-amber-500/30 bg-amber-500/10 text-amber-200"
              : "bg-ink-800 text-slate-100"
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : message.content ? (
          <Markdown text={message.content} />
        ) : (
          <span className="inline-flex gap-1">
            <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
          </span>
        )}
      </div>
    </div>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500"
      style={{ animationDelay: delay }}
    />
  );
}
