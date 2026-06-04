/**
 * ProgressPage — comprehensive learning analytics dashboard.
 *
 * Shows: streak calendar, domain mastery breakdown, concept progress grid,
 * flashcard stats, and recent conversation history.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  GraduationCap,
  MessageSquareText,
  Network,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getAllProgress, masteryLevel, type ConceptProgress } from "@/services/learningProgress";
import { listConversations } from "@/services/conversationHistory";
import { getStreak, getActivityLog } from "@/services/streak";
import { listCards, dueCount } from "@/services/flashcards";
import { listNoteIds } from "@/services/conceptNotes";
import { ALL_NODES, DOMAINS, pickLocaleText } from "@/lib/aiMapData";
import { useLocaleStore, selectLocale } from "@/stores/localeStore";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const addDays = (date: string, n: number): string => {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function formatDate(iso: string): string {
  try { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(iso)); }
  catch { return iso.slice(5); }
}

/* ─── Big stat card ──────────────────────────────────────────────────────── */

function BigStat({
  label, value, icon: Icon, sub, accent = "text-content-primary", href,
}: {
  label: string; value: number | string; icon: React.ComponentType<{ className?: string }>;
  sub?: string; accent?: string; href?: string;
}) {
  const inner = (
    <div className="rounded-2xl border border-border-subtle bg-surface-base px-5 py-4 space-y-2 h-full">
      <div className="flex items-center justify-between">
        <span className="text-caption-xs font-semibold uppercase tracking-widest text-content-tertiary">{label}</span>
        <Icon className="h-4 w-4 text-content-tertiary/50" />
      </div>
      <p className={cn("text-3xl font-black tracking-tight", accent)}>{value}</p>
      {sub && <p className="text-caption-xs text-content-tertiary/70">{sub}</p>}
    </div>
  );
  if (href) return <Link to={href} className="block hover:opacity-90 transition-opacity">{inner}</Link>;
  return inner;
}

/* ─── Streak calendar ────────────────────────────────────────────────────── */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKS = 13; // ~3 months

function StreakCalendar({ log }: { log: Record<string, number> }) {
  const todayStr = today();

  // Build a grid: WEEKS columns × 7 rows (Mon-Sun)
  // Find the most recent Monday
  const todayDate = new Date(todayStr + "T00:00:00");
  const dayOfWeek = (todayDate.getDay() + 6) % 7; // 0=Mon
  const mostRecentMonday = addDays(todayStr, -dayOfWeek);

  // Grid starts WEEKS-1 weeks before most recent Monday
  const gridStart = addDays(mostRecentMonday, -(WEEKS - 1) * 7);

  const cells: Array<{ date: string; count: number; isToday: boolean; isFuture: boolean }> = [];
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const date = addDays(gridStart, w * 7 + d);
      cells.push({
        date,
        count: log[date] ?? 0,
        isToday: date === todayStr,
        isFuture: date > todayStr,
      });
    }
  }

  const maxCount = Math.max(1, ...Object.values(log));

  function cellColor(count: number, isFuture: boolean): string {
    if (isFuture) return "bg-surface-hover";
    if (count === 0) return "bg-border-subtle";
    const intensity = count / maxCount;
    if (intensity > 0.7) return "bg-primary";
    if (intensity > 0.4) return "bg-primary/70";
    return "bg-primary/35";
  }

  return (
    <div className="space-y-2">
      {/* Weekday labels */}
      <div className="flex items-center gap-1.5">
        <div className="w-8" />
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`, flex: 1 }}>
          {/* Month labels above first row of each month */}
        </div>
      </div>

      <div className="flex gap-2 items-start">
        {/* Day labels */}
        <div className="flex flex-col gap-1 pt-0.5">
          {WEEKDAYS.map((d) => (
            <span key={d} className="text-[10px] text-content-tertiary/60 w-7 text-right leading-none" style={{ height: "14px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
              {d.slice(0, 1)}
            </span>
          ))}
        </div>

        {/* Calendar grid */}
        <div
          className="grid gap-1 flex-1"
          style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(7, minmax(0, 1fr))` }}
        >
          {/* Rearrange: we have [w0d0, w0d1, ...w0d6, w1d0, ...] but CSS grid goes column by column */}
          {Array.from({ length: WEEKS }, (_, w) =>
            Array.from({ length: 7 }, (_, d) => {
              const cell = cells[w * 7 + d];
              return (
                <div
                  key={cell.date}
                  title={cell.count > 0 ? `${formatDate(cell.date)}: ${cell.count} messages` : formatDate(cell.date)}
                  className={cn(
                    "rounded-sm aspect-square",
                    cellColor(cell.count, cell.isFuture),
                    cell.isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                  )}
                />
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <span className="text-[10px] text-content-tertiary/60">Less</span>
        {["bg-border-subtle", "bg-primary/35", "bg-primary/70", "bg-primary"].map((c) => (
          <div key={c} className={cn("h-3 w-3 rounded-sm", c)} />
        ))}
        <span className="text-[10px] text-content-tertiary/60">More</span>
      </div>
    </div>
  );
}

/* ─── Domain mastery bar ─────────────────────────────────────────────────── */

const DOMAIN_PALETTE: Record<string, string> = {
  "foundations":    "bg-blue-500",
  "ml":             "bg-violet-500",
  "dl":             "bg-purple-500",
  "nlp":            "bg-sky-500",
  "cv":             "bg-cyan-500",
  "rl":             "bg-amber-500",
  "agents":         "bg-orange-500",
  "engineering":    "bg-emerald-500",
  "ethics":         "bg-rose-500",
};

function DomainRow({
  domain, total, studied, mastered, locale,
}: {
  domain: { id: string; label: { cs: string; en: string } };
  total: number; studied: number; mastered: number; locale: string;
}) {
  const pct = total > 0 ? (studied / total) * 100 : 0;
  const label = pickLocaleText(domain.label, locale as "cs" | "en");
  const barColor = DOMAIN_PALETTE[domain.id] ?? "bg-primary";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-sm font-medium text-content-primary truncate">{label}</span>
        <span className="text-caption-xs text-content-tertiary shrink-0">
          {studied}/{total} concepts
          {mastered > 0 && <span className="text-emerald-600 dark:text-emerald-400 ml-1">· {mastered} ✓</span>}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border-subtle">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Concept mastery grid ───────────────────────────────────────────────── */

const MASTERY_COLORS = [
  "",                   // 0 = not studied (hidden)
  "border-sky-400/40 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400",
  "border-violet-400/40 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400",
  "border-emerald-400/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
] as const;

const MASTERY_ICONS = [null, null, Star, CheckCircle2] as const;
const MASTERY_LABELS = ["", "Explored", "Proficient", "Mastered"] as const;

function ConceptGrid({ progress, locale }: { progress: ConceptProgress[]; locale: string }) {
  const withMastery = progress.map((p) => ({ p, lvl: masteryLevel(p) })).sort((a, b) => b.lvl - a.lvl || b.p.messageCount - a.p.messageCount);

  if (withMastery.length === 0) {
    return <p className="text-body-sm text-content-tertiary/70">No concepts studied yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {withMastery.map(({ p, lvl }) => {
        const node = ALL_NODES.find((n) => n.id === p.conceptId);
        const label = node ? pickLocaleText(node.label, locale as "cs" | "en") : p.conceptId;
        const Icon = MASTERY_ICONS[lvl];
        return (
          <Link
            key={p.conceptId}
            to={`/tutor?conceptId=${encodeURIComponent(p.conceptId)}`}
            title={`${MASTERY_LABELS[lvl]} · ${p.messageCount} messages`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-caption-xs font-medium transition-opacity hover:opacity-80",
              MASTERY_COLORS[lvl] || "border-border-subtle bg-surface-base text-content-tertiary",
            )}
          >
            {Icon && <Icon className="h-3 w-3" />}
            {label}
          </Link>
        );
      })}
    </div>
  );
}

/* ─── Recent conversations ───────────────────────────────────────────────── */

function RecentConversations() {
  const conversations = useMemo(() => listConversations().slice(0, 8), []);

  if (conversations.length === 0) {
    return <p className="text-body-sm text-content-tertiary/70">No conversations yet.</p>;
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv) => (
        <Link
          key={conv.id}
          to={`/tutor?resume=${encodeURIComponent(conv.id)}`}
          className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-base px-4 py-3 hover:border-border-strong hover:bg-surface-elevated transition-all group"
        >
          <MessageSquareText className="h-4 w-4 text-content-tertiary/60 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-body-sm font-medium text-content-primary truncate group-hover:text-primary transition-colors">
                {conv.conceptLabel ?? "General chat"}
              </p>
              <span className="text-caption-xs text-content-tertiary/60 shrink-0">
                {formatDate(conv.updatedAt)}
              </span>
            </div>
            {conv.preview && (
              <p className="text-caption-xs text-content-tertiary/70 truncate mt-0.5">{conv.preview}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export function Component() {
  const locale = useLocaleStore(selectLocale);

  const progress     = useMemo(() => getAllProgress(), []);
  const streak       = useMemo(() => getStreak(), []);
  const activityLog  = useMemo(() => getActivityLog(91), []);
  const conversations = useMemo(() => listConversations(), []);
  const cards        = useMemo(() => listCards(), []);
  const noteIds      = useMemo(() => listNoteIds(), []);
  const due          = useMemo(() => dueCount(), []);

  // Mastery breakdown
  const masteredCount  = progress.filter((p) => masteryLevel(p) === 3).length;
  const proficientCount = progress.filter((p) => masteryLevel(p) === 2).length;
  const exploredCount  = progress.filter((p) => masteryLevel(p) === 1).length;
  const totalMessages  = progress.reduce((s, p) => s + p.messageCount, 0);

  // Domain breakdown
  const domainStats = useMemo(() => {
    return DOMAINS.map((domain) => {
      const domainConcepts = ALL_NODES.filter(
        (n) => n.domain === domain.id && n.id !== domain.id,
      );
      const studiedInDomain = domainConcepts.filter((n) =>
        progress.some((p) => p.conceptId === n.id),
      );
      const masteredInDomain = studiedInDomain.filter((n) => {
        const p = progress.find((pp) => pp.conceptId === n.id);
        return p ? masteryLevel(p) >= 2 : false;
      });
      return {
        domain,
        total: domainConcepts.length,
        studied: studiedInDomain.length,
        mastered: masteredInDomain.length,
      };
    }).filter((d) => d.total > 0).sort((a, b) => b.studied - a.studied);
  }, [progress]);

  const totalConcepts = ALL_NODES.filter((n) => !DOMAINS.some((d) => d.id === n.id)).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analytics"
        title="Learning progress"
        description="A bird's-eye view of your AI learning journey."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/map"><Network className="h-3.5 w-3.5" /> AI Map</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/tutor"><Sparkles className="h-3.5 w-3.5" /> Open Tutor</Link>
            </Button>
          </div>
        }
      />

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BigStat
          label="Current streak"
          value={streak?.currentStreak ?? 0}
          icon={Zap}
          sub={`Longest: ${streak?.longestStreak ?? 0} days`}
          accent={(streak?.currentStreak ?? 0) > 0 ? "text-orange-500" : "text-content-primary"}
        />
        <BigStat
          label="Concepts studied"
          value={progress.length}
          icon={Brain}
          sub={`of ${totalConcepts} total`}
          href="/map"
        />
        <BigStat
          label="Total messages"
          value={totalMessages}
          icon={MessageSquareText}
          sub={`${conversations.length} conversations`}
          href="/tutor"
        />
        <BigStat
          label="Flashcards"
          value={cards.length}
          icon={GraduationCap}
          sub={due > 0 ? `${due} due today` : "All reviewed!"}
          accent={due > 0 ? "text-orange-500" : "text-content-primary"}
          href="/flashcards"
        />
      </div>

      {/* Streak calendar */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Activity — last 3 months
            </CardTitle>
            <div className="flex items-center gap-3 text-caption-xs text-content-tertiary">
              {streak && (
                <>
                  <span>🔥 {streak.currentStreak}-day streak</span>
                  <span>·</span>
                  <span>{streak.totalActiveDays} total active days</span>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StreakCalendar log={activityLog} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mastery breakdown */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Mastery levels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Donut-like stat row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Mastered", value: masteredCount, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
                { label: "Proficient", value: proficientCount, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30" },
                { label: "Explored", value: exploredCount, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/30" },
              ].map((s) => (
                <div key={s.label} className={cn("rounded-xl py-3 px-2", s.bg)}>
                  <p className={cn("text-2xl font-black", s.color)}>{s.value}</p>
                  <p className="text-caption-xs text-content-tertiary">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {progress.length > 0 && (
              <div className="space-y-1">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-border-subtle">
                  {masteredCount > 0 && (
                    <div className="bg-emerald-500" style={{ width: `${(masteredCount / totalConcepts) * 100}%` }} />
                  )}
                  {proficientCount > 0 && (
                    <div className="bg-violet-500" style={{ width: `${(proficientCount / totalConcepts) * 100}%` }} />
                  )}
                  {exploredCount > 0 && (
                    <div className="bg-sky-500" style={{ width: `${(exploredCount / totalConcepts) * 100}%` }} />
                  )}
                </div>
                <p className="text-caption-xs text-content-tertiary/70 text-right">
                  {((progress.length / totalConcepts) * 100).toFixed(0)}% of the AI Map explored
                </p>
              </div>
            )}

            {/* Notes & more */}
            {noteIds.length > 0 && (
              <div className="rounded-lg border border-amber-400/25 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2 flex items-center justify-between">
                <span className="text-body-sm text-content-secondary">📝 Notes saved</span>
                <span className="text-body-sm font-semibold text-amber-700 dark:text-amber-400">{noteIds.length} topics</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Domain breakdown */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" />
              Domain coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {domainStats.length > 0 ? (
              domainStats.map(({ domain, total, studied, mastered }) => (
                <DomainRow
                  key={domain.id}
                  domain={domain as { id: string; label: { cs: string; en: string } }}
                  total={total}
                  studied={studied}
                  mastered={mastered}
                  locale={locale}
                />
              ))
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-body-sm text-content-tertiary">No domains explored yet.</p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/map"><Network className="h-3.5 w-3.5" /> Explore the AI Map</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Studied concepts grid */}
      {progress.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Studied concepts
              <span className="ml-1 text-body-sm font-normal text-content-tertiary">— click any to resume in AI Tutor</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConceptGrid progress={progress} locale={locale} />
          </CardContent>
        </Card>
      )}

      {/* Recent conversations */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-primary" />
              Recent conversations
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/tutor">View all</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <RecentConversations />
        </CardContent>
      </Card>

      {/* Empty state */}
      {progress.length === 0 && conversations.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-base py-16 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Brain className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-heading-sm font-semibold text-content-primary">Start your learning journey</p>
            <p className="text-body-sm text-content-secondary max-w-sm mx-auto">
              Chat with the AI Tutor about any concept and your progress will appear here automatically.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/map">Explore AI Map</Link></Button>
            <Button asChild size="sm"><Link to="/tutor">Open AI Tutor</Link></Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Component;
