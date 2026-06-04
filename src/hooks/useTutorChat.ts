/**
 * useTutorChat — streaming chat state management for the AI Tutor.
 *
 * Features:
 * - Streaming assistant responses (word-by-word via microtask batching)
 * - Session-scoped message history with sessionStorage persistence
 * - Abort controller for in-flight cancellation with partial commit
 * - Context injection (current AI Map concept)
 * - Model selection passed through to the edge function
 * - Regenerate: re-send the last user message
 * - Error state with inline retry
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { streamTutorResponse, type TutorContext, type TutorMessage } from "@/services/tutorApi";
import { saveConversation, loadConversation } from "@/services/conversationHistory";
import { recordConceptVisit } from "@/services/learningProgress";
import { recordActivity } from "@/services/streak";
import { getNote } from "@/services/conceptNotes";
import { triggerAchievementCheck } from "@/lib/achievementBus";
import { recordMessage as recordDailyMessage, recordConceptStudied } from "@/services/dailyGoals";

let _msgCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++_msgCounter}`;
}

/** Generate a stable conversation ID for a given concept (session-scoped) */
function makeConvId(conceptId?: string): string {
  const base = conceptId ?? "general";
  return `${base}-${Date.now()}`;
}

/* ─── Session storage (fast volatile layer) ─────────────────────────────── */

function ssKey(convId: string): string { return `tutor-ss:${convId}`; }

function loadSS(convId: string): TutorMessage[] | null {
  try {
    const raw = sessionStorage.getItem(ssKey(convId));
    if (!raw) return null;
    const arr = JSON.parse(raw) as TutorMessage[];
    return Array.isArray(arr) && arr.length > 0 ? arr : null;
  } catch { return null; }
}

function saveSS(convId: string, msgs: TutorMessage[]): void {
  try {
    if (msgs.length <= 1) sessionStorage.removeItem(ssKey(convId));
    else sessionStorage.setItem(ssKey(convId), JSON.stringify(msgs));
  } catch { /* quota */ }
}

/* ─── Welcome defaults ─────────────────────────────────────────────────── */

const DEFAULT_WELCOME = {
  en: "Hi! I'm your AI tutor. Ask me anything about AI, machine learning, or any concept in the AI Map. I'll give you clear, in-depth answers — adapted to your level.",
  cs: "Ahoj! Jsem tvůj AI tutor. Zeptej se mě na cokoliv z oblasti AI, strojového učení nebo jakéhokoliv pojmu v AI Mapě. Dám ti jasné, hluboké odpovědi — přizpůsobené tvé úrovni.",
};

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface UseTutorChatOptions {
  context?: TutorContext;
  /** Initial welcome message (pass "" to suppress) */
  welcomeMessage?: string;
  /** AI model slug; defaults to gpt-4o-mini */
  model?: string;
  /** Load a specific past conversation by ID instead of starting fresh */
  resumeConversationId?: string;
}

export interface UseTutorChatReturn {
  messages: TutorMessage[];
  streamingText: string;
  isStreaming: boolean;
  isError: boolean;
  errorMessage: string | null;
  /** Stable conversation ID for this session (used for history) */
  conversationId: string;
  sendMessage: (text: string) => void;
  regenerate: () => void;
  resetSession: () => void;
  cancelStream: () => void;
}

/* ─── Hook ──────────────────────────────────────────────────────────────── */

export function useTutorChat({
  context,
  welcomeMessage,
  model,
  resumeConversationId,
}: UseTutorChatOptions = {}): UseTutorChatReturn {
  const locale = (context?.locale ?? "en") as "cs" | "en";
  const effectiveWelcome =
    welcomeMessage !== undefined
      ? welcomeMessage
      : DEFAULT_WELCOME[locale] ?? DEFAULT_WELCOME.en;

  const makeWelcome = (): TutorMessage => ({
    id: nextId("welcome"),
    role: "assistant",
    content: effectiveWelcome,
    createdAt: new Date().toISOString(),
  });

  // Stable conversation ID for this mount (persists across re-renders)
  const convIdRef = useRef<string>(
    resumeConversationId ?? makeConvId(context?.conceptId),
  );

  const [messages, setMessages] = useState<TutorMessage[]>(() => {
    // If resuming a past session, load from localStorage
    if (resumeConversationId) {
      const hist = loadConversation(resumeConversationId);
      if (hist.length > 0) return hist;
    }
    // Otherwise try sessionStorage (fast volatile layer)
    const saved = loadSS(convIdRef.current);
    return saved ?? (effectiveWelcome ? [makeWelcome()] : []);
  });

  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const bufRef = useRef("");

  // Keep mutable refs so callbacks never go stale
  const contextRef = useRef(context);
  const modelRef = useRef(model);
  const messagesRef = useRef(messages);

  useEffect(() => { contextRef.current = context; }, [context]);
  useEffect(() => { modelRef.current = model; }, [model]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // When the caller switches to a different past conversation, load it
  const prevResumeRef = useRef(resumeConversationId);
  useEffect(() => {
    if (resumeConversationId && resumeConversationId !== prevResumeRef.current) {
      prevResumeRef.current = resumeConversationId;
      const msgs = loadConversation(resumeConversationId);
      if (msgs.length > 0) {
        abortRef.current?.abort();
        abortRef.current = null;
        bufRef.current = "";
        setStreamingText("");
        setIsStreaming(false);
        setIsError(false);
        setErrorMessage(null);
        convIdRef.current = resumeConversationId;
        setMessages(msgs);
      }
    }
  }, [resumeConversationId]);

  // Dual persistence: sessionStorage (fast) + localStorage (persistent history)
  useEffect(() => {
    const convId = convIdRef.current;
    saveSS(convId, messages);
    const ctx = contextRef.current;
    saveConversation(convId, messages, {
      conceptId: ctx?.conceptId,
      conceptLabel: ctx?.conceptLabel,
      domain: ctx?.domain,
    });
  }, [messages]);

  // Auto-reset when concept changes (unless resuming a specific conversation)
  const prevConceptIdRef = useRef(context?.conceptId);
  useEffect(() => {
    if (!resumeConversationId && context?.conceptId !== prevConceptIdRef.current) {
      prevConceptIdRef.current = context?.conceptId;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      doReset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.conceptId]);

  /* ── Core streaming ──────────────────────────────────────────────────── */

  const doStream = useCallback((history: TutorMessage[]) => {
    setIsStreaming(true);
    setStreamingText("");
    setIsError(false);
    setErrorMessage(null);
    bufRef.current = "";

    const abort = new AbortController();
    abortRef.current = abort;

    let scheduled = false;

    // Inject user notes into context so the AI can reference / build on them
    const noteContent = getNote(contextRef.current?.conceptId ?? "general");
    const contextWithNotes: TutorContext = {
      ...contextRef.current,
      userNotes: noteContent.trim() || undefined,
    };

    streamTutorResponse({
      messages: history,
      context: contextWithNotes,
      model: modelRef.current,
      signal: abort.signal,
      onChunk(chunk) {
        bufRef.current += chunk;
        if (!scheduled) {
          scheduled = true;
          queueMicrotask(() => {
            setStreamingText(bufRef.current);
            scheduled = false;
          });
        }
      },
      onDone() {
        const text = bufRef.current;
        bufRef.current = "";
        setStreamingText("");
        setIsStreaming(false);
        abortRef.current = null;
        if (text.trim()) {
          setMessages((prev) => [
            ...prev,
            { id: nextId("assistant"), role: "assistant", content: text, createdAt: new Date().toISOString() },
          ]);
        }
      },
      onError(err) {
        bufRef.current = "";
        setStreamingText("");
        setIsStreaming(false);
        setIsError(true);
        setErrorMessage(err.message);
        abortRef.current = null;
      },
    });
  }, []); // stable — all mutable state is via refs

  /* ── Public actions ─────────────────────────────────────────────────── */

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: TutorMessage = {
      id: nextId("user"),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    // Use ref for current messages to avoid stale closure
    const history = [...messagesRef.current, userMsg];
    setMessages(history);

    // Track learning progress, daily streak, and daily goals
    recordActivity();
    const activeConceptId = contextRef.current?.conceptId;
    if (activeConceptId) {
      recordConceptVisit(activeConceptId);
      recordConceptStudied(activeConceptId);
    }
    recordDailyMessage(activeConceptId);

    // Fire achievement check asynchronously after state settles
    setTimeout(() => triggerAchievementCheck(), 1500);

    doStream(history);
  }, [isStreaming, doStream]);

  const regenerate = useCallback(() => {
    if (isStreaming) return;
    // Find the last user message and re-submit everything up to (and including) it
    const msgs = messagesRef.current;
    const lastUserIdx = [...msgs].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const cutAt = msgs.length - lastUserIdx; // slice up to and including last user msg
    const history = msgs.slice(0, cutAt);
    // Remove previous assistant response after that user msg
    setMessages(history);
    doStream(history);
  }, [isStreaming, doStream]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const partial = bufRef.current;
    bufRef.current = "";
    setStreamingText("");
    setIsStreaming(false);
    if (partial.trim()) {
      setMessages((prev) => [
        ...prev,
        { id: nextId("assistant"), role: "assistant", content: partial, createdAt: new Date().toISOString() },
      ]);
    }
  }, []);

  function doReset() {
    abortRef.current?.abort();
    abortRef.current = null;
    bufRef.current = "";
    setStreamingText("");
    setIsStreaming(false);
    setIsError(false);
    setErrorMessage(null);
    // Start a fresh conversation ID
    convIdRef.current = makeConvId(contextRef.current?.conceptId);
    sessionStorage.removeItem(ssKey(convIdRef.current));
    const loc = (contextRef.current?.locale ?? "en") as "cs" | "en";
    const w =
      welcomeMessage !== undefined
        ? welcomeMessage
        : DEFAULT_WELCOME[loc] ?? DEFAULT_WELCOME.en;
    setMessages(w ? [{ id: nextId("welcome"), role: "assistant", content: w, createdAt: new Date().toISOString() }] : []);
  }

  const resetSession = useCallback(doReset, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    messages,
    streamingText,
    isStreaming,
    isError,
    errorMessage,
    conversationId: convIdRef.current,
    sendMessage,
    regenerate,
    resetSession,
    cancelStream,
  };
}
