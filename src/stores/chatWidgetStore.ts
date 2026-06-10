/**
 * chatWidgetStore — global state for the floating AI Tutor chat widget.
 *
 * The widget is available on every page (rendered once in MainLayout). It
 * tracks open/close, an optional pre-loaded concept context, and a "pending
 * message" so other pages can send a message to the widget programmatically
 * (e.g. "Ask AI about this" from a topic page).
 */
import { create } from "zustand";
import type { TutorContext } from "@/services/tutorApi";

interface ChatWidgetState {
  isOpen: boolean;
  /** When set, the widget uses this context for its AI conversation */
  context: Partial<TutorContext> | null;
  /** A message queued to be sent the next time the widget renders */
  pendingMessage: string | null;

  open: (context?: Partial<TutorContext>) => void;
  close: () => void;
  toggle: () => void;
  setContext: (ctx: Partial<TutorContext> | null) => void;
  setPendingMessage: (msg: string | null) => void;
}

export const useChatWidgetStore = create<ChatWidgetState>((set) => ({
  isOpen:         false,
  context:        null,
  pendingMessage: null,

  open:   (context) => set({ isOpen: true, context: context ?? null }),
  close:  ()        => set({ isOpen: false }),
  toggle: ()        => set((s) => ({ isOpen: !s.isOpen })),
  setContext:        (ctx) => set({ context: ctx }),
  setPendingMessage: (msg) => set({ pendingMessage: msg }),
}));

/** Convenience — open the widget pre-loaded with a concept and optional first message */
export function openChatWithConcept(context: Partial<TutorContext>, message?: string) {
  useChatWidgetStore.getState().open(context);
  if (message) useChatWidgetStore.getState().setPendingMessage(message);
}

/** Convenience — open the floating widget with no preset context (generic chat).
 *  Used by the universal "Ask AI / open tutor" buttons scattered across the app. */
export function openChat(message?: string) {
  useChatWidgetStore.getState().open();
  if (message) useChatWidgetStore.getState().setPendingMessage(message);
}
