/**
 * DailyGoalsWidget — compact daily goal tracker for the homepage.
 *
 * Shows three goal bars (messages, concepts, flashcards), a completion
 * count badge, and a settings link to adjust the targets.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Target, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGoalStatuses, getGoalConfig, allGoalsDone, type GoalStatus } from "@/services/dailyGoals";

interface Props {
  locale?: string;
}

function GoalBar({ goal, locale }: { goal: GoalStatus; locale: string }) {
  const label = goal.label[locale as "cs" | "en"] ?? goal.label.en;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-caption-xs">
        <span className={cn("font-medium", goal.done ? "text-emerald-600 dark:text-emerald-400" : "text-content-secondary")}>
          {label}
        </span>
        <span className={cn("tabular-nums", goal.done ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-content-tertiary")}>
          {goal.current}/{goal.target}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            goal.done ? "bg-emerald-500" : "bg-primary",
          )}
          style={{ width: `${goal.pct}%` }}
        />
      </div>
    </div>
  );
}

export function DailyGoalsWidget({ locale = "en" }: Props) {
  const [expanded, setExpanded] = useState(true);

  const statuses = useMemo(() => getGoalStatuses(), []);
  const config   = useMemo(() => getGoalConfig(), []);
  const done     = useMemo(() => allGoalsDone(), []);
  const doneCount = statuses.filter((g) => g.done).length;

  if (!config.enabled) return null;

  return (
    <div className={cn(
      "rounded-2xl border bg-surface-elevated overflow-hidden transition-all",
      done ? "border-emerald-400/30" : "border-border-subtle",
    )}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            done ? "bg-emerald-500/15" : "bg-primary/10",
          )}>
            {done
              ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              : <Target className="h-3.5 w-3.5 text-primary" />
            }
          </div>
          <span className="text-body-sm font-semibold text-content-primary">
            {locale === "cs" ? "Dnešní cíle" : "Today's goals"}
          </span>
          <span className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
            done
              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : doneCount > 0
                ? "bg-primary/15 text-primary"
                : "bg-border-subtle text-content-tertiary",
          )}>
            {doneCount}/{statuses.length}
          </span>
          {done && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              {locale === "cs" ? "🎉 Splněno!" : "🎉 All done!"}
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-content-tertiary" />
          : <ChevronDown className="h-4 w-4 text-content-tertiary" />
        }
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-border-subtle px-5 pb-4 pt-3 space-y-3">
          {statuses.map((goal, i) => (
            <GoalBar key={i} goal={goal} locale={locale} />
          ))}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <Link to="/tutor" className="text-caption-xs text-primary hover:underline">
              {locale === "cs" ? "Studovat →" : "Start studying →"}
            </Link>
            <Link to="/settings" className="text-caption-xs text-content-tertiary hover:text-content-secondary transition-colors">
              {locale === "cs" ? "Upravit cíle" : "Adjust goals"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
