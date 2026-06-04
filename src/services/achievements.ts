/**
 * achievements — track and unlock learning milestones.
 *
 * Achievements are checked against aggregated user stats.
 * Newly unlocked achievements are returned so the caller can notify the user.
 * All earned IDs are persisted in localStorage.
 */

const KEY = "tutor:achievements";

/* ─── Definitions ────────────────────────────────────────────────────────── */

export type AchievementCategory = "learning" | "streak" | "mastery" | "tools";

export interface Achievement {
  id: string;
  emoji: string;
  title: { cs: string; en: string };
  description: { cs: string; en: string };
  category: AchievementCategory;
  /** Returns true when this achievement should be unlocked given the stats */
  check: (s: AchievementStats) => boolean;
}

/** Stats snapshot used to evaluate achievement conditions */
export interface AchievementStats {
  totalMessages: number;       // all-time messages sent
  conceptsStudied: number;     // distinct concepts visited
  conceptsMastered: number;    // mastered (level 3)
  flashcardCount: number;      // total flashcards saved
  flashcardsReviewed: number;  // total cards reviewed at least once
  noteCount: number;           // concepts with notes
  currentStreak: number;       // current daily streak
  longestStreak: number;
  conversationCount: number;
  usedFeynman: boolean;
  usedQuiz: boolean;
  usedVoice: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── Learning milestones ──
  {
    id: "first-message",
    emoji: "💬",
    title: { cs: "První kroky", en: "First Steps" },
    description: { cs: "Odeslal jsi první zprávu AI Tutorovi.", en: "Sent your first message to the AI Tutor." },
    category: "learning",
    check: (s) => s.totalMessages >= 1,
  },
  {
    id: "curious-learner",
    emoji: "🔍",
    title: { cs: "Zvídavý student", en: "Curious Learner" },
    description: { cs: "Odeslal jsi 10 zpráv.", en: "Sent 10 messages to the AI Tutor." },
    category: "learning",
    check: (s) => s.totalMessages >= 10,
  },
  {
    id: "active-learner",
    emoji: "🎯",
    title: { cs: "Aktivní student", en: "Active Learner" },
    description: { cs: "Odeslal jsi 50 zpráv.", en: "Sent 50 messages in total." },
    category: "learning",
    check: (s) => s.totalMessages >= 50,
  },
  {
    id: "deep-diver",
    emoji: "🤿",
    title: { cs: "Hloubkový výzkumník", en: "Deep Diver" },
    description: { cs: "Odeslal jsi 200 zpráv — opravdový vášnivec!", en: "Sent 200 messages — a true AI enthusiast!" },
    category: "learning",
    check: (s) => s.totalMessages >= 200,
  },
  {
    id: "explorer",
    emoji: "🗺️",
    title: { cs: "Průzkumník", en: "Explorer" },
    description: { cs: "Prozkoumal jsi 5 různých konceptů.", en: "Studied 5 different AI concepts." },
    category: "learning",
    check: (s) => s.conceptsStudied >= 5,
  },
  {
    id: "pathfinder",
    emoji: "🌍",
    title: { cs: "Hledač cest", en: "Pathfinder" },
    description: { cs: "Prozkoumal jsi 15 různých konceptů.", en: "Studied 15 different AI concepts." },
    category: "learning",
    check: (s) => s.conceptsStudied >= 15,
  },
  {
    id: "polymath",
    emoji: "🧠",
    title: { cs: "Polymath", en: "Polymath" },
    description: { cs: "Prozkoumal jsi 30 různých konceptů.", en: "Studied 30 different AI concepts." },
    category: "learning",
    check: (s) => s.conceptsStudied >= 30,
  },
  {
    id: "conversationalist",
    emoji: "💡",
    title: { cs: "Konverzátor", en: "Conversationalist" },
    description: { cs: "Vedl jsi 10 konverzací s AI Tutorem.", en: "Completed 10 conversations with the AI Tutor." },
    category: "learning",
    check: (s) => s.conversationCount >= 10,
  },

  // ── Mastery ──
  {
    id: "first-mastery",
    emoji: "⭐",
    title: { cs: "První mistrovství", en: "First Mastery" },
    description: { cs: "Zvládl jsi svůj první koncept na úroveň mistra.", en: "Mastered your first concept." },
    category: "mastery",
    check: (s) => s.conceptsMastered >= 1,
  },
  {
    id: "triple-mastery",
    emoji: "🏆",
    title: { cs: "Trojnásobný mistr", en: "Triple Master" },
    description: { cs: "Zvládl jsi 3 koncepty na úroveň mistra.", en: "Mastered 3 concepts." },
    category: "mastery",
    check: (s) => s.conceptsMastered >= 3,
  },
  {
    id: "scholar",
    emoji: "🎓",
    title: { cs: "Vědec", en: "Scholar" },
    description: { cs: "Zvládl jsi 10 konceptů na úroveň mistra.", en: "Mastered 10 concepts — you're a scholar!" },
    category: "mastery",
    check: (s) => s.conceptsMastered >= 10,
  },

  // ── Streak ──
  {
    id: "three-streak",
    emoji: "🔥",
    title: { cs: "Rozehřátý", en: "Warming Up" },
    description: { cs: "3 dny za sebou!", en: "3 days in a row!" },
    category: "streak",
    check: (s) => s.currentStreak >= 3 || s.longestStreak >= 3,
  },
  {
    id: "week-streak",
    emoji: "⚡",
    title: { cs: "Nezastavitelný", en: "Unstoppable" },
    description: { cs: "7denní série učení — neuvěřitelné!", en: "7-day learning streak — incredible!" },
    category: "streak",
    check: (s) => s.currentStreak >= 7 || s.longestStreak >= 7,
  },
  {
    id: "month-streak",
    emoji: "💎",
    title: { cs: "Diamantový učenec", en: "Diamond Scholar" },
    description: { cs: "30denní série — výjimečné odhodlání!", en: "30-day streak — exceptional dedication!" },
    category: "streak",
    check: (s) => s.currentStreak >= 30 || s.longestStreak >= 30,
  },

  // ── Tools ──
  {
    id: "card-collector",
    emoji: "🃏",
    title: { cs: "Sběratel karet", en: "Card Collector" },
    description: { cs: "Vytvořil jsi svou první kartičku.", en: "Created your first flashcard." },
    category: "tools",
    check: (s) => s.flashcardCount >= 1,
  },
  {
    id: "card-master",
    emoji: "📚",
    title: { cs: "Mistr karet", en: "Card Master" },
    description: { cs: "Máš 10 uložených kartiček.", en: "Saved 10 flashcards." },
    category: "tools",
    check: (s) => s.flashcardCount >= 10,
  },
  {
    id: "note-taker",
    emoji: "📝",
    title: { cs: "Zapisovatel", en: "Note Taker" },
    description: { cs: "Uložil jsi poznámky pro první koncept.", en: "Saved notes for your first concept." },
    category: "tools",
    check: (s) => s.noteCount >= 1,
  },
  {
    id: "feynman-method",
    emoji: "🧪",
    title: { cs: "Feynmanova metoda", en: "Feynman Method" },
    description: { cs: "Použil jsi Feynmanův testovací režim.", en: "Used the Feynman test mode to deepen understanding." },
    category: "tools",
    check: (s) => s.usedFeynman,
  },
  {
    id: "quiz-taker",
    emoji: "❓",
    title: { cs: "Kvizér", en: "Quiz Taker" },
    description: { cs: "Spustil jsi interaktivní kvíz.", en: "Started an interactive quiz session." },
    category: "tools",
    check: (s) => s.usedQuiz,
  },
  {
    id: "voice-learner",
    emoji: "🎤",
    title: { cs: "Hlasový student", en: "Voice Learner" },
    description: { cs: "Použil jsi hlasový vstup.", en: "Used voice input to send a message." },
    category: "tools",
    check: (s) => s.usedVoice,
  },
  {
    id: "reviewer",
    emoji: "🔄",
    title: { cs: "Recenzent", en: "Reviewer" },
    description: { cs: "Přezkoumal jsi 10 kartiček pomocí opakování.", en: "Reviewed 10 flashcards with spaced repetition." },
    category: "tools",
    check: (s) => s.flashcardsReviewed >= 10,
  },
];

/* ─── Storage ────────────────────────────────────────────────────────────── */

function readEarned(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function writeEarned(ids: Set<string>): void {
  try { localStorage.setItem(KEY, JSON.stringify([...ids])); } catch { /* quota */ }
}

/* ─── Public API ─────────────────────────────────────────────────────────── */

export function getEarnedIds(): Set<string> {
  return readEarned();
}

export function getEarned(): Achievement[] {
  const ids = readEarned();
  return ACHIEVEMENTS.filter((a) => ids.has(a.id));
}

/**
 * Check all achievements against the current stats.
 * Returns any **newly** unlocked achievements (not previously earned).
 * Side-effect: saves newly earned IDs to localStorage.
 */
export function checkAchievements(stats: AchievementStats): Achievement[] {
  const earned = readEarned();
  const newlyEarned: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (earned.has(achievement.id)) continue;
    if (achievement.check(stats)) {
      earned.add(achievement.id);
      newlyEarned.push(achievement);
    }
  }

  if (newlyEarned.length > 0) writeEarned(earned);
  return newlyEarned;
}

export function clearAchievements(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
