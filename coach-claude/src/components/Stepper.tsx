import { Check, KeyRound, Sparkles, Upload } from "lucide-react";
import { useStore } from "../lib/store";
import { ImportButton } from "./ImportButton";

/**
 * Compact 3-step onboarding guide shown on the Dashboard until the user has
 * uploaded data, connected Claude, and received their first insight.
 */
export function Stepper() {
  const activities = useStore((s) => s.activities);
  const hasKey = useStore((s) => s.settings.apiKey.trim().length > 0);
  const chat = useStore((s) => s.chat);
  const openHelp = useStore((s) => s.openHelp);

  const uploaded = activities.length > 0;
  const connected = hasKey;
  const insighted = chat.some((m) => m.role === "assistant" && !m.error);

  // Once all three are done, the guide disappears.
  if (uploaded && connected && insighted) return null;

  const steps = [
    {
      n: 1,
      label: "Upload your data",
      done: uploaded,
      icon: Upload,
      action: <ImportButton variant="ghost" />,
    },
    {
      n: 2,
      label: "Connect Claude",
      done: connected,
      icon: KeyRound,
      hint: "Add your API key on the insights card below or in Settings.",
    },
    {
      n: 3,
      label: "Get AI insights",
      done: insighted,
      icon: Sparkles,
      hint: "Generated automatically once Claude is connected.",
    },
  ];

  // The first not-yet-done step is the "active" one.
  const activeStep = steps.find((s) => !s.done)?.n ?? 0;

  return (
    <div className="card mb-5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Get set up in 3 steps</h2>
        <button onClick={() => openHelp("import")} className="text-xs font-medium text-brand-400 hover:text-brand-300">
          Need help?
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((s) => {
          const Icon = s.icon;
          const active = s.n === activeStep;
          return (
            <div
              key={s.n}
              className={`rounded-xl border p-3 transition-colors ${
                s.done
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : active
                    ? "border-brand-500/50 bg-brand-500/5"
                    : "border-ink-700/60 bg-ink-900/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-semibold ${
                    s.done
                      ? "bg-emerald-500/20 text-emerald-400"
                      : active
                        ? "bg-brand-500/20 text-brand-400"
                        : "bg-ink-800 text-slate-500"
                  }`}
                >
                  {s.done ? <Check size={15} /> : <Icon size={15} />}
                </span>
                <div className="text-sm font-medium">{s.label}</div>
              </div>
              {!s.done && active && (
                <div className="mt-2.5">
                  {s.action ?? <p className="text-xs text-slate-400">{s.hint}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
