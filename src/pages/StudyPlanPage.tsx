/**
 * StudyPlanPage — view and manage AI-generated personalized study plans.
 *
 * Shows a list of plans; clicking one reveals its full content as a
 * richly formatted checklist with concept deep-links to the AI Tutor.
 */
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Download,
  MapPin,
  MessageSquareText,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  listPlans,
  deletePlan,
  toggleItem,
  type StudyPlan,
} from "@/services/studyPlan";
import { StudyPlanModal } from "@/components/tutor/StudyPlanModal";
import { TutorMessageContent } from "@/components/tutor/TutorMessageContent";
import { exportStudyPlanMarkdown } from "@/lib/exportUtils";
import { useLocaleStore, selectLocale } from "@/stores/localeStore";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" })
      .format(new Date(iso));
  } catch { return iso.slice(0, 10); }
}

function planProgress(plan: StudyPlan): { done: number; total: number; pct: number } {
  const total = plan.items.length;
  const done  = plan.items.filter((i) => i.done).length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

/* ─── Plan card (collapsed list item) ───────────────────────────────────── */

function PlanCard({
  plan, onOpen, onDelete,
}: {
  plan: StudyPlan;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { done, total, pct } = planProgress(plan);

  return (
    <div
      className="group rounded-2xl border border-border-subtle bg-surface-base p-5 cursor-pointer hover:border-border-strong hover:bg-surface-elevated transition-all"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-body-md font-semibold text-content-primary line-clamp-2 group-hover:text-primary transition-colors">
              {plan.goal}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-caption-xs text-content-tertiary">
            <Badge variant="muted">{plan.background}</Badge>
            <span>{plan.daysPerWeek}d/week · {plan.weeksTotal}w</span>
            <span>·</span>
            <span>{formatDate(plan.generatedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ChevronRight className="h-4 w-4 text-content-tertiary group-hover:text-primary transition-colors" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="ml-1 rounded-lg p-1 text-content-tertiary/50 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-caption-xs text-content-tertiary/70">
            <span>{done}/{total} tasks</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                pct === 100 ? "bg-emerald-500" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Full plan view ─────────────────────────────────────────────────────── */

function PlanView({
  plan: initialPlan, onBack, locale,
}: {
  plan: StudyPlan;
  onBack: () => void;
  locale: string;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [showContent, setShowContent] = useState(false);
  const { done, total, pct } = planProgress(plan);

  const handleToggle = useCallback((itemId: string) => {
    const updated = toggleItem(plan.id, itemId);
    if (updated) setPlan(updated);
  }, [plan.id]);

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="text-caption-xs text-content-tertiary hover:text-primary transition-colors flex items-center gap-1 mb-1"
          >
            ← {locale === "cs" ? "Zpět na plány" : "Back to plans"}
          </button>
          <h2 className="text-heading-md font-bold text-content-primary">{plan.goal}</h2>
          <div className="flex items-center gap-2 text-caption-xs text-content-tertiary">
            <Badge variant="muted">{plan.background}</Badge>
            <span>{plan.daysPerWeek}d/week · {plan.weeksTotal} week{plan.weeksTotal !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span>Generated {formatDate(plan.generatedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => exportStudyPlanMarkdown(plan)}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Link to={`/tutor`}>
            <Button size="sm" variant="outline">
              <MessageSquareText className="h-3.5 w-3.5" />
              Open Tutor
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface-base p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-semibold text-content-primary">
              {pct === 100
                ? (locale === "cs" ? "🎉 Plán dokončen!" : "🎉 Plan complete!")
                : `${done} of ${total} tasks completed`}
            </span>
            <span className={cn("text-body-sm font-bold", pct === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-primary")}>
              {pct}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-border-subtle">
            <div
              className={cn("h-full rounded-full transition-all duration-500", pct === 100 ? "bg-emerald-500" : "bg-primary")}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist */}
      {plan.items.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-caption-xs font-semibold uppercase tracking-widest text-content-tertiary">
            {locale === "cs" ? "Úkoly" : "Tasks"}
          </h3>
          {plan.items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all",
                item.done
                  ? "border-emerald-400/20 bg-emerald-50/50 dark:bg-emerald-950/10"
                  : "border-border-subtle bg-surface-base hover:border-border-strong hover:bg-surface-elevated",
              )}
              onClick={() => handleToggle(item.id)}
            >
              {item.done
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                : <Circle className="h-4 w-4 text-content-tertiary/50 shrink-0 mt-0.5" />
              }
              <span className={cn(
                "flex-1 text-body-sm leading-relaxed",
                item.done ? "line-through text-content-tertiary/60" : "text-content-primary",
              )}>
                {item.text}
              </span>
              {item.conceptId && !item.done && (
                <Link
                  to={`/tutor?conceptId=${encodeURIComponent(item.conceptId)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/10 transition-colors"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  Study
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Full AI content toggle */}
      <div className="rounded-xl border border-border-subtle overflow-hidden">
        <button
          type="button"
          onClick={() => setShowContent((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 bg-surface-base hover:bg-surface-elevated transition-colors"
        >
          <span className="text-body-sm font-medium text-content-secondary flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" />
            {locale === "cs" ? "Celý plán (AI verze)" : "Full plan (AI output)"}
          </span>
          {showContent ? <ChevronDown className="h-4 w-4 text-content-tertiary" /> : <ChevronRight className="h-4 w-4 text-content-tertiary" />}
        </button>
        {showContent && (
          <div className="px-5 py-4 border-t border-border-subtle bg-surface-base">
            <TutorMessageContent content={plan.content} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export function Component() {
  const locale = useLocaleStore(selectLocale);
  const [plans, setPlans] = useState<StudyPlan[]>(() => listPlans());
  const [showModal, setShowModal] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  const activePlan = useMemo(() => plans.find((p) => p.id === activePlanId) ?? null, [plans, activePlanId]);

  const handleCreated = useCallback((plan: StudyPlan) => {
    setPlans(listPlans());
    setActivePlanId(plan.id);
  }, []);

  const handleDelete = useCallback((id: string) => {
    deletePlan(id);
    setPlans(listPlans());
    if (activePlanId === id) setActivePlanId(null);
  }, [activePlanId]);

  if (activePlan) {
    return (
      <div className="space-y-8">
        <PlanView plan={activePlan} onBack={() => setActivePlanId(null)} locale={locale} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Personalized learning"
        title="Study plans"
        description="AI-generated roadmaps tailored to your goals, background, and schedule."
        actions={
          <Button onClick={() => setShowModal(true)} size="sm">
            <Plus className="h-3.5 w-3.5" />
            {locale === "cs" ? "Nový plán" : "New plan"}
          </Button>
        }
      />

      {plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-base py-16 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <MapPin className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-heading-sm font-semibold text-content-primary">No study plans yet</p>
            <p className="text-body-sm text-content-secondary max-w-sm mx-auto">
              Tell the AI your goal and background. It will create a personalized week-by-week learning roadmap — with specific concepts and guiding questions for each day.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => setShowModal(true)} size="sm">
              <Brain className="h-3.5 w-3.5" />
              {locale === "cs" ? "Vytvořit první plán" : "Create my first plan"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onOpen={() => setActivePlanId(plan.id)}
              onDelete={() => handleDelete(plan.id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <StudyPlanModal
          locale={locale as "cs" | "en"}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

export default Component;
