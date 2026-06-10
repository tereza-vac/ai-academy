/**
 * FlashcardsPage — full management view for all saved flashcards.
 *
 * Shows cards grouped by concept, live stats (total, due, mastered),
 * inline editing, deletion, and a "Review due" shortcut.
 */
import { useCallback, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  GraduationCap,
  Pencil,
  Save,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  listCards,
  deleteCard,
  updateCard,
  dueCount,
  type Flashcard,
} from "@/services/flashcards";
import { FlashcardReviewModal } from "@/components/tutor/FlashcardReviewModal";
import { exportFlashcardsCSV, exportFlashcardsAnki } from "@/lib/exportUtils";
import { openChat } from "@/stores/chatWidgetStore";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(iso));
  } catch { return iso.slice(0, 10); }
}

function isDue(card: Flashcard): boolean {
  return card.dueDate <= new Date().toISOString().slice(0, 10);
}

type MasteryLabel = "New" | "Learning" | "Review" | "Mastered";

function masteryLabel(card: Flashcard): MasteryLabel {
  if (card.repetitions === 0) return "New";
  if (card.repetitions < 3) return "Learning";
  if (card.interval < 21) return "Review";
  return "Mastered";
}

const MASTERY_STYLES: Record<MasteryLabel, string> = {
  New:      "border-primary/30 bg-brand-soft text-primary",
  Learning: "border-[hsl(var(--premium))]/40 bg-premium-soft text-[hsl(var(--premium))]",
  Review:   "border-[hsl(var(--warning))]/40 bg-warning-soft text-[hsl(var(--warning))]",
  Mastered: "border-[hsl(var(--success))]/40 bg-success-soft text-[hsl(var(--success))]",
};

/* ─── Inline editable card ───────────────────────────────────────────────── */

function CardRow({ card, onDeleted, onUpdated }: {
  card: Flashcard;
  onDeleted: (id: string) => void;
  onUpdated: (id: string, front: string, back: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);

  const label = masteryLabel(card);
  const due = isDue(card);

  const save = useCallback(() => {
    updateCard(card.id, { front, back });
    onUpdated(card.id, front, back);
    setEditing(false);
  }, [card.id, front, back, onUpdated]);

  const cancel = useCallback(() => {
    setFront(card.front);
    setBack(card.back);
    setEditing(false);
  }, [card.front, card.back]);

  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      due ? "border-[hsl(var(--premium))]/30 bg-premium-soft/50" : "border-border-subtle bg-surface-base",
    )}>
      {/* Summary row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => { if (!editing) setExpanded((e) => !e); }}
      >
        <button type="button" className="shrink-0 text-content-tertiary hover:text-content-primary transition-colors">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        <p className="flex-1 truncate text-body-sm font-medium text-content-primary">
          {card.front}
        </p>

        <div className="flex items-center gap-2 shrink-0">
          {due && (
            <span className="inline-flex items-center gap-1 rounded-full bg-premium-soft border border-[hsl(var(--premium))]/40 px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--premium))]">
              Due
            </span>
          )}
          <span className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
            MASTERY_STYLES[label],
          )}>
            {label}
          </span>
          <span className="text-caption-xs text-content-tertiary/70">
            {due ? "Due now" : `Due ${formatDate(card.dueDate)}`}
          </span>
        </div>

        {/* Actions (stop propagation) */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {editing ? (
            <>
              <button type="button" onClick={save}
                className="rounded-lg p-1.5 text-success hover:bg-success/10 transition-colors" title="Save">
                <Save className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={cancel}
                className="rounded-lg p-1.5 text-content-tertiary hover:bg-surface-hover transition-colors" title="Cancel">
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setExpanded(true); setEditing(true); }}
                className="rounded-lg p-1.5 text-content-tertiary hover:bg-surface-hover hover:text-content-primary transition-colors" title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onDeleted(card.id)}
                className="rounded-lg p-1.5 text-content-tertiary hover:bg-destructive/10 hover:text-destructive transition-colors" title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border-subtle/50 px-4 pb-4 pt-3 space-y-3">
          {editing ? (
            <>
              <div className="space-y-1">
                <label className="text-caption-xs font-semibold uppercase tracking-wide text-content-tertiary">Front</label>
                <textarea
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border-subtle bg-surface-elevated px-3 py-2 text-body-sm text-content-primary outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)] transition-shadow"
                />
              </div>
              <div className="space-y-1">
                <label className="text-caption-xs font-semibold uppercase tracking-wide text-content-tertiary">Back</label>
                <textarea
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  rows={6}
                  className="w-full resize-none rounded-lg border border-border-subtle bg-surface-elevated px-3 py-2 font-mono text-body-sm text-content-primary outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)] transition-shadow"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <span className="text-caption-xs font-semibold uppercase tracking-wide text-content-tertiary">Answer</span>
                <p className="text-body-sm text-content-secondary whitespace-pre-wrap line-clamp-6">{card.back}</p>
              </div>
              <div className="flex items-center gap-4 text-caption-xs text-content-tertiary/70">
                <span>Reps: <strong className="text-content-tertiary">{card.repetitions}</strong></span>
                <span>Interval: <strong className="text-content-tertiary">{card.interval}d</strong></span>
                {card.lastReviewed && <span>Last: <strong className="text-content-tertiary">{formatDate(card.lastReviewed)}</strong></span>}
                <span>Created: <strong className="text-content-tertiary">{formatDate(card.createdAt)}</strong></span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Concept group ──────────────────────────────────────────────────────── */

function ConceptGroup({ label, cards, onDeleted, onUpdated }: {
  label: string;
  cards: Flashcard[];
  onDeleted: (id: string) => void;
  onUpdated: (id: string, front: string, back: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const due = cards.filter(isDue).length;

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-content-tertiary" /> : <ChevronRight className="h-3.5 w-3.5 text-content-tertiary" />}
        <h3 className="text-body-sm font-semibold text-content-primary">{label}</h3>
        <span className="text-caption-xs text-content-tertiary">({cards.length})</span>
        {due > 0 && (
          <span className="ml-1 rounded-full bg-premium-soft border border-[hsl(var(--premium))]/40 px-1.5 py-0.5 text-[10px] font-bold text-[hsl(var(--premium))]">
            {due} due
          </span>
        )}
      </button>

      {open && (
        <div className="space-y-2 pl-5">
          {cards.map((c) => (
            <CardRow key={c.id} card={c} onDeleted={onDeleted} onUpdated={onUpdated} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Stat card ─────────────────────────────────────────────────────────── */

function Stat({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-base px-4 py-3 space-y-0.5">
      <p className="text-caption-xs font-semibold uppercase tracking-widest text-content-tertiary">{label}</p>
      <p className={cn("text-heading-md font-bold", accent ?? "text-content-primary")}>{value}</p>
      {sub && <p className="text-caption-xs text-content-tertiary/70">{sub}</p>}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export function Component() {
  const [cards, setCards] = useState<Flashcard[]>(() => listCards());
  const [showReview, setShowReview] = useState(false);

  const handleDeleted = useCallback((id: string) => {
    deleteCard(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleUpdated = useCallback((id: string, front: string, back: string) => {
    setCards((prev) => prev.map((c) => c.id === id ? { ...c, front, back } : c));
  }, []);

  // Group by concept
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; cards: Flashcard[] }>();
    for (const c of cards) {
      const key = c.conceptId ?? "__misc__";
      const label = c.conceptLabel ?? "Miscellaneous";
      if (!map.has(key)) map.set(key, { label, cards: [] });
      map.get(key)!.cards.push(c);
    }
    return Array.from(map.entries()).map(([key, g]) => ({ key, ...g }));
  }, [cards]);

  // Stats
  const due = useMemo(() => dueCount(), [cards]); // eslint-disable-line react-hooks/exhaustive-deps
  const mastered = cards.filter((c) => masteryLabel(c) === "Mastered").length;
  const learning = cards.filter((c) => masteryLabel(c) === "Learning").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Learning tools"
        title="Flashcards"
        description="All your saved cards — review with spaced repetition to retain knowledge long-term."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {cards.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => exportFlashcardsCSV(cards)}>
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportFlashcardsAnki(cards)}>
                  <Download className="h-3.5 w-3.5" />
                  Anki
                </Button>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => openChat()}>
              <BookOpen className="h-3.5 w-3.5" />
              AI Tutor
            </Button>
            {due > 0 && (
              <Button size="sm" onClick={() => setShowReview(true)}>
                <Zap className="h-3.5 w-3.5" />
                Review {due} due
              </Button>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total cards" value={cards.length} />
        <Stat label="Due today"   value={due}      accent={due > 0 ? "text-[hsl(var(--premium))]" : undefined} sub={due > 0 ? "Review now" : "All clear!"} />
        <Stat label="Learning"    value={learning} sub="in progress" />
        <Stat label="Mastered"    value={mastered} accent="text-[hsl(var(--success))]" sub="interval \u2265 21d" />
      </div>

      {/* Empty state */}
      {cards.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-base px-8 py-16 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-body-md font-semibold text-content-primary">No flashcards yet</p>
            <p className="text-body-sm text-content-secondary max-w-xs mx-auto">
              While chatting with the AI Tutor, click the <strong>Flashcard</strong> button on any response to save it for later review.
            </p>
          </div>
          <Button size="sm" onClick={() => openChat()}>
            <BookOpen className="h-3.5 w-3.5" />
            Open AI Tutor
          </Button>
        </div>
      )}

      {/* Groups */}
      {groups.length > 0 && (
        <div className="space-y-8">
          {groups.map(({ key, label, cards: groupCards }) => (
            <ConceptGroup
              key={key}
              label={label}
              cards={groupCards}
              onDeleted={handleDeleted}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}

      {/* SM-2 explainer */}
      {cards.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface-base px-4 py-3 flex items-start gap-3">
          <Check className="h-4 w-4 text-content-tertiary mt-0.5 shrink-0" />
          <p className="text-caption-xs text-content-tertiary/80">
            Cards use <strong className="text-content-tertiary">spaced repetition (SM-2)</strong>: rating a card Easy doubles its interval, Good maintains it, Hard resets it to tomorrow. Cards become "Mastered" after 3+ successful reviews with an interval of 21+ days.
          </p>
        </div>
      )}

      {showReview && (
        <FlashcardReviewModal
          onClose={() => { setShowReview(false); setCards(listCards()); }}
        />
      )}
    </div>
  );
}

export default Component;
