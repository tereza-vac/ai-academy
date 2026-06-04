/**
 * TutorPage — AI-powered tutor chat page.
 *
 * Features:
 * - Full-height chat layout occupying the available content area
 * - Streaming responses from the `ai-tutor` edge function
 * - Context panel showing current AI Map concept (if navigated from /map)
 * - Quick-prompt chips for common questions
 * - Topic selector for targeted learning sessions
 * - Session reset and in-flight cancellation
 *
 * URL: /tutor
 * Query params:
 *   ?conceptId=transformer   — pre-load AI Map concept context
 *   ?domain=LLMs             — pre-load domain filter
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Bookmark,
  Brain,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  GraduationCap,
  HelpCircle,
  History,
  MessageSquare,
  Network,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocaleStore, selectLocale } from "@/stores/localeStore";
import {
  getNode,
  DOMAINS,
  pickLocaleText,
} from "@/lib/aiMapData";
import { TUTOR_MODELS, type TutorModelId } from "@/services/tutorApi";
import type { TutorContext } from "@/services/tutorApi";
import { useTutorChat } from "@/hooks/useTutorChat";
import type { TutorMessage } from "@/services/tutorApi";
import type { ConversationMeta } from "@/services/conversationHistory";
import { loadConversation } from "@/services/conversationHistory";
import { listPins } from "@/services/pinnedMessages";
import { TutorMessageList } from "@/components/tutor/TutorMessageList";
import { TutorInput, type ResponseStyle } from "@/components/tutor/TutorInput";
import { TutorContextPanel } from "@/components/tutor/TutorContextPanel";
import { TutorSessionHeader } from "@/components/tutor/TutorSessionHeader";
import { ConversationHistorySidebar } from "@/components/tutor/ConversationHistorySidebar";
import { PinnedMessagesPanel } from "@/components/tutor/PinnedMessagesPanel";
import { FlashcardReviewModal } from "@/components/tutor/FlashcardReviewModal";
import { KeyboardShortcutsHelp } from "@/components/tutor/KeyboardShortcutsHelp";
import { NotesPanel } from "@/components/tutor/NotesPanel";
import { hasNote } from "@/services/conceptNotes";
import { triggerAchievementCheck } from "@/lib/achievementBus";
import { dueCount } from "@/services/flashcards";

/* ─── Copy ───────────────────────────────────────────────────────────────── */

const COPY = {
  pageTitle: { cs: "AI Tutor", en: "AI Tutor" },
  pageDescription: {
    cs: "Tvůj osobní AI průvodce. Ptej se na cokoliv z oblasti AI — od základů po nejnovější výzkum.",
    en: "Your personal AI guide. Ask anything about AI — from the foundations to the latest research.",
  },
  topicSelectorLabel: { cs: "Studuju právě:", en: "Currently studying:" },
  topicSelectorPlaceholder: { cs: "Vybrat téma z AI Mapy…", en: "Pick a topic from the AI Map…" },
  noTopic: { cs: "Bez kontextu", en: "No specific topic" },
  helpTitle: { cs: "Na co se tě zeptat?", en: "What can I help with?" },
  helpItems: {
    cs: [
      "Vysvětli mi, jak funguje Transformer architektura krok za krokem",
      "Jaký je rozdíl mezi RAG a fine-tuningem? Kdy použít co?",
      "Napiš mi Python kód pro jednoduchý RAG pipeline s pgvector",
      "Jak funguje RLHF a proč se používá pro trénování LLM?",
      "Vysvětli mi scaling laws — proč větší modely fungují lépe?",
      "Co je attention mechanism a proč je lepší než LSTM?",
    ],
    en: [
      "Explain how the Transformer architecture works step by step",
      "What's the difference between RAG and fine-tuning? When to use which?",
      "Write me Python code for a simple RAG pipeline using pgvector",
      "How does RLHF work and why is it used for LLM training?",
      "Explain scaling laws — why do larger models perform better?",
      "What is the attention mechanism and why is it better than LSTMs?",
    ],
  },
  notebookTitle: { cs: "Notebook AI Mód", en: "Notebook AI Mode" },
  notebookDesc: {
    cs: "Otevři libovolný uzel v AI Mapě a klikni na 'Zeptat se tutora' — tutor si automaticky načte kontext.",
    en: "Open any node in the AI Map and click 'Ask tutor' — the tutor will automatically load the context.",
  },
};
const t = (key: keyof typeof COPY, locale: "cs" | "en") => {
  const val = COPY[key];
  if (typeof val === "object" && !Array.isArray(val)) {
    return (val as Record<string, string>)[locale] ?? (val as Record<string, string>)["en"];
  }
  return String(val);
};
const tArr = (key: "helpItems", locale: "cs" | "en") =>
  (COPY[key] as { cs: string[]; en: string[] })[locale] ?? COPY[key]["en"];

/* ─── Export helper ───────────────────────────────────────────────────────── */

function exportAsMarkdown(messages: TutorMessage[], conceptLabel?: string): void {
  const date = new Date().toISOString().slice(0, 10);
  const title = conceptLabel ? `AI Tutor — ${conceptLabel} (${date})` : `AI Tutor session (${date})`;
  const lines = [
    `# ${title}`,
    "",
    ...messages.map((m) => {
      const role = m.role === "user" ? "**You**" : "**AI Tutor**";
      return `${role}\n\n${m.content}\n\n---`;
    }),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tutor-${date}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Model Selector ─────────────────────────────────────────────────────── */

interface ModelSelectorProps {
  value: TutorModelId;
  onChange: (id: TutorModelId) => void;
}

function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const current = TUTOR_MODELS.find((m) => m.id === value) ?? TUTOR_MODELS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption-xs transition-colors",
          "border-border-subtle bg-surface-base text-content-secondary",
          "hover:border-border-strong hover:text-content-primary",
          "outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
        )}
      >
        <Zap className="h-3 w-3 shrink-0" />
        {current.label}
        {open ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-xl border border-border-subtle bg-surface-elevated shadow-elevation-lg overflow-hidden">
            <div className="p-1.5 space-y-0.5">
              {TUTOR_MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { onChange(m.id as TutorModelId); setOpen(false); }}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-hover",
                    value === m.id && "bg-surface-hover",
                  )}
                >
                  <div className="text-body-sm font-medium text-content-primary">{m.label}</div>
                  <div className="text-caption-xs text-content-tertiary">{m.description}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Topic Selector ─────────────────────────────────────────────────────── */

interface TopicSelectorProps {
  value: string | undefined;
  onChange: (conceptId: string | undefined) => void;
  locale: "cs" | "en";
}

function TopicSelector({ value, onChange, locale }: TopicSelectorProps) {
  const [open, setOpen] = useState(false);

  const domains = DOMAINS;
  const selected = value ? getNode(value) : null;
  const label = selected
    ? pickLocaleText(selected.label, locale)
    : t("noTopic", locale);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption-xs transition-colors",
          "outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
          value
            ? "border-primary/30 bg-primary/5 text-primary font-medium"
            : "border-border-subtle bg-surface-base text-content-secondary hover:border-border-strong hover:text-content-primary",
        )}
      >
        {value ? <Network className="h-3 w-3 shrink-0" /> : <BookOpen className="h-3 w-3 shrink-0" />}
        {label}
        <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border-subtle bg-surface-elevated shadow-elevation-lg overflow-hidden">
            <div className="p-1.5">
              <button
                type="button"
                onClick={() => { onChange(undefined); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-body-sm text-left transition-colors",
                  "hover:bg-surface-hover",
                  !value && "bg-surface-hover font-medium",
                )}
              >
                {t("noTopic", locale)}
              </button>
            </div>
            <div className="h-px bg-border-subtle" />
            <div className="max-h-64 overflow-y-auto p-1.5">
              {domains.map((domain) => (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => { onChange(domain.id); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-body-sm text-left transition-colors",
                    "hover:bg-surface-hover",
                    value === domain.id && "bg-surface-hover font-medium text-content-primary",
                  )}
                >
                  <span className="truncate">{pickLocaleText(domain.label, locale)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Empty-state welcome screen ─────────────────────────────────────────── */

interface WelcomeScreenProps {
  locale: "cs" | "en";
  onPrompt: (text: string) => void;
  conceptLabel?: string;
  conceptSummary?: string;
}

/** Generate topic-aware starter prompts when a concept is active */
function buildConceptPrompts(label: string, locale: "cs" | "en"): string[] {
  if (locale === "cs") {
    return [
      `Vysvětli mi ${label} od začátku — jako bych to nikdy neslyšel`,
      `Jak funguje ${label} technicky? Jdi do hloubky`,
      `Napiš mi funkční Python ukázku pro ${label}`,
      `Jaké jsou nejčastější chyby a mylné představy o ${label}?`,
      `Jak se ${label} liší od nejbližších alternativ?`,
    ];
  }
  return [
    `Explain ${label} from scratch — as if I've never heard of it`,
    `How does ${label} work technically? Go deep`,
    `Write me a working Python example for ${label}`,
    `What are the most common mistakes and misconceptions about ${label}?`,
    `How does ${label} differ from the closest alternatives?`,
  ];
}

function WelcomeScreen({ locale, onPrompt, conceptLabel, conceptSummary }: WelcomeScreenProps) {
  const genericPrompts = tArr("helpItems", locale);
  const conceptPrompts = conceptLabel ? buildConceptPrompts(conceptLabel, locale) : null;
  const prompts = conceptPrompts ?? genericPrompts;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-lg text-center space-y-4">
        {/* Hero */}
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Brain className="h-8 w-8 text-primary" />
          </div>
        </div>

        {conceptLabel ? (
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
              <Network className="h-3 w-3 text-primary" />
              <span className="text-caption-xs text-primary font-medium">{conceptLabel}</span>
            </div>
            <h2 className="text-heading-md font-semibold text-content-primary">
              {locale === "cs" ? "Na co se chceš zeptat?" : "What do you want to know?"}
            </h2>
            {conceptSummary && (
              <p className="text-body-sm text-content-secondary leading-relaxed line-clamp-3">
                {conceptSummary}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-heading-md font-semibold text-content-primary">
              {t("pageTitle", locale)}
            </h2>
            <p className="text-body-md text-content-secondary">
              {t("pageDescription", locale)}
            </p>
          </div>
        )}

        {/* Quick-start prompts */}
        <div className="space-y-2">
          <p className="text-caption-xs uppercase tracking-wide text-content-tertiary font-medium">
            {t("helpTitle", locale)}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {prompts.slice(0, 5).map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onPrompt(prompt)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-elevated",
                  "px-4 py-3 text-left text-body-sm text-content-secondary",
                  "transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-content-primary",
                  "outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
                )}
              >
                <Sparkles className="h-4 w-4 shrink-0 text-primary opacity-60" />
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Notebook AI tip */}
        {!conceptLabel && (
          <Card variant="soft" className="text-left">
            <div className="flex items-start gap-3 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-elevated">
                <MessageSquare className="h-4 w-4 text-content-secondary" />
              </div>
              <div>
                <p className="text-body-sm font-semibold text-content-primary">{t("notebookTitle", locale)}</p>
                <p className="mt-0.5 text-caption-xs text-content-tertiary">{t("notebookDesc", locale)}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export function Component() {
  const locale = useLocaleStore(selectLocale) as "cs" | "en";
  const [searchParams, setSearchParams] = useSearchParams();

  const urlConceptId = searchParams.get("conceptId") ?? undefined;
  const urlDomain = searchParams.get("domain") ?? undefined;
  const urlResume = searchParams.get("resume") ?? undefined;
  const urlMode = searchParams.get("mode") as "quiz" | "feynman" | null;

  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [pinsCount, setPinsCount] = useState(() => listPins().length);
  const [showFlashcardReview, setShowFlashcardReview] = useState(false);
  const [flashcardsDue, setFlashcardsDue] = useState(() => dueCount());
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>("detailed");
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notesHasContent, setNotesHasContent] = useState(() => hasNote(urlConceptId ?? "general"));
  const [model, setModel] = useState<TutorModelId>("gpt-4o-mini");
  const [resumeConversationId, setResumeConversationId] = useState<string | undefined>(urlResume);
  // When resuming, we may need to patch conceptId from historical metadata
  const [resumedMeta, setResumedMeta] = useState<Pick<ConversationMeta, "conceptId" | "conceptLabel" | "domain"> | null>(null);

  const [localConceptId, setLocalConceptId] = useState<string | undefined>(urlConceptId);

  const handleConceptMention = useCallback((node: import("@/lib/aiMapData").ConceptNode) => {
    setLocalConceptId(node.id);
  }, []);

  const activeConceptId = resumedMeta?.conceptId ?? urlConceptId ?? localConceptId;
  const conceptNode = activeConceptId ? getNode(activeConceptId) : null;

  const context: TutorContext = {
    conceptId: activeConceptId,
    conceptLabel: conceptNode ? pickLocaleText(conceptNode.label, locale) : (resumedMeta?.conceptLabel ?? undefined),
    conceptSummary: conceptNode ? pickLocaleText(conceptNode.parable, locale) : undefined,
    domain: conceptNode?.domain ?? resumedMeta?.domain ?? urlDomain,
    locale,
  };

  const {
    messages,
    streamingText,
    isStreaming,
    isError,
    errorMessage,
    conversationId,
    sendMessage,
    regenerate,
    resetSession,
    cancelStream,
  } = useTutorChat({ context, model, resumeConversationId });

  const handleSelectHistory = useCallback((conv: ConversationMeta) => {
    const loaded = loadConversation(conv.id);
    if (loaded.length === 0) return;
    setResumeConversationId(conv.id);
    setResumedMeta({ conceptId: conv.conceptId, conceptLabel: conv.conceptLabel, domain: conv.domain });
    setShowHistory(false);
  }, []);

  const handleNewChat = useCallback(() => {
    setResumeConversationId(undefined);
    setResumedMeta(null);
    resetSession();
  }, [resetSession]);

  const handleSummary = useCallback(() => {
    sendMessage(
      locale === "cs"
        ? "Shrň hlavní koncepty a poznatky z naší konverzace — strukturovaně s odrážkami pro každé téma."
        : "Summarize the key concepts and insights from our conversation — with bullet points for each major topic covered, and one actionable takeaway.",
    );
  }, [sendMessage, locale]);

  const [feynmanMode, setFeynmanMode] = useState(false);
  const [quizMode, setQuizMode] = useState(false);

  const handleQuiz = useCallback(() => {
    triggerAchievementCheck({ usedQuiz: true });
    const conceptLabel = context.conceptLabel;
    const topic = conceptLabel ? `"${conceptLabel}"` : "the topics we've been discussing";
    setQuizMode(true);
    sendMessage(
      locale === "cs"
        ? `Spusť interaktivní kvíz o tématu ${topic}. Postupuj takto:
1. Polož mi jednu otázku (mix: faktická, aplikační a analytická otázka).
2. Počkej na mou odpověď.
3. Ohodnoť mou odpověď, vysvětli správnou odpověď.
4. Pokračuj na další otázku (celkem 5 otázek).
5. Na konci mi dej celkové hodnocení a shrnutí.
Začni hned první otázkou — pouze otázka, bez dalšího textu.`
        : `Start an interactive quiz on the topic ${topic}. Follow this structure:
1. Ask me one question at a time (mix of factual, applied, and analytical questions).
2. Wait for my answer.
3. Evaluate my answer, explain the correct answer if needed.
4. Move to the next question (5 questions total).
5. At the end, give me a final score and summary.
Start immediately with Question 1 — only the question, no preamble.`,
    );
  }, [sendMessage, locale, context.conceptLabel]);

  const handleFeynman = useCallback(() => {
    triggerAchievementCheck({ usedFeynman: true });
    const conceptLabel = context.conceptLabel;
    const topic = conceptLabel ? `"${conceptLabel}"` : "the topic we've been discussing";
    setFeynmanMode(true);
    sendMessage(
      locale === "cs"
        ? `Buď teď učitel. Požádej mě, abych vysvětlil ${topic} vlastními slovy, jako bych to vysvětloval někomu, kdo o tom nic neví. Poté co odpovím, dej mi strukturovanou zpětnou vazbu: co jsem pochopil správně, co mi chybí, a případné opravy. Začni otázkou.`
        : `Switch to Feynman teacher mode. Ask me to explain ${topic} in my own words, as if teaching it to someone who has never heard of it. Once I respond, give me structured feedback: what I got right, what I missed, and any corrections needed. Start with just the question.`,
    );
  }, [sendMessage, locale, context.conceptLabel]);

  const hasMessages = messages.length > 1 || isStreaming;

  useEffect(() => {
    if (urlConceptId) setShowContextPanel(true);
  }, [urlConceptId]);

  // Auto-trigger quiz or feynman mode from URL param (fired once after mount)
  const urlModeTriggeredRef = useRef(false);
  useEffect(() => {
    if (urlModeTriggeredRef.current || !urlMode) return;
    if (isStreaming) return;
    urlModeTriggeredRef.current = true;
    const timer = setTimeout(() => {
      if (urlMode === "quiz") handleQuiz();
      else if (urlMode === "feynman") handleFeynman();
    }, 800);
    return () => clearTimeout(timer);
  }, [urlMode, isStreaming, handleQuiz, handleFeynman]);

  useEffect(() => {
    setNotesHasContent(hasNote(activeConceptId ?? "general"));
  }, [activeConceptId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "?") { e.preventDefault(); setShowShortcutsHelp((v) => !v); }
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setShowNotes((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleTopicChange = useCallback(
    (id: string | undefined) => {
      setLocalConceptId(id);
      if (urlConceptId) {
        const params = new URLSearchParams(searchParams);
        if (id) { params.set("conceptId", id); }
        else { params.delete("conceptId"); params.delete("domain"); }
        setSearchParams(params, { replace: true });
      }
    },
    [urlConceptId, searchParams, setSearchParams],
  );

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col gap-0 -mx-6 -my-8">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-border-subtle bg-surface-base px-6 py-3 shrink-0">
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          <span className="text-caption-xs text-content-tertiary shrink-0">
            {t("topicSelectorLabel", locale)}
          </span>
          <TopicSelector value={activeConceptId} onChange={handleTopicChange} locale={locale} />

          {context.conceptLabel && (
            <button
              type="button"
              onClick={handleQuiz}
              disabled={isStreaming}
              title={locale === "cs" ? "Spustit interaktivní kvíz (5 otázek)" : "Start interactive quiz (5 questions)"}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-caption-xs transition-colors",
                quizMode
                  ? "border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                  : "border-border-subtle text-content-secondary hover:border-amber-400/40 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 hover:text-amber-700 dark:hover:text-amber-400",
                "disabled:opacity-40 disabled:pointer-events-none",
                "outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
              )}
            >
              <HelpCircle className="h-3 w-3" />
              {locale === "cs" ? "Kvíz" : "Quiz me"}
            </button>
          )}

          {/* Session summary */}
          {hasMessages && (
            <button
              type="button"
              onClick={handleSummary}
              disabled={isStreaming}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border border-border-subtle px-2.5 py-1 text-caption-xs transition-colors",
                "text-content-secondary hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
                "disabled:opacity-40 disabled:pointer-events-none",
                "outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
              )}
            >
              <BookOpen className="h-3 w-3" />
              {locale === "cs" ? "Shrnutí" : "Summarize"}
            </button>
          )}

          {/* Feynman test mode */}
          <button
            type="button"
            onClick={handleFeynman}
            disabled={isStreaming}
            title={locale === "cs" ? "Feynmanova metoda: vysvětli mi to" : "Feynman mode: explain it back to me"}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-caption-xs transition-colors",
              feynmanMode
                ? "border-violet-400/50 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400"
                : "border-border-subtle text-content-secondary hover:border-violet-400/40 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 hover:text-violet-700 dark:hover:text-violet-400",
              "disabled:opacity-40 disabled:pointer-events-none",
              "outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
            )}
          >
            <Brain className="h-3 w-3" />
            {locale === "cs" ? "Feynman" : "Test me"}
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Model selector */}
          <ModelSelector value={model} onChange={setModel} />

          {/* Export */}
          {hasMessages && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => exportAsMarkdown(messages, context.conceptLabel)}
              title={locale === "cs" ? "Stáhnout jako Markdown" : "Export as Markdown"}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* History sidebar toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowHistory((v) => !v)}
            title={showHistory ? "Hide history" : "Show history"}
            className={cn(showHistory && "bg-surface-hover")}
          >
            <History className="h-3.5 w-3.5" />
          </Button>

          {/* Flashcard review */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => { setShowFlashcardReview(true); setFlashcardsDue(dueCount()); }}
              title={locale === "cs" ? "Opakovat kartičky" : "Review flashcards"}
            >
              <GraduationCap className="h-3.5 w-3.5" />
            </Button>
            {flashcardsDue > 0 && (
              <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[9px] text-white font-bold">
                {flashcardsDue > 9 ? "9+" : flashcardsDue}
              </span>
            )}
          </div>

          {/* Saved pins */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => { setShowPins(true); setPinsCount(listPins().length); }}
              title={locale === "cs" ? "Uložené poznámky" : "Saved notes"}
            >
              <Bookmark className="h-3.5 w-3.5" />
            </Button>
            {pinsCount > 0 && (
              <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground font-bold">
                {pinsCount > 9 ? "9+" : pinsCount}
              </span>
            )}
          </div>

          {/* Context panel toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowContextPanel((v) => !v)}
            title={showContextPanel ? "Hide context" : "Show context"}
            className={cn(showContextPanel && "bg-surface-hover")}
          >
            <Network className="h-3.5 w-3.5" />
          </Button>

          {/* Notes panel toggle */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowNotes((v) => !v)}
              title={locale === "cs" ? "Poznámky" : "Notes"}
              className={cn(showNotes && "bg-surface-hover")}
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
            {notesHasContent && !showNotes && (
              <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400 ring-1 ring-background" />
            )}
          </div>

          {/* Keyboard shortcuts help */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowShortcutsHelp(true)}
            title={locale === "cs" ? "Klávesové zkratky (?)" : "Keyboard shortcuts (?)"}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* History sidebar */}
        {showHistory && (
          <div className="hidden w-64 shrink-0 border-r border-border-subtle bg-surface-base lg:flex lg:flex-col overflow-hidden">
            <ConversationHistorySidebar
              activeId={conversationId}
              onSelect={handleSelectHistory}
              onNew={handleNewChat}
              locale={locale}
            />
          </div>
        )}

        {/* Chat column */}
        <div className="flex flex-1 flex-col min-w-0">
          <TutorSessionHeader
            context={context.conceptId ? context : undefined}
            onReset={handleNewChat}
            onToggleContext={() => setShowContextPanel((v) => !v)}
            showContextPanel={showContextPanel}
          />

          {/* Messages / Welcome */}
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            {!hasMessages ? (
              <WelcomeScreen
                locale={locale}
                onPrompt={sendMessage}
                conceptLabel={context.conceptLabel}
                conceptSummary={context.conceptSummary}
              />
            ) : (
              <TutorMessageList
                messages={messages}
                streamingText={streamingText}
                isStreaming={isStreaming}
                isError={isError}
                errorMessage={errorMessage}
                onRegenerate={regenerate}
                activeConceptId={context.conceptId}
                conversationId={conversationId}
                conceptLabel={context.conceptLabel}
                locale={locale}
              />
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-border-subtle bg-surface-base px-6 py-4">
            <TutorInput
              onSend={sendMessage}
              onCancel={cancelStream}
              isStreaming={isStreaming}
              locale={locale}
              responseStyle={responseStyle}
              onResponseStyleChange={setResponseStyle}
              onConceptMention={handleConceptMention}
              quickPrompts={
                context.conceptLabel
                  ? buildConceptPrompts(context.conceptLabel, locale)
                  : undefined
              }
            />
          </div>
        </div>

        {/* Notes panel */}
        {showNotes && (
          <div className="hidden lg:flex">
            <NotesPanel
              conceptId={activeConceptId ?? "general"}
              conceptLabel={context.conceptLabel}
              locale={locale as "cs" | "en"}
              onAskAboutNotes={(prompt) => {
                sendMessage(prompt);
                setShowNotes(false);
              }}
              onClose={() => {
                setShowNotes(false);
                const nowHasNote = hasNote(activeConceptId ?? "general");
                setNotesHasContent(nowHasNote);
                if (nowHasNote) triggerAchievementCheck();
              }}
            />
          </div>
        )}

        {/* Context panel */}
        {showContextPanel && (
          <div className="hidden w-72 shrink-0 border-l border-border-subtle bg-surface-base p-4 lg:flex lg:flex-col">
            <TutorContextPanel context={context} onClose={() => setShowContextPanel(false)} />
          </div>
        )}
      </div>

      {/* Pins modal */}
      {showPins && (
        <PinnedMessagesPanel
          locale={locale}
          onClose={() => { setShowPins(false); setPinsCount(listPins().length); }}
        />
      )}

      {/* Flashcard review modal */}
      {showFlashcardReview && (
        <FlashcardReviewModal
          locale={locale}
          onClose={() => {
            setShowFlashcardReview(false);
            setFlashcardsDue(dueCount());
            triggerAchievementCheck();
          }}
        />
      )}

      {/* Keyboard shortcuts help */}
      {showShortcutsHelp && (
        <KeyboardShortcutsHelp
          locale={locale as "cs" | "en"}
          onClose={() => setShowShortcutsHelp(false)}
        />
      )}
    </div>
  );
}

export default Component;
