/**
 * streak — tracks daily learning activity for motivational streaks.
 *
 * A day counts if the user sends at least one message to the AI Tutor.
 * Timezone: uses local date (YYYY-MM-DD) so midnight resets correctly.
 *
 * Additionally keeps a sparse activity log (YYYY-MM-DD → message count)
 * for the last 90 days, used by the progress dashboard calendar.
 */

const KEY       = "tutor:streak";
const LOG_KEY   = "tutor:streak:log";
const LOG_DAYS  = 90;

export interface StreakData {
  lastActiveDate: string;   // YYYY-MM-DD
  currentStreak: number;    // days in current run
  longestStreak: number;
  totalActiveDays: number;
}

/** Sparse map of ISO date → message count for the past LOG_DAYS days */
export type ActivityLog = Record<string, number>;

const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const addDays = (date: string, n: number): string => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function read(): StreakData | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StreakData) : null;
  } catch { return null; }
}

function write(data: StreakData): void {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* quota */ }
}

/* ─── Activity log ───────────────────────────────────────────────────────── */

function readLog(): ActivityLog {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as ActivityLog) : {};
  } catch { return {}; }
}

function writeLog(log: ActivityLog): void {
  try {
    // Prune entries older than LOG_DAYS
    const cutoff = addDays(today(), -LOG_DAYS);
    const pruned: ActivityLog = {};
    for (const [d, v] of Object.entries(log)) {
      if (d >= cutoff) pruned[d] = v;
    }
    localStorage.setItem(LOG_KEY, JSON.stringify(pruned));
  } catch { /* quota */ }
}

/** Returns the activity log for the past `days` days (default 90). */
export function getActivityLog(days = LOG_DAYS): ActivityLog {
  const log = readLog();
  const cutoff = addDays(today(), -days);
  const result: ActivityLog = {};
  for (const [d, v] of Object.entries(log)) {
    if (d >= cutoff) result[d] = v;
  }
  return result;
}

/**
 * Record that the user was active today. Call once per tutor session/message.
 * Returns the updated streak data.
 */
export function recordActivity(): StreakData {
  const t = today();
  const existing = read();

  if (!existing) {
    const log = readLog();
    log[t] = (log[t] ?? 0) + 1;
    writeLog(log);
    const data: StreakData = {
      lastActiveDate: t,
      currentStreak: 1,
      longestStreak: 1,
      totalActiveDays: 1,
    };
    write(data);
    return data;
  }

  // Increment activity log for today
  const log = readLog();
  log[t] = (log[t] ?? 0) + 1;
  writeLog(log);

  // Same day — no change to streak count, just return
  if (existing.lastActiveDate === t) return existing;

  // Yesterday — continue streak
  const yesterday = addDays(t, -1);
  const isConsecutive = existing.lastActiveDate === yesterday;

  const newStreak = isConsecutive ? existing.currentStreak + 1 : 1;
  const data: StreakData = {
    lastActiveDate: t,
    currentStreak: newStreak,
    longestStreak: Math.max(existing.longestStreak, newStreak),
    totalActiveDays: existing.totalActiveDays + 1,
  };
  write(data);
  return data;
}

export function getStreak(): StreakData | null {
  const data = read();
  if (!data) return null;

  // Decay: if last activity was more than 1 day ago, streak is broken
  const t = today();
  const yesterday = addDays(t, -1);
  if (data.lastActiveDate !== t && data.lastActiveDate !== yesterday) {
    // Streak is broken but we preserve the record — just show currentStreak as 0
    return { ...data, currentStreak: 0 };
  }
  return data;
}

export function clearStreak(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  try { localStorage.removeItem(LOG_KEY); } catch { /* ignore */ }
}
