/**
 * NotesPanel — a collapsible right-side panel for taking per-concept markdown notes.
 *
 * - Auto-saves on every keystroke with a 600ms debounce.
 * - Toggle between edit and rendered preview.
 * - Notes are persisted per concept ID via conceptNotes service.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, FileText, MessageSquareText, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getNote, saveNote, deleteNote } from "@/services/conceptNotes";
import { TutorMessageContent } from "./TutorMessageContent";

interface Props {
  conceptId?: string;
  conceptLabel?: string;
  onClose: () => void;
  onAskAboutNotes?: (prompt: string) => void;
  locale?: "cs" | "en";
}

const L = {
  title:          { cs: "Poznámky",               en: "Notes"                      },
  placeholder:    { cs: "Piš Markdown poznámky…", en: "Write Markdown notes…"      },
  preview:        { cs: "Náhled",                 en: "Preview"                    },
  edit:           { cs: "Upravit",                en: "Edit"                       },
  saved:          { cs: "Uloženo",                en: "Saved"                      },
  saving:         { cs: "Ukládám…",              en: "Saving…"                     },
  clear:          { cs: "Smazat poznámky",        en: "Clear notes"                },
  noContent:      { cs: "Žádný obsah k zobrazení.", en: "Nothing to preview yet."  },
  forConcept:     { cs: "pro",                    en: "for"                        },
  general:        { cs: "obecné",                 en: "general"                    },
  askAI:          { cs: "Zeptat se AI",           en: "Ask AI"                     },
  askAITitle:     { cs: "Diskutovat moje poznámky s AI", en: "Discuss these notes with AI" },
};
const t = (k: keyof typeof L, locale = "en") =>
  L[k][locale as "cs" | "en"] ?? L[k]["en"];

const DEBOUNCE_MS = 600;

export function NotesPanel({ conceptId = "general", conceptLabel, onClose, onAskAboutNotes, locale = "en" }: Props) {
  const [content, setContent]       = useState(() => getNote(conceptId));
  const [preview, setPreview]       = useState(false);
  const [saveState, setSaveState]   = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reload when concept changes
  useEffect(() => {
    setContent(getNote(conceptId));
    setSaveState("idle");
  }, [conceptId]);

  // Auto-focus textarea on open
  useEffect(() => {
    if (!preview) textareaRef.current?.focus();
  }, [preview]);

  const handleChange = useCallback((value: string) => {
    setContent(value);
    setSaveState("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveNote(conceptId, value);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
    }, DEBOUNCE_MS);
  }, [conceptId]);

  const handleClear = useCallback(() => {
    setContent("");
    deleteNote(conceptId);
    setSaveState("idle");
  }, [conceptId]);

  // Cleanup debounce on unmount — flush pending save
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        saveNote(conceptId, content);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAskAI = useCallback(() => {
    if (!content.trim() || !onAskAboutNotes) return;
    const topic = conceptLabel ? ` about ${conceptLabel}` : "";
    const prompt = locale === "cs"
      ? `Přečti si moje poznámky${topic} a:
1. Ohodnoť, co mám správně a co mi chybí.
2. Doplň mezery nebo oprav nepřesnosti.
3. Navrhni 2-3 témata k hlubšímu prozkoumání.

Moje poznámky:
---
${content.trim()}`
      : `Review my notes${topic} and:
1. Evaluate what I understand correctly and what I'm missing.
2. Fill in any gaps and correct any inaccuracies.
3. Suggest 2-3 topics worth exploring more deeply.

My notes:
---
${content.trim()}`;
    onAskAboutNotes(prompt);
  }, [content, conceptLabel, locale, onAskAboutNotes]);

  const charCount = content.length;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-border-subtle bg-surface-base">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-content-primary truncate">{t("title", locale)}</p>
            {conceptLabel && (
              <p className="text-caption-xs text-content-tertiary truncate">
                {t("forConcept", locale)} {conceptLabel}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Save status */}
          {saveState !== "idle" && (
            <span className={cn(
              "text-caption-xs transition-all",
              saveState === "saving" ? "text-content-tertiary" : "text-success",
            )}>
              {t(saveState, locale)}
            </span>
          )}

          {/* Preview toggle */}
          <button type="button" onClick={() => setPreview((v) => !v)}
            title={preview ? t("edit", locale) : t("preview", locale)}
            className="rounded-lg p-1.5 text-content-tertiary hover:bg-surface-hover hover:text-content-secondary transition-colors"
          >
            {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>

          {/* Clear */}
          {content.trim() && (
            <button type="button" onClick={handleClear}
              title={t("clear", locale)}
              className="rounded-lg p-1.5 text-content-tertiary hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Close */}
          <button type="button" onClick={onClose}
            className="rounded-lg p-1.5 text-content-tertiary hover:bg-surface-hover hover:text-content-secondary transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {preview ? (
          <div className="h-full overflow-y-auto px-4 py-3">
            {content.trim() ? (
              <TutorMessageContent content={content} />
            ) : (
              <p className="text-body-sm text-content-tertiary/60 italic">{t("noContent", locale)}</p>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={t("placeholder", locale)}
            className={cn(
              "h-full w-full resize-none bg-transparent px-4 py-3",
              "font-mono text-body-sm text-content-primary placeholder:text-content-tertiary/50",
              "outline-none leading-relaxed",
            )}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border-subtle px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-caption-xs text-content-tertiary/60">{charCount} chars · Markdown</span>
        </div>
        {content.trim() && onAskAboutNotes && (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-caption-xs"
            onClick={handleAskAI}
            title={t("askAITitle", locale)}
          >
            <MessageSquareText className="h-3 w-3" />
            {t("askAI", locale)}
          </Button>
        )}
      </div>
    </aside>
  );
}
