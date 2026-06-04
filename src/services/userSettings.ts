/**
 * userSettings — persistent user preferences in localStorage.
 *
 * Covers AI model, language, default response style, and UI preferences.
 * Uses a single JSON blob at a stable key for simplicity.
 */

const KEY = "tutor:settings";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export type ResponseStyle  = "concise" | "detailed" | "expert";
export type AIModel        = "gpt-4o-mini" | "gpt-4o";
export type AppLocale      = "en" | "cs";
export type CodeTheme      = "github-dark" | "github-light" | "dracula" | "one-dark-pro";

export interface UserSettings {
  /** Preferred AI model slug */
  model: AIModel;
  /** Default response style (can still be overridden per session) */
  responseStyle: ResponseStyle;
  /** UI language */
  locale: AppLocale;
  /** Syntax-highlight theme for code blocks */
  codeTheme: CodeTheme;
  /** Show the context panel by default when opening a concept */
  showContextPanelByDefault: boolean;
  /** Auto-scroll to the latest message while streaming */
  autoScroll: boolean;
  /** Show quick-reply chips in TutorInput */
  showQuickReplies: boolean;
  /** Show related concept chips on messages */
  showRelatedConcepts: boolean;
  /** Enable voice input button */
  voiceInputEnabled: boolean;
  /** Send message on Enter (vs Shift+Enter) */
  sendOnEnter: boolean;
}

const DEFAULTS: UserSettings = {
  model:                     "gpt-4o-mini",
  responseStyle:             "detailed",
  locale:                    "en",
  codeTheme:                 "github-dark",
  showContextPanelByDefault: true,
  autoScroll:                true,
  showQuickReplies:          true,
  showRelatedConcepts:       true,
  voiceInputEnabled:         true,
  sendOnEnter:               true,
};

/* ─── API ────────────────────────────────────────────────────────────────── */

export function getSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<UserSettings>) };
  } catch { return { ...DEFAULTS }; }
}

export function saveSettings(partial: Partial<UserSettings>): UserSettings {
  const current = getSettings();
  const updated = { ...current, ...partial };
  try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch { /* quota */ }
  return updated;
}

export function resetSettings(): UserSettings {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return { ...DEFAULTS };
}

export { DEFAULTS as SETTING_DEFAULTS };
