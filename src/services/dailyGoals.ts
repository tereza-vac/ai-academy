/**
 * dailyGoals — daily learning targets with progress tracking.
 *
 * Goals are checked against live stats each day and reset automatically.
 * The goal config is user-configurable; completion state resets at midnight.
 */

const CONFIG_KEY    = "tutor:goals:config";
const PROGRESS_KEY  = "tutor:goals:progress";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface GoalConfig {
  /** Number of AI messages to send */
  messages: number;
  /** Number of distinct concepts to study */
  concepts: number;
  /** Number of flashcards to review */
  flashcardsReviewed: number;
  /** Whether daily goals are enabled at all */
  enabled: boolean;
}

export interface DayProgress {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  messagesCount: number;
  conceptsStudied: Set<string>;
  flashcardsReviewed: number;
}

/** Serializable version of DayProgress for localStorage */
interface DayProgressRaw {
  date: string;
  messagesCount: number;
  conceptsStudied: string[];
  flashcardsReviewed: number;
}

/* ─── Defaults ───────────────────────────────────────────────────────────── */

const DEFAULT_CONFIG: GoalConfig = {
  messages:           5,
  concepts:           2,
  flashcardsReviewed: 5,
  enabled:            true,
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ─── Config API ─────────────────────────────────────────────────────────── */

export function getGoalConfig(): GoalConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<GoalConfig>) };
  } catch { return { ...DEFAULT_CONFIG }; }
}

export function saveGoalConfig(partial: Partial<GoalConfig>): GoalConfig {
  const next = { ...getGoalConfig(), ...partial };
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(next)); } catch { /* quota */ }
  return next;
}

/* ─── Progress API ───────────────────────────────────────────────────────── */

function readProgress(): DayProgress {
  const today = todayIso();
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { date: today, messagesCount: 0, conceptsStudied: new Set(), flashcardsReviewed: 0 };
    const parsed = JSON.parse(raw) as DayProgressRaw;
    if (parsed.date !== today) {
      // New day — reset
      return { date: today, messagesCount: 0, conceptsStudied: new Set(), flashcardsReviewed: 0 };
    }
    return {
      date:               parsed.date,
      messagesCount:      parsed.messagesCount ?? 0,
      conceptsStudied:    new Set(parsed.conceptsStudied ?? []),
      flashcardsReviewed: parsed.flashcardsReviewed ?? 0,
    };
  } catch {
    return { date: today, messagesCount: 0, conceptsStudied: new Set(), flashcardsReviewed: 0 };
  }
}

function writeProgress(p: DayProgress): void {
  try {
    const raw: DayProgressRaw = {
      date:               p.date,
      messagesCount:      p.messagesCount,
      conceptsStudied:    [...p.conceptsStudied],
      flashcardsReviewed: p.flashcardsReviewed,
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(raw));
  } catch { /* quota */ }
}

export function getTodayProgress(): DayProgress {
  return readProgress();
}

export function recordMessage(conceptId?: string): void {
  const p = readProgress();
  p.messagesCount += 1;
  if (conceptId) p.conceptsStudied.add(conceptId);
  writeProgress(p);
}

export function recordFlashcardReview(): void {
  const p = readProgress();
  p.flashcardsReviewed += 1;
  writeProgress(p);
}

export function recordConceptStudied(conceptId: string): void {
  const p = readProgress();
  p.conceptsStudied.add(conceptId);
  writeProgress(p);
}

/* ─── Computed ───────────────────────────────────────────────────────────── */

export interface GoalStatus {
  label: { cs: string; en: string };
  current: number;
  target: number;
  done: boolean;
  pct: number;
}

export function getGoalStatuses(): GoalStatus[] {
  const config   = getGoalConfig();
  const progress = readProgress();

  return [
    {
      label:   { cs: "Zprávy AI tutorovi", en: "Messages to AI" },
      current: progress.messagesCount,
      target:  config.messages,
      done:    progress.messagesCount >= config.messages,
      pct:     Math.min(100, Math.round((progress.messagesCount / config.messages) * 100)),
    },
    {
      label:   { cs: "Koncepty prozkoumány", en: "Concepts explored" },
      current: progress.conceptsStudied.size,
      target:  config.concepts,
      done:    progress.conceptsStudied.size >= config.concepts,
      pct:     Math.min(100, Math.round((progress.conceptsStudied.size / config.concepts) * 100)),
    },
    {
      label:   { cs: "Kartičky zrevidovány", en: "Flashcards reviewed" },
      current: progress.flashcardsReviewed,
      target:  config.flashcardsReviewed,
      done:    progress.flashcardsReviewed >= config.flashcardsReviewed,
      pct:     Math.min(100, Math.round((progress.flashcardsReviewed / config.flashcardsReviewed) * 100)),
    },
  ];
}

export function allGoalsDone(): boolean {
  return getGoalStatuses().every((g) => g.done);
}
