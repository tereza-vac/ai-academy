/**
 * pinnedMessages — localStorage-backed bookmarks for assistant responses.
 *
 * Each pin stores the raw markdown content of the message, plus metadata
 * about where it came from (conversation, concept). Capped at 200 pins.
 */

const PIN_KEY = "tutor:pins";
const MAX_PINS = 200;

export interface PinnedMessage {
  id: string;
  messageId: string;
  content: string;
  /** First 80 chars of content, for display */
  preview: string;
  conversationId: string;
  conceptId?: string;
  conceptLabel?: string;
  createdAt: string;
}

function read(): PinnedMessage[] {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PinnedMessage[];
  } catch { return []; }
}

function write(pins: PinnedMessage[]): void {
  try {
    localStorage.setItem(PIN_KEY, JSON.stringify(pins.slice(0, MAX_PINS)));
  } catch { /* quota */ }
}

export function listPins(): PinnedMessage[] {
  return read().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function isPinned(messageId: string): boolean {
  return read().some((p) => p.messageId === messageId);
}

export function pinMessage(
  pin: Omit<PinnedMessage, "id" | "preview" | "createdAt">,
): PinnedMessage {
  const entry: PinnedMessage = {
    ...pin,
    id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    preview: pin.content.replace(/[#*`>_~\[\]]/g, "").slice(0, 80).trim() + (pin.content.length > 80 ? "…" : ""),
    createdAt: new Date().toISOString(),
  };
  const existing = read().filter((p) => p.messageId !== pin.messageId);
  write([entry, ...existing]);
  return entry;
}

export function unpinMessage(messageId: string): void {
  write(read().filter((p) => p.messageId !== messageId));
}

export function deletePin(pinId: string): void {
  write(read().filter((p) => p.id !== pinId));
}

export function clearAllPins(): void {
  try { localStorage.removeItem(PIN_KEY); } catch { /* ignore */ }
}
