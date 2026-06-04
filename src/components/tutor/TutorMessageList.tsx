/**
 * TutorMessageList — renders the conversation history + streaming bubble.
 *
 * Per-message hover actions: copy, pin/bookmark, regenerate.
 * After the last assistant message: related concept chips.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Bookmark, BookmarkCheck, Check, Copy, GraduationCap, RefreshCw, User } from "lucide-react";
import type { TutorMessage } from "@/services/tutorApi";
import { isPinned, pinMessage, unpinMessage } from "@/services/pinnedMessages";
import { matchConcepts } from "@/lib/conceptMatcher";
import { pickLocaleText } from "@/lib/aiMapData";
import { cn } from "@/lib/utils";
import { TutorMessageContent } from "./TutorMessageContent";
import { FlashcardCreateModal } from "./FlashcardCreateModal";

interface Props {
  messages: TutorMessage[];
  streamingText: string;
  isStreaming: boolean;
  isError: boolean;
  errorMessage: string | null;
  onRegenerate?: () => void;
  /** Active concept — excluded from related-concept chips */
  activeConceptId?: string;
  conversationId?: string;
  conceptLabel?: string;
  locale?: string;
}

const COPY = {
  copyMsg: { cs: "Kopírovat", en: "Copy" },
  copied: { cs: "Zkopírováno", en: "Copied" },
  regenerate: { cs: "Znovu generovat", en: "Regenerate" },
  pin: { cs: "Uložit", en: "Save" },
  unpin: { cs: "Odebrat", en: "Unsave" },
  flashcard: { cs: "Kartička", en: "Flashcard" },
  relatedTitle: { cs: "Příbuzná témata", en: "Related topics" },
};
const t = (k: keyof typeof COPY, locale = "en") =>
  COPY[k][locale as "cs" | "en"] ?? COPY[k]["en"];

/* ─── Avatars ─────────────────────────────────────────────────────────── */

function AssistantAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
      <Bot className="h-3.5 w-3.5 text-primary" />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-elevated ring-1 ring-border-subtle">
      <User className="h-3.5 w-3.5 text-content-secondary" />
    </div>
  );
}

/* ─── Copy button ─────────────────────────────────────────────────────── */

function CopyMsgButton({ text, locale }: { text: string; locale: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(() => {
    const doMark = () => {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    };
    navigator.clipboard.writeText(text).then(doMark).catch(() => {
      const el = Object.assign(document.createElement("textarea"), {
        value: text, style: "position:absolute;opacity:0",
      });
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      doMark();
    });
  }, [text]);

  return (
    <button type="button" onClick={copy} title={t("copyMsg", locale)}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-caption-xs text-content-tertiary transition-all hover:bg-surface-elevated hover:text-content-secondary"
    >
      {copied
        ? <><Check className="h-3 w-3 text-success" />{t("copied", locale)}</>
        : <><Copy className="h-3 w-3" />{t("copyMsg", locale)}</>}
    </button>
  );
}

/* ─── Pin button ──────────────────────────────────────────────────────── */

function PinButton({
  message, conversationId, conceptLabel, locale,
}: {
  message: TutorMessage;
  conversationId?: string;
  conceptLabel?: string;
  locale: string;
}) {
  const [pinned, setPinned] = useState(() => isPinned(message.id));

  const toggle = useCallback(() => {
    if (pinned) {
      unpinMessage(message.id);
      setPinned(false);
    } else {
      pinMessage({
        messageId: message.id,
        content: message.content,
        conversationId: conversationId ?? "unknown",
        conceptLabel,
      });
      setPinned(true);
    }
  }, [pinned, message, conversationId, conceptLabel]);

  return (
    <button type="button" onClick={toggle}
      title={pinned ? t("unpin", locale) : t("pin", locale)}
      className={cn(
        "flex items-center gap-1 rounded-lg px-2 py-1 text-caption-xs transition-all hover:bg-surface-elevated",
        pinned ? "text-primary" : "text-content-tertiary hover:text-content-secondary",
      )}
    >
      {pinned
        ? <><BookmarkCheck className="h-3 w-3" />{t("unpin", locale)}</>
        : <><Bookmark className="h-3 w-3" />{t("pin", locale)}</>}
    </button>
  );
}

/* ─── Related concepts chips ─────────────────────────────────────────── */

function RelatedConceptChips({
  content, locale, activeConceptId,
}: {
  content: string;
  locale: string;
  activeConceptId?: string;
}) {
  const navigate = useNavigate();

  const concepts = useMemo(
    () => matchConcepts(content, locale as "cs" | "en", activeConceptId, 4),
    [content, locale, activeConceptId],
  );

  if (concepts.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] text-content-tertiary/70 mr-0.5">
        {t("relatedTitle", locale)}:
      </span>
      {concepts.map((node) => {
        const label = pickLocaleText(node.label, locale as "cs" | "en");
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => navigate(`/tutor?conceptId=${encodeURIComponent(node.id)}`)}
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] transition-all",
              "border-border-subtle text-content-secondary hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
              "outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Message actions row ─────────────────────────────────────────────── */

function MessageActions({
  message, isLast, onRegenerate, conversationId, conceptLabel, conceptId, locale,
}: {
  message: TutorMessage;
  isLast?: boolean;
  onRegenerate?: () => void;
  conversationId?: string;
  conceptLabel?: string;
  conceptId?: string;
  locale: string;
}) {
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);

  return (
    <>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyMsgButton text={message.content} locale={locale} />
        <PinButton
          message={message}
          conversationId={conversationId}
          conceptLabel={conceptLabel}
          locale={locale}
        />
        <button type="button"
          onClick={() => setShowFlashcardModal(true)}
          title={t("flashcard", locale)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-caption-xs text-content-tertiary transition-all hover:bg-surface-elevated hover:text-content-secondary"
        >
          <GraduationCap className="h-3 w-3" />
          {t("flashcard", locale)}
        </button>
        {isLast && onRegenerate && (
          <button type="button" onClick={onRegenerate} title={t("regenerate", locale)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-caption-xs text-content-tertiary transition-all hover:bg-surface-elevated hover:text-content-secondary"
          >
            <RefreshCw className="h-3 w-3" />
            {t("regenerate", locale)}
          </button>
        )}
      </div>

      {showFlashcardModal && (
        <FlashcardCreateModal
          messageContent={message.content}
          conceptId={conceptId}
          conceptLabel={conceptLabel}
          locale={locale as "cs" | "en"}
          onClose={() => setShowFlashcardModal(false)}
          onSaved={() => setShowFlashcardModal(false)}
        />
      )}
    </>
  );
}

/* ─── Message bubble ──────────────────────────────────────────────────── */

function MessageBubble({
  message, isLast, isStreaming, onRegenerate,
  activeConceptId, conversationId, conceptLabel, locale,
}: {
  message: TutorMessage;
  isLast?: boolean;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  activeConceptId?: string;
  conversationId?: string;
  conceptLabel?: string;
  locale: string;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="group flex items-end justify-end gap-2.5">
        <div className="flex flex-col items-end gap-1">
          <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
            <TutorMessageContent content={message.content} isUser />
          </div>
        </div>
        <UserAvatar />
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2.5">
      <AssistantAvatar />
      <div className="flex flex-col gap-1 max-w-[82%]">
        <div className="rounded-2xl rounded-tl-sm border border-border-subtle bg-surface-elevated px-4 py-3">
          <TutorMessageContent content={message.content} isStreaming={isStreaming} />
        </div>

        {/* Action row — only on completed assistant messages */}
        {!isStreaming && (
          <MessageActions
            message={message}
            isLast={isLast}
            onRegenerate={onRegenerate}
            conversationId={conversationId}
            conceptLabel={conceptLabel}
            conceptId={activeConceptId}
            locale={locale}
          />
        )}

        {/* Related concept chips — only on the last finalized assistant message */}
        {isLast && !isStreaming && message.content.length > 80 && (
          <RelatedConceptChips
            content={message.content}
            locale={locale}
            activeConceptId={activeConceptId}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export function TutorMessageList({
  messages, streamingText, isStreaming, isError, errorMessage,
  onRegenerate, activeConceptId, conversationId, conceptLabel, locale = "en",
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, streamingText]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-body-sm text-content-tertiary">
          {locale === "cs" ? "Začni psát níže." : "Start typing below."}
        </p>
      </div>
    );
  }

  const lastAssistantIdx = messages.reduce<number>(
    (acc, m, i) => (m.role === "assistant" ? i : acc), -1,
  );

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 scroll-smooth">
      {messages.map((msg, idx) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isLast={idx === lastAssistantIdx}
          onRegenerate={onRegenerate}
          activeConceptId={activeConceptId}
          conversationId={conversationId}
          conceptLabel={conceptLabel}
          locale={locale}
        />
      ))}

      {/* Streaming bubble */}
      {isStreaming && streamingText && (
        <MessageBubble
          message={{ id: "streaming", role: "assistant", content: streamingText, createdAt: "" }}
          isStreaming
          locale={locale}
        />
      )}

      {/* Typing indicator */}
      {isStreaming && !streamingText && (
        <div className="flex items-start gap-2.5">
          <AssistantAvatar />
          <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-border-subtle bg-surface-elevated px-4 py-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 rounded-full bg-content-tertiary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex items-start gap-2.5">
          <AssistantAvatar />
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-body-sm font-medium text-destructive">
              {locale === "cs" ? "Něco se nepovedlo" : "Something went wrong"}
            </p>
            {errorMessage && <p className="mt-0.5 text-caption-xs text-destructive/70">{errorMessage}</p>}
            <p className="mt-1 text-caption-xs text-content-tertiary">
              {locale === "cs" ? "Zkus to znovu." : "Try again."}
            </p>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-px shrink-0" />
    </div>
  );
}
