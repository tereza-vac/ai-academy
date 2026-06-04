/**
 * learningProgress — tracks which AI Map concepts the user has studied via
 * the AI Tutor. Stored in localStorage so it persists across sessions.
 *
 * Called from useTutorChat whenever a user message is sent with an active
 * conceptId context.
 */

const KEY = "tutor:progress";

export interface ConceptProgress {
  conceptId: string;
  visitCount: number;
  messageCount: number;
  lastVisited: string; // ISO date
  firstVisited: string;
}

type ProgressMap = Record<string, ConceptProgress>;

function read(): ProgressMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch { return {}; }
}

function write(map: ProgressMap): void {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* quota */ }
}

/** Record that the user sent a message in a concept session. */
export function recordConceptVisit(conceptId: string, messagesAdded = 1): void {
  const map = read();
  const existing = map[conceptId];
  const now = new Date().toISOString();
  map[conceptId] = {
    conceptId,
    visitCount: (existing?.visitCount ?? 0) + 1,
    messageCount: (existing?.messageCount ?? 0) + messagesAdded,
    lastVisited: now,
    firstVisited: existing?.firstVisited ?? now,
  };
  write(map);
}

export function getConceptProgress(conceptId: string): ConceptProgress | null {
  return read()[conceptId] ?? null;
}

export function getAllProgress(): ConceptProgress[] {
  return Object.values(read()).sort(
    (a, b) => new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime(),
  );
}

export function getStudiedConceptIds(): Set<string> {
  return new Set(Object.keys(read()));
}

/** Mastery level 0–3 based on visit + message counts. */
export function masteryLevel(p: ConceptProgress): 0 | 1 | 2 | 3 {
  if (p.messageCount >= 20 || p.visitCount >= 5) return 3;
  if (p.messageCount >= 8 || p.visitCount >= 3) return 2;
  if (p.messageCount >= 2 || p.visitCount >= 1) return 1;
  return 0;
}

export function clearProgress(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
