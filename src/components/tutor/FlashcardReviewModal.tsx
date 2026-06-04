/**
 * FlashcardReviewModal — spaced-repetition review session.
 *
 * Shows cards due today one at a time. Flip to reveal the answer.
 * Three-button rating: Hard / Good / Easy triggers the SM-2 scheduler.
 * Progress bar shows session completion.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { dueCards, reviewCard, type Flashcard, type ReviewGrade } from "@/services/flashcards";
import { recordFlashcardReview } from "@/services/dailyGoals";
import { TutorMessageContent } from "./TutorMessageContent";

interface Props {
  onClose: () => void;
  locale?: "cs" | "en";
}

const L = {
  title: { cs: "Opakování karet", en: "Flashcard review" },
  flip: { cs: "Odkrýt odpověď", en: "Reveal answer" },
  hard: { cs: "Těžké", en: "Hard" },
  good: { cs: "Dobré", en: "Good" },
  easy: { cs: "Lehké", en: "Easy" },
  hardHint: { cs: "Znovu brzy", en: "Review soon" },
  goodHint: { cs: "6 dní", en: "6 days" },
  easyHint: { cs: "Delší interval", en: "Longer interval" },
  doneTitle: { cs: "Skvělá práce!", en: "All done!" },
  doneBody: { cs: "Prošel jsi všechny kartičky na dnešek.", en: "You've reviewed all cards due today." },
  cardOf: { cs: "z", en: "of" },
  question: { cs: "Otázka", en: "Question" },
  answer: { cs: "Odpověď", en: "Answer" },
  noDue: { cs: "Žádné kartičky k opakování dnes.", en: "No cards due for review today." },
};
const t = (k: keyof typeof L, locale = "en") =>
  L[k][locale as "cs" | "en"] ?? L[k]["en"];

/* ─── Flip card animation ─────────────────────────────────────────────────── */

function FlipCard({
  card, flipped, onFlip, locale,
}: {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
  locale: string;
}) {
  return (
    <div
      className="relative w-full cursor-pointer select-none"
      style={{ perspective: "1000px" }}
      onClick={!flipped ? onFlip : undefined}
    >
      <div
        className="relative w-full transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front */}
        <div
          className="min-h-[200px] rounded-2xl border border-border-subtle bg-surface-elevated p-6 flex flex-col items-center justify-center gap-4"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="text-caption-xs uppercase tracking-widest text-content-tertiary">
            {t("question", locale)}
          </span>
          <p className="text-center text-heading-sm font-semibold text-content-primary leading-relaxed">
            {card.front}
          </p>
          {!flipped && (
            <button
              type="button"
              onClick={onFlip}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-body-sm text-primary hover:bg-primary/10 transition-colors"
            >
              {t("flip", locale)} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 min-h-[200px] rounded-2xl border border-primary/20 bg-surface-base p-6 overflow-y-auto"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <span className="text-caption-xs uppercase tracking-widest text-content-tertiary block mb-3">
            {t("answer", locale)}
          </span>
          <TutorMessageContent content={card.back} />
        </div>
      </div>
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export function FlashcardReviewModal({ onClose, locale = "en" }: Props) {
  const initialCards = useMemo(() => dueCards(), []);
  const [queue] = useState<Flashcard[]>(initialCards);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [done, setDone] = useState(false);

  const current = queue[currentIdx];
  const total = initialCards.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " " && current && !flipped) { e.preventDefault(); setFlipped(true); }
      if (current && flipped) {
        if (e.key === "1") grade(0);
        if (e.key === "2") grade(1);
        if (e.key === "3") grade(2);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, flipped, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const grade = useCallback((g: ReviewGrade) => {
    if (!current) return;
    reviewCard(current.id, g);
    recordFlashcardReview();
    setReviewed((r) => r + 1);
    setFlipped(false);
    const next = currentIdx + 1;
    if (next >= queue.length) {
      setDone(true);
    } else {
      setCurrentIdx(next);
    }
  }, [current, currentIdx, queue.length]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
    >
      <div className="w-full max-w-lg flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-body-sm font-semibold text-content-primary">{t("title", locale)}</span>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg p-1.5 text-content-tertiary hover:bg-surface-hover hover:text-content-secondary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        {total > 0 && !done && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-caption-xs text-content-tertiary">
              <span>{reviewed} {t("cardOf", locale)} {total}</span>
              <span>{Math.round((reviewed / total) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(reviewed / total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* No cards due */}
        {total === 0 && (
          <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-8 text-center space-y-3">
            <Check className="mx-auto h-10 w-10 text-success" />
            <p className="text-body-md font-medium text-content-primary">{t("noDue", locale)}</p>
            <Button onClick={onClose} size="sm">Close</Button>
          </div>
        )}

        {/* Done screen */}
        {done && (
          <div className="rounded-2xl border border-success/30 bg-success/5 p-8 text-center space-y-3">
            <span className="text-5xl">🎉</span>
            <p className="text-heading-sm font-semibold text-content-primary">{t("doneTitle", locale)}</p>
            <p className="text-body-sm text-content-secondary">{t("doneBody", locale)}</p>
            <Button onClick={onClose} size="sm">Close</Button>
          </div>
        )}

        {/* Card */}
        {!done && current && (
          <>
            <FlipCard card={current} flipped={flipped} onFlip={() => setFlipped(true)} locale={locale} />

            {/* Grade buttons */}
            {flipped && (
              <div className="grid grid-cols-3 gap-3">
                {([
                  { grade: 0 as ReviewGrade, label: t("hard", locale), hint: t("hardHint", locale), color: "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10", key: "1" },
                  { grade: 1 as ReviewGrade, label: t("good", locale), hint: t("goodHint", locale), color: "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10", key: "2" },
                  { grade: 2 as ReviewGrade, label: t("easy", locale), hint: t("easyHint", locale), color: "border-success/40 bg-success/5 text-success hover:bg-success/10", key: "3" },
                ] as const).map((btn) => (
                  <button
                    key={btn.key}
                    type="button"
                    onClick={() => grade(btn.grade)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-xl border px-3 py-2.5 transition-all",
                      btn.color,
                      "outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
                    )}
                  >
                    <span className="text-body-sm font-semibold">{btn.label}</span>
                    <span className="text-[10px] opacity-70">{btn.hint}</span>
                    <kbd className="text-[9px] border border-current/20 rounded px-1 opacity-40">{btn.key}</kbd>
                  </button>
                ))}
              </div>
            )}

            {/* Keyboard hints */}
            <p className="text-center text-[10px] text-content-tertiary/50">
              {flipped ? "1 Hard · 2 Good · 3 Easy" : "Space to flip · Esc to exit"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
