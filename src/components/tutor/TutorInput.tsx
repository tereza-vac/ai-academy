/**
 * TutorInput — chat input area with auto-resize textarea, send/stop buttons,
 * quick-prompt chips, and optional voice input (Web Speech API).
 */
import { useCallback, useEffect, useRef, useState, KeyboardEvent } from "react";
import { ArrowUp, Mic, MicOff, Network, Square, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ALL_NODES, pickLocaleText, type ConceptNode } from "@/lib/aiMapData";
import { triggerAchievementCheck } from "@/lib/achievementBus";

export type ResponseStyle = "concise" | "detailed" | "expert";

interface Props {
  onSend: (text: string) => void;
  onCancel?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  quickPrompts?: string[];
  locale?: string;
  responseStyle?: ResponseStyle;
  onResponseStyleChange?: (s: ResponseStyle) => void;
  onConceptMention?: (concept: ConceptNode) => void;
}

const COPY = {
  placeholder: { cs: "Zeptej se mě na cokoliv z AI…", en: "Ask me anything about AI…" },
  sendBtn: { cs: "Odeslat", en: "Send" },
  cancelBtn: { cs: "Zastavit", en: "Stop" },
  voiceStart: { cs: "Nahrávat hlas", en: "Start voice input" },
  voiceStop: { cs: "Zastavit nahrávání", en: "Stop recording" },
  hintShift: { cs: "Shift+Enter pro nový řádek", en: "Shift+Enter for new line" },
  voiceHint: { cs: "Nahrávám…", en: "Listening…" },
};
const t = (key: keyof typeof COPY, locale = "en") =>
  COPY[key][locale as "cs" | "en"] ?? COPY[key]["en"];

const STYLE_OPTIONS: { id: ResponseStyle; label: { cs: string; en: string }; desc: { cs: string; en: string } }[] = [
  { id: "concise",  label: { cs: "Stručně",   en: "Concise"  }, desc: { cs: "Krátká, přesná odpověď",          en: "Short, direct answer"       } },
  { id: "detailed", label: { cs: "Detailně",  en: "Detailed" }, desc: { cs: "Vysvětlení s příklady",           en: "Full explanation with examples" } },
  { id: "expert",   label: { cs: "Expertně",  en: "Expert"   }, desc: { cs: "Technická hloubka, bez zjednodušení", en: "Technical depth, no hand-holding" } },
];

/** Prefix injected into the user message to steer response style */
const STYLE_PREFIX: Record<ResponseStyle, string> = {
  concise:  "Give a concise, focused answer (1–2 paragraphs max): ",
  detailed: "Give a thorough, detailed answer with concrete examples: ",
  expert:   "Assume I am an expert practitioner. Give a technically deep, rigorous answer without oversimplification: ",
};

const DEFAULT_PROMPTS_EN = [
  "Explain it with a real-world analogy",
  "What are the most common misconceptions?",
  "Show me a working code example",
  "How does this compare to the alternatives?",
  "What should I learn next after this?",
];

const DEFAULT_PROMPTS_CS = [
  "Vysvětli to pomocí analogie z reálného světa",
  "Jaké jsou nejčastější mylné představy?",
  "Ukaž mi funkční ukázku kódu",
  "Jak se to liší od alternativ?",
  "Co bych se měl naučit dál?",
];

/* ─── @mention concept picker ────────────────────────────────────────── */

function useMentionPicker(locale: string) {
  const [query, setQuery] = useState<string | null>(null); // null = closed
  const [selectedIdx, setSelectedIdx] = useState(0);

  const results = useCallback((): ConceptNode[] => {
    if (query === null || query === "") return ALL_NODES.slice(0, 8);
    const q = query.toLowerCase();
    return ALL_NODES.filter((n) => {
      const label = pickLocaleText(n.label, locale as "cs" | "en").toLowerCase();
      return label.includes(q) || n.id.toLowerCase().includes(q);
    }).slice(0, 8);
  }, [query, locale]);

  const open = (q: string) => { setQuery(q); setSelectedIdx(0); };
  const close = () => setQuery(null);
  const moveUp = () => setSelectedIdx((i) => Math.max(0, i - 1));
  const moveDown = (len: number) => setSelectedIdx((i) => Math.min(len - 1, i + 1));

  return { query, selectedIdx, results, open, close, moveUp, moveDown };
}

interface MentionPickerProps {
  results: ConceptNode[];
  selectedIdx: number;
  locale: string;
  onSelect: (node: ConceptNode) => void;
}

function MentionPicker({ results, selectedIdx, locale, onSelect }: MentionPickerProps) {
  if (results.length === 0) return null;
  return (
    <div className="absolute bottom-full left-0 z-50 mb-1 w-72 rounded-xl border border-border-subtle bg-surface-elevated shadow-elevation-md overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border-subtle/50">
        <p className="text-caption-xs text-content-tertiary font-medium">Jump to concept context</p>
      </div>
      {results.map((node, i) => {
        const label = pickLocaleText(node.label, locale as "cs" | "en");
        return (
          <button
            key={node.id}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(node); }}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
              i === selectedIdx
                ? "bg-primary/10 text-content-primary"
                : "text-content-secondary hover:bg-surface-hover hover:text-content-primary",
            )}
          >
            <Network className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            <div className="min-w-0">
              <p className="text-body-sm font-medium truncate">{label}</p>
              {node.domain && (
                <p className="text-caption-xs text-content-tertiary/70 truncate">{node.domain}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Voice input hook ────────────────────────────────────────────────── */

/**
 * Minimal Web Speech API types — the standard TS DOM lib doesn't ship these
 * (they're a vendor-prefixed, non-standardized browser API).
 */
interface MinimalSpeechRecognitionResult {
  0: { transcript: string };
  isFinal: boolean;
}
interface MinimalSpeechRecognitionEvent {
  results: { length: number; [index: number]: MinimalSpeechRecognitionResult };
}
interface MinimalSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: MinimalSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => MinimalSpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

interface UseVoiceOptions {
  locale: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onEnd: () => void;
}

function useVoiceInput({ locale, onTranscript, onEnd }: UseVoiceOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported] = useState(() => getSpeechRecognition() !== null);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);

  const start = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    const r = new SR();
    r.lang = locale === "cs" ? "cs-CZ" : locale === "sk" ? "sk-SK" : "en-US";
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onstart = () => setIsRecording(true);
    r.onend = () => {
      setIsRecording(false);
      onEnd();
    };
    r.onerror = () => {
      setIsRecording(false);
      onEnd();
    };
    r.onresult = (event: MinimalSpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      onTranscript(transcript, result.isFinal);
    };

    recognitionRef.current = r;
    r.start();
  }, [locale, onTranscript, onEnd]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  }, []);

  useEffect(() => () => { recognitionRef.current?.abort(); }, []);

  return { isRecording, isSupported, start, stop };
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export function TutorInput({
  onSend,
  onCancel,
  isStreaming,
  disabled = false,
  placeholder,
  quickPrompts,
  locale = "en",
  responseStyle = "detailed",
  onResponseStyleChange,
  onConceptMention,
}: Props) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mention = useMentionPicker(locale);

  const defaultPrompts = locale === "cs" ? DEFAULT_PROMPTS_CS : DEFAULT_PROMPTS_EN;
  const prompts = quickPrompts ?? defaultPrompts;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, []);

  const submit = useCallback(() => {
    const text = draft.trim();
    if (!text || isStreaming) return;
    const prefix = responseStyle !== "detailed" ? STYLE_PREFIX[responseStyle] : "";
    onSend(prefix + text);
    setDraft("");
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    });
  }, [draft, isStreaming, onSend]);

  // Detect @query in draft
  const updateMention = useCallback((text: string) => {
    const match = text.match(/@([\w\-]*)$/);
    if (match) mention.open(match[1]);
    else mention.close();
  }, [mention]);

  const handleConceptSelect = useCallback((node: ConceptNode) => {
    // Replace the trailing @query with the concept label and close
    const label = pickLocaleText(node.label, locale as "cs" | "en");
    setDraft((d) => d.replace(/@[\w\-]*$/, `@${label} `));
    mention.close();
    onConceptMention?.(node);
    textareaRef.current?.focus();
  }, [locale, mention, onConceptMention]);

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Navigate mention picker
      if (mention.query !== null) {
        const items = mention.results();
        if (e.key === "ArrowUp")   { e.preventDefault(); mention.moveUp(); return; }
        if (e.key === "ArrowDown") { e.preventDefault(); mention.moveDown(items.length); return; }
        if (e.key === "Tab" || (e.key === "Enter" && items.length > 0)) {
          e.preventDefault();
          const chosen = items[mention.selectedIdx];
          if (chosen) handleConceptSelect(chosen);
          return;
        }
        if (e.key === "Escape") { mention.close(); return; }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit, mention, handleConceptSelect],
  );

  /* Voice */
  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      setDraft(text);
      adjustHeight();
      if (isFinal) {
        // Auto-send a second after final transcript
        setTimeout(() => {
          setDraft((d) => {
            const trimmed = d.trim();
            if (trimmed) { onSend(trimmed); return ""; }
            return d;
          });
          if (textareaRef.current) textareaRef.current.style.height = "auto";
        }, 400);
      }
    },
    [adjustHeight, onSend],
  );

  const { isRecording, isSupported, start: startVoice, stop: stopVoice } = useVoiceInput({
    locale,
    onTranscript: handleTranscript,
    onEnd: () => { /* nothing — submit handled in onTranscript */ },
  });

  const toggleVoice = useCallback(() => {
    if (isRecording) stopVoice();
    else {
      startVoice();
      triggerAchievementCheck({ usedVoice: true });
    }
  }, [isRecording, startVoice, stopVoice]);

  return (
    <div className="flex flex-col gap-3">
      {/* Response style selector */}
      {onResponseStyleChange && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {STYLE_OPTIONS.map((opt) => {
            const active = responseStyle === opt.id;
            const lbl = opt.label[locale as "cs" | "en"] ?? opt.label.en;
            const desc = opt.desc[locale as "cs" | "en"] ?? opt.desc.en;
            return (
              <button
                key={opt.id}
                type="button"
                title={desc}
                onClick={() => onResponseStyleChange(opt.id)}
                className={cn(
                  "rounded-full border px-3 py-0.5 text-caption-xs font-medium transition-all",
                  "outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
                  active
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border-subtle bg-surface-base text-content-tertiary hover:border-border-strong hover:text-content-secondary",
                )}
              >
                {lbl}
              </button>
            );
          })}
        </div>
      )}

      {/* Quick-prompt chips */}
      <div className="flex flex-wrap gap-1.5">
        {prompts.slice(0, 5).map((p) => (
          <button
            key={p}
            type="button"
            disabled={isStreaming || disabled}
            onClick={() => onSend(p)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-base px-3 py-1",
              "text-caption-xs text-content-secondary transition-colors",
              "hover:border-border-strong hover:text-content-primary hover:bg-surface-elevated",
              "disabled:pointer-events-none disabled:opacity-40",
              "outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
            )}
          >
            <Sparkles className="h-3 w-3 opacity-60 shrink-0" />
            {p}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div
        className={cn(
          "relative flex items-end gap-2 rounded-2xl border bg-surface-elevated px-4 py-3",
          isRecording
            ? "border-rose-400/70 shadow-[0_0_0_3px_hsl(var(--destructive)/0.12)]"
            : "border-border-subtle focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]",
          "transition-shadow",
          disabled && "opacity-50",
        )}
      >
        {/* @mention picker */}
        {mention.query !== null && (
          <MentionPicker
            results={mention.results()}
            selectedIdx={mention.selectedIdx}
            locale={locale}
            onSelect={handleConceptSelect}
          />
        )}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            adjustHeight();
            updateMention(e.target.value);
          }}
          onKeyDown={handleKey}
          disabled={disabled || isStreaming}
          rows={1}
          placeholder={
            isRecording
              ? t("voiceHint", locale)
              : (placeholder ?? t("placeholder", locale))
          }
          className={cn(
            "flex-1 resize-none bg-transparent text-body-md text-content-primary placeholder:text-content-tertiary",
            "outline-none min-h-[24px] max-h-[180px] leading-6",
            "disabled:opacity-50",
            isRecording && "placeholder:text-rose-400",
          )}
          style={{ height: "24px" }}
        />

        <div className="flex items-center gap-1 shrink-0 mb-0.5">
          {/* Voice button */}
          {isSupported && !isStreaming && (
            <Button
              type="button"
              size="icon-sm"
              variant={isRecording ? "destructive" : "ghost"}
              onClick={toggleVoice}
              title={isRecording ? t("voiceStop", locale) : t("voiceStart", locale)}
              className={cn(isRecording && "animate-pulse")}
            >
              {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </Button>
          )}

          {/* Send / Stop */}
          {isStreaming ? (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              onClick={onCancel}
              title={t("cancelBtn", locale)}
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon-sm"
              disabled={!draft.trim() || disabled}
              onClick={submit}
              title={t("sendBtn", locale)}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <p className="text-center text-caption-xs text-content-tertiary">
        {t("hintShift", locale)}
      </p>
    </div>
  );
}
