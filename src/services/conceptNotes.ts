/**
 * conceptNotes — per-concept markdown notes stored in localStorage.
 *
 * Notes are keyed by concept ID (or "general" for context-free sessions).
 * Each entry stores plain markdown text.
 */

const PREFIX = "tutor:note:";
const INDEX_KEY = "tutor:notes:index";

/* ─── Index management ──────────────────────────────────────────────────── */

function readIndex(): Set<string> {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function writeIndex(ids: Set<string>): void {
  try { localStorage.setItem(INDEX_KEY, JSON.stringify([...ids])); } catch { /* quota */ }
}

/* ─── Public API ─────────────────────────────────────────────────────────── */

export function getNote(conceptId: string = "general"): string {
  try { return localStorage.getItem(PREFIX + conceptId) ?? ""; } catch { return ""; }
}

export function hasNote(conceptId: string = "general"): boolean {
  return getNote(conceptId).trim().length > 0;
}

export function saveNote(conceptId: string = "general", content: string): void {
  try {
    const idx = readIndex();
    if (content.trim()) {
      localStorage.setItem(PREFIX + conceptId, content);
      idx.add(conceptId);
    } else {
      localStorage.removeItem(PREFIX + conceptId);
      idx.delete(conceptId);
    }
    writeIndex(idx);
  } catch { /* quota */ }
}

/** All concept IDs that have at least one non-empty note. */
export function listNoteIds(): string[] {
  return [...readIndex()];
}

export function deleteNote(conceptId: string): void {
  try { localStorage.removeItem(PREFIX + conceptId); } catch { /* ignore */ }
  const idx = readIndex();
  idx.delete(conceptId);
  writeIndex(idx);
}

export function clearAllNotes(): void {
  for (const id of readIndex()) {
    try { localStorage.removeItem(PREFIX + id); } catch { /* ignore */ }
  }
  try { localStorage.removeItem(INDEX_KEY); } catch { /* ignore */ }
}
