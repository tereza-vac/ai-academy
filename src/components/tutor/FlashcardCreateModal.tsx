/**
 * FlashcardCreateModal — lets the user create a flashcard from an AI message.
 *
 * Pre-fills the back with the message content and suggests a front question
 * based on the active concept or recent conversation topic.
 */
import { useCallback, useState } from "react";
import { BookOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { addCard } from "@/services/flashcards";
import { triggerAchievementCheck } from "@/lib/achievementBus";

interface Props {
  /** AI message content (becomes the back of the card) */
  messageContent: string;
  conceptId?: string;
  conceptLabel?: string;
  onClose: () => void;
  onSaved: () => void;
  locale?: "cs" | "en";
}

const L = {
  title: { cs: "Vytvořit kartičku", en: "Create flashcard" },
  frontLabel: { cs: "Přední strana (otázka)", en: "Front (question)" },
  backLabel: { cs: "Zadní strana (odpověď)", en: "Back (answer)" },
  frontPlaceholder: { cs: "Napiš otázku…", en: "Write the question…" },
  save: { cs: "Uložit kartičku", en: "Save card" },
  cancel: { cs: "Zrušit", en: "Cancel" },
  hint: { cs: "Kartičky jsou uloženy lokálně a lze je přezkoumat kdykoli.", en: "Cards are stored locally and can be reviewed anytime." },
};
const t = (k: keyof typeof L, locale = "en") =>
  L[k][locale as "cs" | "en"] ?? L[k]["en"];

/** Trim the AI message to a reasonable back-of-card length */
function trimForCard(content: string, maxLen = 600): string {
  if (content.length <= maxLen) return content;
  const cut = content.slice(0, maxLen);
  const lastBreak = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(". "));
  return (lastBreak > maxLen / 2 ? cut.slice(0, lastBreak + 1) : cut).trim() + "\n\n*(truncated)*";
}

/** Suggest a question front based on context */
function suggestFront(conceptLabel?: string, locale?: string): string {
  if (!conceptLabel) return "";
  return locale === "cs"
    ? `Co je ${conceptLabel} a jak funguje?`
    : `What is ${conceptLabel} and how does it work?`;
}

export function FlashcardCreateModal({
  messageContent, conceptId, conceptLabel, onClose, onSaved, locale = "en",
}: Props) {
  const [front, setFront] = useState(() => suggestFront(conceptLabel, locale));
  const [back, setBack] = useState(() => trimForCard(messageContent));
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(() => {
    if (!front.trim() || !back.trim()) return;
    setSaving(true);
    addCard({ front: front.trim(), back: back.trim(), conceptId, conceptLabel });
    setTimeout(() => triggerAchievementCheck(), 500);
    onSaved();
    onClose();
  }, [front, back, conceptId, conceptLabel, onClose, onSaved]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-border-subtle bg-surface-elevated shadow-elevation-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-body-md font-semibold text-content-primary">{t("title", locale)}</h2>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg p-1.5 text-content-tertiary hover:bg-surface-hover hover:text-content-secondary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Front */}
          <div className="space-y-1.5">
            <label className="block text-caption-xs font-semibold uppercase tracking-wide text-content-tertiary">
              {t("frontLabel", locale)}
            </label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder={t("frontPlaceholder", locale)}
              rows={3}
              className={cn(
                "w-full resize-none rounded-xl border border-border-subtle bg-surface-base px-3 py-2.5",
                "text-body-sm text-content-primary placeholder:text-content-tertiary outline-none",
                "focus:border-primary/50 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]",
                "transition-shadow",
              )}
            />
          </div>

          {/* Back */}
          <div className="space-y-1.5">
            <label className="block text-caption-xs font-semibold uppercase tracking-wide text-content-tertiary">
              {t("backLabel", locale)}
            </label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={8}
              className={cn(
                "w-full resize-none rounded-xl border border-border-subtle bg-surface-base px-3 py-2.5",
                "text-body-sm font-mono text-content-primary placeholder:text-content-tertiary outline-none",
                "focus:border-primary/50 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]",
                "transition-shadow",
              )}
            />
          </div>

          <p className="text-caption-xs text-content-tertiary/60">{t("hint", locale)}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>{t("cancel", locale)}</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!front.trim() || !back.trim() || saving}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {t("save", locale)}
          </Button>
        </div>
      </div>
    </div>
  );
}
