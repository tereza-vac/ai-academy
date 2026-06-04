/**
 * TutorNotebook — inline, collapsible AI chat widget.
 *
 * Inspired by NotebookLM: drop it anywhere in the app alongside a piece of
 * content (topic body, concept parable, resource text) and the user gets a
 * grounded chat that answers questions specifically about that content.
 *
 * Usage:
 *   <TutorNotebook
 *     title="Transformers"
 *     contextSummary={topic.bodyMd}
 *     domain="Neural Networks"
 *     conceptId="transformer"
 *   />
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Bot,
  ChevronDown,
  Send,
  Sparkles,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTutorChat } from "@/hooks/useTutorChat";
import { TutorMessageContent } from "./TutorMessageContent";

interface TutorNotebookProps {
  /** Concept or topic title — shown in the header */
  title: string;
  /** Short summary or body text used as context for the AI */
  contextSummary?: string;
  /** Domain label for context (e.g. "LLMs", "Neural Networks") */
  domain?: string;
  /** AI Map concept id for deep-link to /tutor */
  conceptId?: string;
  /** Current locale */
  locale?: "cs" | "en";
  /** Extra CSS class on the outer wrapper */
  className?: string;
  /** Start expanded (default: false) */
  defaultOpen?: boolean;
  /** Quick-prompts to show. Defaults to generic AI-tutor starters. */
  starters?: string[];
}

const COPY = {
  openBtn: { cs: "Zeptat se AI tutora", en: "Ask AI Tutor" },
  placeholder: { cs: "Zeptej se na toto téma…", en: "Ask about this topic…" },
  send: { cs: "Odeslat", en: "Send" },
  openFull: { cs: "Otevřít plného tutora", en: "Open full tutor" },
  stop: { cs: "Zastavit", en: "Stop" },
  poweredBy: { cs: "Powered by AI Tutor", en: "Powered by AI Tutor" },
};
const t = (key: keyof typeof COPY, locale: "cs" | "en" = "en") =>
  COPY[key][locale] ?? COPY[key]["en"];

const DEFAULT_STARTERS_EN = [
  "Summarise this in 3 bullet points",
  "What are the key takeaways?",
  "Give me a real-world example",
  "What should I learn next?",
];

const DEFAULT_STARTERS_CS = [
  "Shrň to do 3 bodů",
  "Jaké jsou klíčové poznatky?",
  "Dej mi příklad z praxe",
  "Co bych se měl naučit dál?",
];

export function TutorNotebook({
  title,
  contextSummary,
  domain,
  conceptId,
  locale = "en",
  className,
  defaultOpen = false,
  starters,
}: TutorNotebookProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const context = {
    conceptId: conceptId ?? title.toLowerCase().replace(/\s+/g, "-"),
    conceptLabel: title,
    conceptSummary: contextSummary ? contextSummary.slice(0, 2000) : undefined,
    domain,
    locale,
  };

  const welcomeMsg =
    locale === "cs"
      ? `Ahoj! Jsem tu k tomuto tématu: **${title}**. Na co se chceš zeptat?`
      : `Hi! I'm here to help with **${title}**. What would you like to know?`;

  const { messages, streamingText, isStreaming, isError, sendMessage, cancelStream } =
    useTutorChat({ context, welcomeMessage: welcomeMsg });

  const chips = starters ?? (locale === "cs" ? DEFAULT_STARTERS_CS : DEFAULT_STARTERS_EN);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el && open) el.scrollTop = el.scrollHeight;
  }, [messages.length, streamingText, open]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;
      sendMessage(trimmed);
      setDraft("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    },
    [isStreaming, sendMessage]
  );

  const tutorUrl = conceptId
    ? `/tutor?conceptId=${encodeURIComponent(conceptId)}${domain ? `&domain=${encodeURIComponent(domain)}` : ""}`
    : `/tutor`;

  return (
    <div className={cn("rounded-2xl border border-border-subtle overflow-hidden", className)}>
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
          "hover:bg-surface-hover",
          open ? "bg-surface-elevated border-b border-border-subtle" : "bg-surface-base",
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-content-primary truncate">
              {open ? title : t("openBtn", locale)}
            </p>
            {!open && (
              <p className="text-caption-xs text-content-tertiary">{t("poweredBy", locale)}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {open && (
            <Link
              to={tutorUrl}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-full border border-border-subtle px-2 py-0.5 text-caption-xs text-content-tertiary hover:text-primary hover:border-primary/30 transition-colors"
            >
              {t("openFull", locale)}
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-content-tertiary transition-transform shrink-0",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      {/* Expandable body */}
      {open && (
        <div className="bg-surface-base flex flex-col">
          {/* Quick-prompt chips */}
          <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-2">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={isStreaming}
                onClick={() => send(chip)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-elevated",
                  "px-2.5 py-1 text-caption-xs text-content-secondary transition-colors",
                  "hover:border-primary/30 hover:bg-primary/5 hover:text-content-primary",
                  "disabled:pointer-events-none disabled:opacity-40",
                  "outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
                )}
              >
                <Sparkles className="h-2.5 w-2.5 opacity-60 shrink-0" />
                {chip}
              </button>
            ))}
          </div>

          {/* Message list */}
          <div
            ref={scrollRef}
            className="max-h-72 min-h-[96px] overflow-y-auto px-4 py-2 space-y-2.5 scroll-smooth"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-body-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-surface-elevated border border-border-subtle text-content-secondary rounded-tl-sm",
                  )}
                >
                  {m.role === "assistant" ? (
                    <TutorMessageContent content={m.content} className="text-body-sm" />
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {/* Streaming */}
            {isStreaming && streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border-subtle bg-surface-elevated px-3.5 py-2 text-body-sm">
                  <TutorMessageContent content={streamingText} isStreaming className="text-body-sm" />
                </div>
              </div>
            )}

            {isStreaming && !streamingText && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl border border-border-subtle bg-surface-elevated px-3.5 py-2.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-content-tertiary animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {isError && (
              <p className="text-center text-caption-xs text-destructive">
                {locale === "cs" ? "Chyba. Zkus to znovu." : "Error. Please try again."}
              </p>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border-subtle px-4 py-3">
            <div className="flex items-end gap-2 rounded-xl border border-border-subtle bg-surface-elevated px-3 py-2 focus-within:border-primary/50 focus-within:shadow-[0_0_0_2px_hsl(var(--primary)/0.1)] transition-shadow">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(draft);
                  }
                }}
                disabled={isStreaming}
                rows={1}
                placeholder={t("placeholder", locale)}
                className="flex-1 resize-none bg-transparent text-body-sm text-content-primary placeholder:text-content-tertiary outline-none min-h-[20px] max-h-[120px] leading-5 disabled:opacity-50"
                style={{ height: "20px" }}
              />
              {isStreaming ? (
                <Button type="button" size="icon-sm" variant="outline" onClick={cancelStream} className="shrink-0 mb-0.5">
                  <Square className="h-3 w-3 fill-current" />
                </Button>
              ) : (
                <Button type="button" size="icon-sm" disabled={!draft.trim()} onClick={() => send(draft)} className="shrink-0 mb-0.5">
                  <Send className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
