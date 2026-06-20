// Global app state (Zustand) with IndexedDB persistence for activities + chat,
// and localStorage for settings. Everything stays on the user's machine.

import { create } from "zustand";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type { Activity, ChatMessage, FilterState } from "../types";
import type { UnitSystem } from "./format";
import { parseFiles } from "./parsers";
import { INSIGHTS_PROMPT, buildSystemPrompt, streamCoach } from "./claude";
import { generateDemoActivities } from "./demoData";

const ACTIVITIES_KEY = "coach-claude:activities";
const CHAT_KEY = "coach-claude:chat";
const SETTINGS_KEY = "coach-claude:settings";

export interface Settings {
  apiKey: string;
  model: string;
  units: UnitSystem;
  /** Optional resting/max HR for zone calc (max only used). */
  maxHr?: number;
}

const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  model: "claude-opus-4-8",
  units: "metric",
};

const DEFAULT_FILTER: FilterState = {
  search: "",
  sports: [],
  from: null,
  to: null,
  sortBy: "date",
  sortDir: "desc",
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

interface ImportStatus {
  busy: boolean;
  message: string;
  warnings: string[];
}

export type HelpTab = "import" | "claude";
export type View = "dashboard" | "activities" | "coach" | "settings";

interface AppState {
  loaded: boolean;
  activities: Activity[];
  filter: FilterState;
  selectedId: string | null;
  settings: Settings;
  chat: ChatMessage[];
  chatBusy: boolean;
  /** Guard so the auto-insight only ever fires once per loaded library. */
  insightsRequested: boolean;
  importStatus: ImportStatus;
  help: HelpTab | null;
  view: View;

  setView: (view: View) => void;
  openHelp: (tab: HelpTab) => void;
  closeHelp: () => void;
  runCoach: (text: string) => Promise<void>;
  stopCoach: () => void;
  maybeGenerateInsights: () => void;
  loadDemo: () => void;
  init: () => Promise<void>;
  importFiles: (files: File[]) => Promise<void>;
  removeActivity: (id: string) => void;
  clearAll: () => void;
  select: (id: string | null) => void;
  setFilter: (patch: Partial<FilterState>) => void;
  resetFilter: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setChat: (messages: ChatMessage[]) => void;
  clearChat: () => void;
  dismissWarnings: () => void;
}

async function persistActivities(activities: Activity[]) {
  await idbSet(ACTIVITIES_KEY, activities);
}
async function persistChat(chat: ChatMessage[]) {
  await idbSet(CHAT_KEY, chat);
}

// Abort controller for the in-flight coaching stream (module-scoped).
let coachAbort: AbortController | null = null;

export const useStore = create<AppState>((set, get) => ({
  loaded: false,
  activities: [],
  filter: DEFAULT_FILTER,
  selectedId: null,
  settings: loadSettings(),
  chat: [],
  chatBusy: false,
  insightsRequested: false,
  importStatus: { busy: false, message: "", warnings: [] },
  help: null,
  view: "dashboard",

  setView: (view) => set({ view }),
  openHelp: (tab) => set({ help: tab }),
  closeHelp: () => set({ help: null }),

  init: async () => {
    const [activities, chat] = await Promise.all([
      idbGet<Activity[]>(ACTIVITIES_KEY),
      idbGet<ChatMessage[]>(CHAT_KEY),
    ]);
    set({
      activities: activities ?? [],
      chat: chat ?? [],
      // If a conversation already exists, insights were already generated.
      insightsRequested: (chat?.length ?? 0) > 0,
      loaded: true,
    });
  },

  runCoach: async (text) => {
    const content = text.trim();
    const { settings, activities, chat, chatBusy } = get();
    if (!content || chatBusy || !settings.apiKey.trim()) return;

    const history: ChatMessage[] = [...chat, { role: "user", content }];
    // Set busy + placeholder synchronously so concurrent triggers bail out.
    set({ chatBusy: true, chat: [...history, { role: "assistant", content: "", streaming: true }] });

    const controller = new AbortController();
    coachAbort = controller;
    const system = buildSystemPrompt(activities, settings.units);

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
          set({ chat: [...history, { role: "assistant", content: acc, streaming: true }] });
        },
      });
      const finalChat: ChatMessage[] = [...history, { role: "assistant", content: acc, streaming: false }];
      void persistChat(finalChat);
      set({ chat: finalChat });
    } catch (err) {
      const aborted = controller.signal.aborted;
      const msg = aborted
        ? acc + (acc ? "\n\n_(stopped)_" : "_(stopped)_")
        : `⚠ ${(err as Error).message || "Request failed."} Check your API key and model in Settings.`;
      const finalChat: ChatMessage[] = [
        ...history,
        { role: "assistant", content: msg, streaming: false, error: !aborted },
      ];
      void persistChat(finalChat);
      set({ chat: finalChat });
    } finally {
      coachAbort = null;
      set({ chatBusy: false });
    }
  },

  stopCoach: () => coachAbort?.abort(),

  // The "dormant" auto-insight: fires once when data + a connected key exist
  // and no conversation has started yet.
  maybeGenerateInsights: () => {
    const { activities, settings, chat, chatBusy, insightsRequested } = get();
    if (insightsRequested || chatBusy || chat.length > 0) return;
    if (!activities.length || !settings.apiKey.trim()) return;
    set({ insightsRequested: true });
    void get().runCoach(INSIGHTS_PROMPT);
  },

  importFiles: async (files) => {
    set({ importStatus: { busy: true, message: `Reading ${files.length} file(s)…`, warnings: [] } });
    try {
      const { activities: parsed, warnings } = await parseFiles(files);
      const existing = get().activities;

      // Merge + de-dupe across the existing library.
      const seen = new Set(
        existing.map((a) => `${Math.round(a.startTime / 1000)}-${Math.round(a.distanceM)}-${a.sport}`),
      );
      const additions = parsed.filter((a) => {
        const key = `${Math.round(a.startTime / 1000)}-${Math.round(a.distanceM)}-${a.sport}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const merged = [...existing, ...additions].sort((a, b) => b.startTime - a.startTime);
      await persistActivities(merged);

      const dupes = parsed.length - additions.length;
      const parts = [`Imported ${additions.length} activit${additions.length === 1 ? "y" : "ies"}`];
      if (dupes > 0) parts.push(`${dupes} duplicate(s) skipped`);

      set({
        activities: merged,
        importStatus: {
          busy: false,
          message: parts.join(" · "),
          warnings,
        },
      });
    } catch (err) {
      set({
        importStatus: {
          busy: false,
          message: "Import failed",
          warnings: [(err as Error).message],
        },
      });
    }
  },

  loadDemo: () => {
    const demo = generateDemoActivities();
    const existing = get().activities;
    const key = (a: Activity) =>
      `${Math.round(a.startTime / 1000)}-${Math.round(a.distanceM)}-${a.sport}`;
    const seen = new Set(existing.map(key));
    const additions = demo.filter((a) => {
      const k = key(a);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const merged = [...existing, ...additions].sort((a, b) => b.startTime - a.startTime);
    void persistActivities(merged);
    set({
      activities: merged,
      importStatus: {
        busy: false,
        message: `Loaded ${additions.length} demo activities`,
        warnings: [],
      },
    });
  },

  removeActivity: (id) => {
    const activities = get().activities.filter((a) => a.id !== id);
    void persistActivities(activities);
    set({
      activities,
      selectedId: get().selectedId === id ? null : get().selectedId,
    });
  },

  clearAll: () => {
    void idbDel(ACTIVITIES_KEY);
    set({ activities: [], selectedId: null });
  },

  select: (id) => set({ selectedId: id }),

  setFilter: (patch) => set({ filter: { ...get().filter, ...patch } }),
  resetFilter: () => set({ filter: DEFAULT_FILTER }),

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    set({ settings });
  },

  setChat: (messages) => {
    void persistChat(messages);
    set({ chat: messages });
  },
  clearChat: () => {
    void idbDel(CHAT_KEY);
    set({ chat: [], insightsRequested: false });
  },

  dismissWarnings: () =>
    set({ importStatus: { ...get().importStatus, warnings: [], message: "" } }),
}));
