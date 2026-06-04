/**
 * flashcards — spaced-repetition flashcard system (simplified SM-2).
 *
 * Cards are stored in localStorage. Review grades: Hard (0), Good (1), Easy (2).
 * Each review updates the interval and ease factor, scheduling the next review.
 */

const KEY = "tutor:flashcards";
const MAX_CARDS = 500;

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface Flashcard {
  id: string;
  front: string;          // Question / prompt shown face-up
  back: string;           // Answer / explanation (markdown)
  conceptId?: string;
  conceptLabel?: string;
  createdAt: string;
  // SM-2 fields
  dueDate: string;        // ISO — when to review next
  interval: number;       // days until next review (starts at 1)
  repetitions: number;    // # successful reviews
  easeFactor: number;     // 2.5 default; min 1.3
  lastReviewed?: string;
}

export type ReviewGrade = 0 | 1 | 2; // Hard | Good | Easy

/* ─── Storage ────────────────────────────────────────────────────────────── */

function read(): Flashcard[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Flashcard[]) : [];
  } catch { return []; }
}

function write(cards: Flashcard[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cards.slice(0, MAX_CARDS)));
  } catch { /* quota */ }
}

/* ─── SM-2 scheduling ────────────────────────────────────────────────────── */

function addDays(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function scheduleNext(card: Flashcard, grade: ReviewGrade): Flashcard {
  let { interval, repetitions, easeFactor } = card;
  const now = new Date().toISOString();

  if (grade === 0) {
    // Hard: reset
    interval = 1;
    repetitions = 0;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);

    repetitions += 1;
    // Ease factor update (SM-2 formula)
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (2 - grade) * (0.08 + (2 - grade) * 0.02));
  }

  return {
    ...card,
    interval,
    repetitions,
    easeFactor,
    lastReviewed: now,
    dueDate: addDays(now, interval),
  };
}

/* ─── Public API ─────────────────────────────────────────────────────────── */

export function listCards(): Flashcard[] {
  return read().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function dueCards(): Flashcard[] {
  const today = new Date().toISOString().slice(0, 10);
  return read()
    .filter((c) => c.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function dueCount(): number {
  return dueCards().length;
}

export function addCard(data: Omit<Flashcard, "id" | "createdAt" | "dueDate" | "interval" | "repetitions" | "easeFactor">): Flashcard {
  const card: Flashcard = {
    ...data,
    id: `fc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    dueDate: new Date().toISOString().slice(0, 10), // due immediately
    interval: 1,
    repetitions: 0,
    easeFactor: 2.5,
  };
  const existing = read();
  write([card, ...existing]);
  return card;
}

export function reviewCard(id: string, grade: ReviewGrade): void {
  const cards = read();
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) return;
  cards[idx] = scheduleNext(cards[idx], grade);
  write(cards);
}

export function updateCard(id: string, patch: Partial<Pick<Flashcard, "front" | "back">>): void {
  const cards = read();
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) return;
  cards[idx] = { ...cards[idx], ...patch };
  write(cards);
}

export function deleteCard(id: string): void {
  write(read().filter((c) => c.id !== id));
}

export function clearAllCards(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
