/**
 * ChatWidget ? floating AI Tutor chat bubble available on every page.
 *
 * Renders via createPortal into document.body to bypass any overflow /
 * stacking-context issues. A gradient "sparkle" FAB toggles a compact chat
 * panel; the panel can expand into the full /tutor page.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTutorChat } from "@/hooks/useTutorChat";
import { TutorMessageContent } from "@/components/tutor/TutorMessageContent";
import { useChatWidgetStore } from "@/stores/chatWidgetStore";
import { useLocaleStore, selectLocale } from "@/stores/localeStore";
import { getNode, pickLocaleText } from "@/lib/aiMapData";
import type { TutorContext } from "@/services/tutorApi";
import type { Locales } from "@/i18n/i18n-types";

/* ??? Constants ???????????????????????????????????????????????????????????? */

const WELCOME = {
  en: "Hi ?? I'm your **AI Tutor**. Ask me anything about AI, machine learning, or any concept in the Academy.",
  cs: "Ahoj ?? Jsem tv?j **AI Tutor**. Zeptej se m? na cokoliv o um?lé inteligenci nebo konceptech z Akademie.",
};

const SUGGESTIONS = {
  en: [
    "What is a transformer?",
    "Explain attention in simple terms",
    "Give me a study plan for LLMs",
  ],
  cs: [
    "Co je to transformer?",
    "Vysv?tli attention jednodu?e",
    "Navrhni studijní plán pro LLMs",
  ],
};

/** Shared gradient for the FAB + header so they read as one product. */
const BRAND_GRADIENT = "bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500";

/* ??? Typing dots ?????????????????????????????????????????????????????????? */

function TypingDots() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-surface-sunken px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-content-tertiary"
            style={{
              animation: "widgetBounce 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ??? Message bubble ??????????????????????????????????????????????????????? */

interface Msg {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

function Bubble({ msg, isStreaming }: { msg: Msg; isStreaming?: boolean }) {
  if (msg.role === "system") return null;
  const isUser = msg.role === "user";

  return (
    <div className={cn("flex items-end gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 mb-0.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed break-words",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-surface-sunken text-content-primary",
        )}
      >
        {isUser
          ? <span className="whitespace-pre-wrap">{msg.content}</span>
          : <TutorMessageContent content={msg.content} isStreaming={isStreaming} />
        }
      </div>
    </div>
  );
}

/* ??? Empty / suggestions ?????????????????????????????????????????????????? */

function EmptyState({
  locale, conceptLabel, onSuggestion,
}: { locale: string; conceptLabel?: string; onSuggestion: (s: string) => void }) {
  const suggestions = SUGGESTIONS[locale as "cs" | "en"] ?? SUGGESTIONS.en;

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-6 text-center h-full justify-center">
      <div className="relative">
        <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-elevation-sm", BRAND_GRADIENT)}>
          <Sparkles className="h-8 w-8" />
        </div>
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 border-2 border-surface-elevated text-[9px] text-white font-bold">
          ?
        </span>
      </div>

      <div className="space-y-1.5">
        <p className="text-body-md font-bold text-content-primary">AI Tutor</p>
        <p className="text-caption-xs text-content-tertiary leading-relaxed max-w-[210px]">
          {conceptLabel
            ? locale === "cs"
              ? `Poj?me probrat ?${conceptLabel}". Na co se chce? zeptat?`
              : `Let's explore "${conceptLabel}". What would you like to know?`
            : locale === "cs"
              ? "Tv?j asistent pro u?ení AI. Zeptej se na cokoliv."
              : "Your AI learning assistant. Ask me anything."}
        </p>
      </div>

      <div className="flex flex-col gap-2 w-full">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggestion(s)}
            className="w-full rounded-xl border border-border-subtle bg-surface-base px-3 py-2.5 text-left text-[12px] text-content-secondary leading-tight hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all duration-150"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ??? Inner chat panel ????????????????????????????????????????????????????? */

function ChatPanel({
  locale, context, onClose,
}: { locale: string; context: Partial<TutorContext> | null; onClose: () => void }) {
  const navigate   = useNavigate();
  const scrollRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");

  const node = context?.conceptId ? getNode(context.conceptId) : null;
  const conceptLabel = context?.conceptLabel
    ?? (node ? pickLocaleText(node.label, locale as Locales) : undefined);

  const fullContext: TutorContext | undefined = context
    ? {
        locale,
        conceptId: context.conceptId,
        conceptLabel,
        conceptSummary: node ? pickLocaleText(node.parable, locale as Locales) : undefined,
        domain: context.domain,
      }
    : undefined;

  const welcomeMsg = conceptLabel
    ? locale === "cs"
      ? `Ahoj ?? Poj?me probrat **${conceptLabel}**. Na co se chce? zeptat?`
      : `Hey ?? Let's explore **${conceptLabel}**. What would you like to know?`
    : (WELCOME[locale as "cs" | "en"] ?? WELCOME.en);

  const {
    messages, streamingText, isStreaming, isError,
    sendMessage, cancelStream, resetSession,
  } = useTutorChat({
    context: fullContext,
    welcomeMessage: welcomeMsg,
    model: "gpt-4o-mini",
  });

  // Handle pending messages queued from the store
  const pendingMsg = useChatWidgetStore((s) => s.pendingMessage);
  const clearPending = useChatWidgetStore((s) => s.setPendingMessage);
  useEffect(() => {
    if (pendingMsg) { sendMessage(pendingMsg); clearPending(null); }
  }, [pendingMsg, sendMessage, clearPending]);

  // Auto-scroll to bottom
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, streamingText]);

  // Focus input on open
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 150); }, []);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || isStreaming) return;
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    sendMessage(text);
  }, [draft, isStreaming, sendMessage]);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleExpand = useCallback(() => {
    const params = new URLSearchParams();
    if (fullContext?.conceptId) params.set("conceptId", fullContext.conceptId);
    if (fullContext?.domain)    params.set("domain", fullContext.domain);
    navigate(`/tutor${params.size > 0 ? `?${params}` : ""}`);
    onClose();
  }, [fullContext, navigate, onClose]);

  const visible = messages;
  const hasContent = visible.length > 1 || isStreaming;

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-2xl">

      {/* ?? Header ?? */}
      <div className={cn("shrink-0 px-4 py-4 text-white", BRAND_GRADIENT)}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Sparkles className="h-[18px] w-[18px] text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white leading-tight">AI Tutor</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                isStreaming ? "bg-amber-300 animate-pulse" : "bg-emerald-300",
              )} />
              <p className="text-[11px] text-white/80">
                {isStreaming
                  ? (locale === "cs" ? "Pí?e?" : "Typing?")
                  : (conceptLabel ?? "Online")}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <button type="button" title={locale === "cs" ? "Nová konverzace" : "New conversation"} onClick={resetSession}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:bg-white/15 hover:text-white transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button type="button" title={locale === "cs" ? "Otev?ít plný tutor" : "Open full tutor"} onClick={handleExpand}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:bg-white/15 hover:text-white transition-colors">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
            <button type="button" title={locale === "cs" ? "Zav?ít" : "Close"} onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:bg-white/15 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ?? Messages ?? */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin bg-surface-base">
        {!hasContent
          ? <EmptyState locale={locale} conceptLabel={conceptLabel} onSuggestion={sendMessage} />
          : (
            <div className="space-y-3 p-4">
              {visible.map((m) => <Bubble key={m.id} msg={m} />)}
              {isStreaming && streamingText && (
                <Bubble msg={{ id: "stream", role: "assistant", content: streamingText }} isStreaming />
              )}
              {isStreaming && !streamingText && <TypingDots />}
              {isError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-[12px] text-destructive">
                  {locale === "cs" ? "Chyba. Zkus to znovu." : "Something went wrong. Try again."}
                </div>
              )}
            </div>
          )
        }
      </div>

      {/* ?? Input ?? */}
      <div className="shrink-0 border-t border-border-subtle bg-surface-elevated px-3 pt-3 pb-3">
        <div className={cn(
          "flex items-end gap-2 rounded-xl border border-border-subtle bg-surface-base px-3 py-2.5",
          "focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)] transition-all duration-200",
        )}>
          <textarea
            ref={inputRef}
            value={draft}
            rows={1}
            disabled={isStreaming}
            placeholder={locale === "cs" ? "Napi? zprávu?" : "Type a message?"}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
            }}
            onKeyDown={handleKey}
            className="flex-1 resize-none overflow-hidden bg-transparent text-[13px] text-content-primary placeholder:text-content-tertiary/70 outline-none leading-relaxed min-h-[1.375rem] max-h-[6.25rem]"
          />
          {isStreaming
            ? (
              <button type="button" onClick={cancelStream}
                className="shrink-0 mb-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                <Square className="h-3 w-3 fill-current" />
              </button>
            )
            : (
              <button type="button" onClick={handleSend} disabled={!draft.trim()}
                className={cn(
                  "shrink-0 mb-0.5 flex h-7 w-7 items-center justify-center rounded-xl transition-all",
                  draft.trim()
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-border-subtle text-content-tertiary/50 cursor-not-allowed",
                )}>
                <Send className="h-3.5 w-3.5" />
              </button>
            )
          }
        </div>
        <div className="mt-2 flex items-center justify-between px-0.5">
          <p className="text-[10px] text-content-tertiary/50">
            {locale === "cs" ? "Enter ? odeslat · Shift+Enter ? nový ?ádek" : "Enter to send · Shift+Enter for newline"}
          </p>
          <button type="button" onClick={handleExpand}
            className="flex items-center gap-0.5 text-[10px] text-primary/60 hover:text-primary transition-colors">
            {locale === "cs" ? "Plný tutor" : "Full tutor"} <ArrowUpRight className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ??? Root ? portal to document.body ?????????????????????????????????????? */

export function ChatWidget() {
  const locale   = useLocaleStore(selectLocale);
  const isOpen   = useChatWidgetStore((s) => s.isOpen);
  const context  = useChatWidgetStore((s) => s.context);
  const toggle   = useChatWidgetStore((s) => s.toggle);
  const close    = useChatWidgetStore((s) => s.close);
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isOnTutorPage = location.pathname === "/tutor";

  useEffect(() => { if (isOnTutorPage && isOpen) close(); }, [isOnTutorPage, isOpen, close]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!mounted || isOnTutorPage) return null;

  const content = (
    <>
      {/* Bounce keyframe for typing indicator */}
      <style>{`
        @keyframes widgetBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>

      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-[9997] bg-black/40 sm:hidden" onClick={close} />
      )}

      {/* Chat panel */}
      <div
        aria-hidden={!isOpen}
        className={cn(
          "fixed right-6 z-[9998]",
          "bottom-[5.5rem]",
          "w-[calc(100vw-3rem)] max-w-[380px]",
          "h-[540px] max-h-[calc(100svh-8rem)]",
          "overflow-hidden rounded-2xl border border-border-subtle",
          "bg-surface-elevated",
          "shadow-elevation-lg",
          "transition-all duration-300 ease-out origin-bottom-right",
          isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 translate-y-3 pointer-events-none",
        )}
      >
        {isOpen && <ChatPanel locale={locale} context={context} onClose={close} />}
      </div>

      {/* Gradient sparkle FAB */}
      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? "Close AI Tutor" : "Open AI Tutor"}
        className={cn(
          "fixed bottom-6 right-6 z-[9999]",
          "flex h-14 w-14 items-center justify-center rounded-full",
          "text-white",
          BRAND_GRADIENT,
          "shadow-[0_8px_24px_rgba(124,58,237,0.35),0_2px_8px_rgba(0,0,0,0.15)]",
          "transition-all duration-300 ease-out",
          "outline-none focus-visible:ring-4 focus-visible:ring-primary/40",
          "hover:scale-110 hover:shadow-[0_12px_32px_rgba(124,58,237,0.45)]",
          isOpen && "scale-90",
        )}
      >
        {/* Icon: Sparkles when closed, X when open */}
        <span className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-250",
          isOpen ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 -rotate-90",
        )}>
          <X className="h-5 w-5" />
        </span>
        <span className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-250",
          isOpen ? "opacity-0 scale-75 rotate-90" : "opacity-100 scale-100 rotate-0",
        )}>
          <Sparkles className="h-6 w-6" strokeWidth={1.75} />
        </span>
      </button>
    </>
  );

  return createPortal(content, document.body);
}
