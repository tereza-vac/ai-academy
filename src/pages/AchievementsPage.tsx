/**
 * AchievementsPage — visual gallery of all 20 achievements.
 *
 * Shows earned (with unlock date) and locked (with progress hint) achievements.
 * Grouped by category with a stats bar at the top.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Award, CheckCircle2, Lock, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ACHIEVEMENTS,
  getEarnedIds,
  type Achievement,
  type AchievementCategory,
} from "@/services/achievements";
import { useLocaleStore, selectLocale } from "@/stores/localeStore";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch { return iso.slice(0, 10); }
}

const CATEGORY_META: Record<AchievementCategory, { label: { cs: string; en: string }; color: string }> = {
  learning: { label: { cs: "Učení",    en: "Learning"  }, color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-400/20" },
  mastery:  { label: { cs: "Mistrovství", en: "Mastery" }, color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-400/20" },
  streak:   { label: { cs: "Série",    en: "Streaks"   }, color: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-400/20" },
  tools:    { label: { cs: "Nástroje", en: "Tools"     }, color: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-400/20" },
};

/* ─── Single achievement card ────────────────────────────────────────────── */

function AchievementCard({
  achievement,
  earned,
  earnedAt,
  locale,
}: {
  achievement: Achievement;
  earned: boolean;
  earnedAt?: string;
  locale: string;
}) {
  const title = achievement.title[locale as "cs" | "en"] ?? achievement.title.en;
  const desc  = achievement.description[locale as "cs" | "en"] ?? achievement.description.en;
  const catMeta = CATEGORY_META[achievement.category];

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all",
        earned
          ? "border-border-subtle bg-surface-elevated shadow-elevation-sm"
          : "border-dashed border-border-subtle bg-surface-base opacity-60",
      )}
    >
      {/* Earned badge */}
      {earned && (
        <div className="absolute -top-2.5 -right-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/20" />
        </div>
      )}

      {/* Emoji */}
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl text-3xl transition-all",
          earned ? "shadow-elevation-sm" : "grayscale",
          earned ? `bg-gradient-to-br from-white/20 to-transparent border border-white/10 dark:border-white/5` : "bg-surface-base",
        )}
      >
        {earned ? achievement.emoji : <Lock className="h-6 w-6 text-content-tertiary/40" />}
      </div>

      {/* Category chip */}
      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", catMeta.color)}>
        {catMeta.label[locale as "cs" | "en"] ?? catMeta.label.en}
      </span>

      <div className="space-y-0.5">
        <p className={cn("text-body-sm font-bold leading-tight", earned ? "text-content-primary" : "text-content-tertiary")}>
          {earned ? title : "???"}
        </p>
        <p className="text-caption-xs text-content-tertiary/70 leading-snug line-clamp-3">
          {earned ? desc : locale === "cs" ? "Ještě nezískaný úspěch" : "Not yet unlocked"}
        </p>
      </div>

      {/* Unlock date */}
      {earned && earnedAt && (
        <p className="text-[10px] text-content-tertiary/50 mt-auto pt-1">
          Unlocked {formatDate(earnedAt)}
        </p>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export function Component() {
  const locale = useLocaleStore(selectLocale);
  const earnedIds = useMemo(() => getEarnedIds(), []);
  const totalEarned = earnedIds.size;
  const totalAll = ACHIEVEMENTS.length;
  const pct = Math.round((totalEarned / totalAll) * 100);

  const categories: AchievementCategory[] = ["learning", "mastery", "streak", "tools"];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Your milestones"
        title="Achievements"
        description="Track your learning milestones across studying, streaks, mastery, and tools."
      />

      {/* Stats bar */}
      <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-6">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div className="text-center space-y-1">
            <p className="text-display-sm font-bold text-content-primary">{totalEarned}</p>
            <p className="text-caption-xs text-content-tertiary">
              {locale === "cs" ? "získaných" : "unlocked"}
            </p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-display-sm font-bold text-content-secondary">{totalAll - totalEarned}</p>
            <p className="text-caption-xs text-content-tertiary">
              {locale === "cs" ? "zbývá" : "remaining"}
            </p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-display-sm font-bold text-primary">{pct}%</p>
            <p className="text-caption-xs text-content-tertiary">
              {locale === "cs" ? "celkové skóre" : "completion"}
            </p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-display-sm font-bold text-amber-600 dark:text-amber-400">
              {totalEarned > 0 ? "🏆" : "–"}
            </p>
            <p className="text-caption-xs text-content-tertiary">
              {locale === "cs" ? "váš rank" : "your rank"}
            </p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-caption-xs text-content-tertiary">
            <span>{totalEarned} / {totalAll} {locale === "cs" ? "úspěchů" : "achievements"}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-border-subtle">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                pct === 100 ? "bg-gradient-to-r from-amber-500 to-emerald-500" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/tutor" className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-caption-xs text-primary hover:bg-primary/10 transition-colors">
            <Award className="h-3 w-3" />
            {locale === "cs" ? "Začít studovat" : "Start studying"}
          </Link>
          <Link to="/progress" className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-base px-3 py-1 text-caption-xs text-content-secondary hover:text-content-primary transition-colors">
            <TrendingUp className="h-3 w-3" />
            {locale === "cs" ? "Pokrok" : "Progress dashboard"}
          </Link>
        </div>
      </div>

      {/* Per-category grids */}
      {categories.map((category) => {
        const catAchievements = ACHIEVEMENTS.filter((a) => a.category === category);
        const catEarned = catAchievements.filter((a) => earnedIds.has(a.id)).length;
        const catMeta = CATEGORY_META[category];

        return (
          <section key={category} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-heading-sm font-bold text-content-primary">
                {catMeta.label[locale as "cs" | "en"] ?? catMeta.label.en}
              </h2>
              <Badge variant="muted" className="text-caption-xs">
                {catEarned}/{catAchievements.length}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {catAchievements.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  earned={earnedIds.has(achievement.id)}
                  locale={locale}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default Component;
