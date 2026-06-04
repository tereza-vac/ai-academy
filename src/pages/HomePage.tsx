import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Radar as RadarIcon,
  Library as LibraryIcon,
  Brain,
  MapPin,
  MessageSquareText,
  Wrench,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Zap,
  Lightbulb,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listTopics } from "@/services/topicsApi";
import { listRadarItems } from "@/services/radarApi";
import { queryKeys } from "@/lib/queryKeys";
import { useI18nContext } from "@/i18n/i18n-react";
import { useLocaleStore, selectLocale } from "@/stores/localeStore";
import type { TranslationFunctions } from "@/i18n/i18n-types";
import { getAllProgress, masteryLevel } from "@/services/learningProgress";
import { listConversations } from "@/services/conversationHistory";
import { listPins } from "@/services/pinnedMessages";
import { getStreak } from "@/services/streak";
import { ALL_NODES, pickLocaleText } from "@/lib/aiMapData";
import { dueCount } from "@/services/flashcards";
import { listPlans } from "@/services/studyPlan";
import { DailyGoalsWidget } from "@/components/DailyGoalsWidget";

const sections: Array<{
  labelKey: keyof TranslationFunctions["nav"];
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  { labelKey: "learnLink",    href: "/learn",     icon: BookOpen,    description: "A structured map from foundations to agents." },
  { labelKey: "radarLink",    href: "/radar",     icon: RadarIcon,   description: "What dropped this week across research and tools." },
  { labelKey: "libraryLink",  href: "/library",   icon: LibraryIcon, description: "Your saved resources and personal notes." },
  { labelKey: "practiceLink", href: "/practice",  icon: Brain,       description: "Quick quizzes and flashcards per topic." },
  { labelKey: "buildLabLink", href: "/build-lab", icon: Wrench,      description: "Cursor prompts, playbooks, templates, checklists." },
];

/* ─── Concept of the day ─────────────────────────────────────────────────── */

function ConceptOfDayCard({ locale = "en" }: { locale?: string }) {
  const concept = useMemo(() => {
    if (ALL_NODES.length === 0) return null;
    // Deterministic by day-of-year so it changes daily
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
    );
    return ALL_NODES[dayOfYear % ALL_NODES.length];
  }, []);

  const fc = useMemo(() => dueCount(), []);

  if (!concept) return null;

  const label = pickLocaleText(concept.label, locale as "cs" | "en");
  const summary = pickLocaleText(concept.tagline ?? concept.label, locale as "cs" | "en");
  const domain = concept.domain ?? "";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-50/60 via-amber-50/20 to-transparent dark:from-amber-950/20 dark:via-transparent dark:to-transparent p-5">
      {/* Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-caption-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
            {locale === "cs" ? "Koncept dne" : "Concept of the day"}
          </span>
        </div>
        {fc > 0 && (
          <Link to="/tutor" className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 px-2.5 py-0.5 text-caption-xs text-orange-700 dark:text-orange-400 hover:opacity-80 transition-opacity">
            <span>🃏</span>
            {fc} {locale === "cs" ? "karet k opakování" : "cards due"}
          </Link>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <h3 className="text-heading-sm font-bold text-content-primary">{label}</h3>
          {domain && (
            <span className="inline-block rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
              {domain}
            </span>
          )}
          <p className="text-body-sm text-content-secondary line-clamp-2">{summary}</p>
        </div>
        <Link
          to={`/tutor?concept=${concept.id}`}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-body-sm font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          {locale === "cs" ? "Probrat s AI" : "Ask AI"}
        </Link>
      </div>
    </div>
  );
}

function LearningProgressCard() {
  const progress = useMemo(() => getAllProgress(), []);
  const conversations = useMemo(() => listConversations(), []);
  const pins = useMemo(() => listPins(), []);
  const streak = useMemo(() => getStreak(), []);

  if (progress.length === 0 && !streak) return null;

  const mastered = progress.filter((p) => masteryLevel(p) >= 3).length;
  const studied = progress.filter((p) => masteryLevel(p) === 2).length;
  const explored = progress.filter((p) => masteryLevel(p) === 1).length;
  const totalMessages = progress.reduce((s, p) => s + p.messageCount, 0);

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-body-sm font-semibold text-content-primary">Your learning progress</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Streak badge */}
          {streak && streak.currentStreak > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/30 bg-orange-400/10 px-2.5 py-1">
              <span className="text-base leading-none">🔥</span>
              <span className="text-caption-xs font-semibold text-orange-500">
                {streak.currentStreak} day{streak.currentStreak !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Link to="/progress" className="text-caption-xs text-primary hover:underline">
              Full stats →
            </Link>
            <Link to="/map" className="text-caption-xs text-content-tertiary hover:text-primary hover:underline">
              Map →
            </Link>
          </div>
        </div>
      </div>

      {progress.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Concepts explored", value: progress.length },
              { label: "Messages exchanged", value: totalMessages },
              { label: "Conversations", value: conversations.length },
              { label: "Saved notes", value: pins.length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-surface-base p-3 text-center">
                <div className="text-heading-sm font-bold text-content-primary">{value}</div>
                <div className="text-caption-xs text-content-tertiary mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {(mastered + studied + explored) > 0 && (
            <div className="flex items-center gap-3 flex-wrap text-caption-xs">
              {mastered > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-success font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
                  {mastered} mastered
                </span>
              )}
              {studied > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-600 dark:text-blue-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                  {studied} studied
                </span>
              )}
              {explored > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-1 text-yellow-600 dark:text-yellow-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 inline-block" />
                  {explored} explored
                </span>
              )}
              {streak && streak.longestStreak > 1 && (
                <span className="text-content-tertiary/60">
                  Best streak: {streak.longestStreak} days
                </span>
              )}
              <Link to="/tutor" className="ml-auto inline-flex items-center gap-1 text-primary hover:underline">
                <Zap className="h-3 w-3" />
                Continue learning
              </Link>
            </div>
          )}
        </>
      )}

      {/* If streak exists but no progress yet (edge case) */}
      {progress.length === 0 && streak && (
        <div className="flex items-center justify-between">
          <p className="text-body-sm text-content-secondary">
            You're on a {streak.currentStreak}-day streak! Keep going.
          </p>
          <Link to="/tutor">
            <Button size="sm">
              <Zap className="h-3.5 w-3.5" />
              Continue
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function StudyPlansCard() {
  const plans = useMemo(() => listPlans(), []);
  const activePlan = plans[0] ?? null;

  const done  = activePlan?.items.filter((i) => i.done).length ?? 0;
  const total = activePlan?.items.length ?? 0;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Link to="/plan" className="group block">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/6 via-emerald-500/3 to-transparent p-5 hover:border-emerald-400/40 hover:shadow-elevation-sm transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15">
                <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-caption-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Study plans
              </span>
            </div>
            {activePlan ? (
              <>
                <p className="text-body-sm font-semibold text-content-primary line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {activePlan.goal}
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border-subtle">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-caption-xs text-content-tertiary">{done}/{total} tasks · {pct}%</span>
                </div>
              </>
            ) : (
              <p className="text-body-sm text-content-secondary">
                Let AI build a personalized week-by-week learning roadmap from your goal.
              </p>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-content-tertiary shrink-0 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all mt-1" />
        </div>
        {!activePlan && (
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/8 px-3 py-1 text-caption-xs font-medium text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-3 w-3" />
              Create my first plan →
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export function Component() {
  const { LL } = useI18nContext();
  const locale = useLocaleStore(selectLocale);
  const topicsQuery = useQuery({
    queryKey: queryKeys.topics,
    queryFn: listTopics,
  });
  const radarQuery = useQuery({
    queryKey: queryKeys.radar(),
    queryFn: () => listRadarItems({ limit: 3 }),
  });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={LL.home.eyebrow()}
        title={LL.home.title()}
        description={LL.home.description()}
      />

      {/* Concept of the day */}
      <ConceptOfDayCard locale={locale} />

      {/* Daily goals */}
      <DailyGoalsWidget locale={locale} />

      {/* Learning progress — only shown when user has activity */}
      <LearningProgressCard />

      {/* Study Plans call-to-action */}
      <StudyPlansCard />

      {/* AI Tutor feature hero */}
      <Link to="/tutor" className="group block">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-6 transition-all hover:border-primary/40 hover:shadow-elevation-md">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 max-w-lg">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                </div>
                <span className="text-caption-xs font-semibold uppercase tracking-widest text-primary">
                  {LL.nav.tutorLink()}
                </span>
              </div>
              <h2 className="text-heading-sm font-semibold tracking-tight text-content-primary group-hover:text-primary transition-colors">
                Your personal AI learning partner
              </h2>
              <p className="text-body-md text-content-secondary">
                Ask anything — from "explain transformers" to "write me a RAG pipeline in Python". Get expert-level answers with code, analogies, and depth. Connects to any concept in the AI Map.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {["Streaming responses", "Code examples", "AI Map context", "CS + EN"].map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-caption-xs text-primary">
                    <Sparkles className="h-2.5 w-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden sm:flex shrink-0 h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <MessageSquareText className="h-10 w-10 text-primary/60" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button size="sm" className="group-hover:bg-[hsl(var(--brand-600))]">
              Start a conversation
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/map" onClick={(e) => e.stopPropagation()}>
                Explore AI Map
              </Link>
            </Button>
          </div>
        </div>
      </Link>

      <section>
        <h2 className="mb-3 text-body-sm font-semibold uppercase tracking-wide text-content-tertiary">
          {LL.home.sectionsHeading()}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map(({ labelKey, href, icon: Icon, description }) => (
            <Link key={href} to={href} className="group">
              <Card variant="elevated" interactive className="h-full p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-body-lg font-semibold tracking-tight text-content-primary group-hover:text-primary">
                      {LL.nav[labelKey]()}
                      <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="text-body-md text-content-secondary">{description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-body-sm font-semibold uppercase tracking-wide text-content-tertiary">
            {LL.home.latestTopics()}
          </h2>
          <Button variant="link" asChild>
            <Link to="/learn">{LL.home.browseAll()}<ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {topicsQuery.isLoading
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)
            : (topicsQuery.data ?? []).slice(0, 3).map((t) => (
                <Card key={t.id} variant="elevated" interactive>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Badge variant="muted">{t.difficulty}</Badge>
                      <span className="text-caption-xs text-content-tertiary">
                        {t.estimatedMinutes} min
                      </span>
                    </div>
                    <CardTitle>
                      <Link to={`/learn/${t.slug}`} className="hover:text-primary">
                        {t.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-body-md text-content-secondary">
                      {t.summary}
                    </p>
                  </CardContent>
                </Card>
              ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-body-sm font-semibold uppercase tracking-wide text-content-tertiary">
            {LL.home.fromTheRadar()}
          </h2>
          <Button variant="link" asChild>
            <Link to="/radar">{LL.home.openRadar()}<ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {radarQuery.isLoading
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)
            : (radarQuery.data ?? []).map((r) => (
                <Card key={r.id} variant="outline" className="p-5">
                  <div className="space-y-2">
                    <div className="text-caption-xs text-content-tertiary">
                      {r.sourceName}
                    </div>
                    <a
                      href={r.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-body-md font-medium text-content-primary hover:text-primary"
                    >
                      {r.title}
                    </a>
                    {r.summary ? (
                      <p className="line-clamp-2 text-body-sm text-content-secondary">
                        {r.summary}
                      </p>
                    ) : null}
                  </div>
                </Card>
              ))}
        </div>
      </section>
    </div>
  );
}

export default Component;
