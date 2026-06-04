/**
 * Conversation history service — persistent across browser sessions (localStorage).
 *
 * Each conversation has:
 *  - A unique ID (used as the storage key for its messages)
 *  - Metadata: concept, domain, timestamps, preview, message count
 *
 * Limits: keeps the 50 most recent conversations and caps message storage at 200
 * messages per conversation to avoid localStorage quota exhaustion.
 */
import type { TutorMessage } from "@/services/tutorApi";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface ConversationMeta {
  id: string;
  conceptId?: string;
  conceptLabel?: string;
  domain?: string;
  createdAt: string;
  updatedAt: string;
  /** First user message, truncated */
  preview: string;
  messageCount: number;
}

/* ─── Storage keys ───────────────────────────────────────────────────────── */

const INDEX_KEY = "tutor:conv-index";
const msgKey = (id: string) => `tutor:conv-${id}`;

const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES = 200;

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function readIndex(): ConversationMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ConversationMeta[]) : [];
  } catch { return []; }
}

function writeIndex(index: ConversationMeta[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch { /* quota — drop silently */ }
}

function readMessages(id: string): TutorMessage[] {
  try {
    const raw = localStorage.getItem(msgKey(id));
    if (!raw) return [];
    return JSON.parse(raw) as TutorMessage[];
  } catch { return []; }
}

function writeMessages(id: string, messages: TutorMessage[]): void {
  try {
    const capped = messages.slice(-MAX_MESSAGES);
    localStorage.setItem(msgKey(id), JSON.stringify(capped));
  } catch { /* quota */ }
}

function extractPreview(messages: TutorMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "";
  return first.content.length > 80
    ? first.content.slice(0, 77) + "…"
    : first.content;
}

/* ─── Public API ─────────────────────────────────────────────────────────── */

export function listConversations(): ConversationMeta[] {
  return readIndex().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function loadConversation(id: string): TutorMessage[] {
  return readMessages(id);
}

/**
 * Upsert a conversation — creates or updates metadata and saves messages.
 * Returns the (possibly unchanged) id.
 */
export function saveConversation(
  id: string,
  messages: TutorMessage[],
  meta: Pick<ConversationMeta, "conceptId" | "conceptLabel" | "domain">,
): string {
  // Ignore saving sessions with no real user messages
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return id;

  const now = new Date().toISOString();
  const preview = extractPreview(messages);

  const index = readIndex();
  const existing = index.findIndex((c) => c.id === id);

  const entry: ConversationMeta = {
    id,
    conceptId: meta.conceptId,
    conceptLabel: meta.conceptLabel,
    domain: meta.domain,
    createdAt: existing >= 0 ? index[existing].createdAt : now,
    updatedAt: now,
    preview,
    messageCount: messages.length,
  };

  if (existing >= 0) {
    index[existing] = entry;
  } else {
    index.unshift(entry);
  }

  // Trim to max
  const trimmed = index.slice(0, MAX_CONVERSATIONS);
  writeIndex(trimmed);
  writeMessages(id, messages);
  return id;
}

export function deleteConversation(id: string): void {
  const index = readIndex().filter((c) => c.id !== id);
  writeIndex(index);
  try { localStorage.removeItem(msgKey(id)); } catch { /* ignore */ }
}

export function clearAllConversations(): void {
  const index = readIndex();
  index.forEach((c) => {
    try { localStorage.removeItem(msgKey(c.id)); } catch { /* ignore */ }
  });
  try { localStorage.removeItem(INDEX_KEY); } catch { /* ignore */ }
}
