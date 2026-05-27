import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  Activity,
  CheckSquare,
  ExternalLink,
  FileText,
  Filter,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getBasecampWorkspaceStatus,
  listBasecampActivity,
} from "@/services/basecampApi";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { selectLocale, useLocaleStore } from "@/stores/localeStore";
import type {
  BasecampProjectWithActivity,
  BasecampRecording,
  BasecampRecordingKind,
} from "@/types/domain";
import type { Locales } from "@/i18n/i18n-types";

/* -------------------------------------------------------------------------- */
/* Page-local copy                                                             */
/* -------------------------------------------------------------------------- */

const COPY = {
  eyebrow: { cs: "Tým", en: "Team" },
  title: { cs: "Týmové projekty", en: "Team projects" },
  description: {
    cs: "Synchronizovaný pohled na projekty z Basecampu, zaměřený na ty, které se týkají AI. Diskuze, úkoly a dokumenty zůstávají v Basecampu — tady je jen průchozí přehled.",
    en: "A live view of your Basecamp projects, focused on the AI-related ones. Discussions, to-dos and documents stay in Basecamp — this is just the through-glass overview.",
  },
  tabAll: { cs: "Vše", en: "All" },
  tabAi: { cs: "Jen AI", en: "AI only" },
  filterHint: {
    cs: "Filtr podle klíčových slov v názvu a popisu projektu.",
    en: "Filter by keywords in the project name and description.",
  },
  notConfiguredTitle: {
    cs: "Basecamp ještě není napojen.",
    en: "Basecamp isn't connected yet.",
  },
  notConfiguredDesc: {
    cs: "Admin musí jednou autorizovat přístup. Kroky najdete v supabase/setup-basecamp.sql.",
    en: "An admin needs to authorise the integration once. Steps are in supabase/setup-basecamp.sql.",
  },
  emptyTitle: {
    cs: "Žádné projekty zatím nejsou nasynchronizované.",
    en: "No synced projects yet.",
  },
  emptyDesc: {
    cs: "Spusťte sync ručně nebo počkejte na další hodinový tick.",
    en: "Run the sync manually or wait for the next hourly tick.",
  },
  noActivity: {
    cs: "Žádná nedávná aktivita.",
    en: "No recent activity.",
  },
  openInBasecamp: { cs: "Otevřít v Basecampu", en: "Open in Basecamp" },
  recentActivityHeading: { cs: "Nedávná aktivita", en: "Recent activity" },
  aiBadge: { cs: "AI", en: "AI" },
  archivedBadge: { cs: "Archivováno", en: "Archived" },
  lastActive: { cs: "Aktivní", en: "Active" },
  syncedFromBasecamp: {
    cs: "Synchronizováno z Basecampu",
    en: "Synced from Basecamp",
  },
  lastSync: { cs: "Poslední sync", en: "Last sync" },
  byline: { cs: "od", en: "by" },
  hiddenByEditor: {
    cs: "Skryto editorem",
    en: "Hidden by editor",
  },
} as const;

type CopyKey = keyof typeof COPY;
const t = (key: CopyKey, locale: Locales): string => {
  const e = COPY[key];
  return locale === "cs" ? e.cs : e.en;
};

type Tab = "all" | "ai";

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export function Component() {
  const locale = useLocaleStore(selectLocale);
  const [tab, setTab] = useState<Tab>("ai");

  const statusQuery = useQuery({
    queryKey: queryKeys.basecampWorkspace,
    queryFn: getBasecampWorkspaceStatus,
  });

  const activityQuery = useQuery({
    queryKey: queryKeys.basecampActivity({ aiOnly: tab === "ai", limit: 4 }),
    queryFn: () =>
      listBasecampActivity({ aiOnly: tab === "ai", limit: 4 }),
    enabled: statusQuery.data?.configured === true,
  });

  // Memoise the post-fetch projects array — without this, `??` on
  // `activityQuery.data` returns a fresh `[]` every render and forces the
  // downstream `useMemo`s to re-run for nothing.
  const projects = useMemo(() => activityQuery.data ?? [], [activityQuery.data]);

  const aggregatedActivity = useMemo(() => {
    const all = projects.flatMap((p) =>
      p.recentActivity.map((r) => ({ project: p, recording: r })),
    );
    return all
      .sort((a, b) =>
        (b.recording.postedAt ?? "").localeCompare(a.recording.postedAt ?? ""),
      )
      .slice(0, 8);
  }, [projects]);

  const aiCount = useMemo(
    () => projects.filter((p) => p.isAiRelevant).length,
    [projects],
  );
  const updatesThisWeek = useMemo(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return projects.reduce(
      (acc, p) =>
        acc +
        p.recentActivity.filter(
          (r) => r.postedAt && Date.parse(r.postedAt) >= since,
        ).length,
      0,
    );
  }, [projects]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("eyebrow", locale)}
        title={t("title", locale)}
        description={t("description", locale)}
        actions={
          statusQuery.data?.configured ? (
            <SyncBadge
              locale={locale}
              accountName={statusQuery.data?.accountName ?? null}
              lastSyncAt={statusQuery.data?.lastSyncAt ?? null}
              status={statusQuery.data?.lastSyncStatus ?? null}
            />
          ) : null
        }
      />

      {/* Top stats + filter */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <StatPill
            icon={<Users className="h-3.5 w-3.5" />}
            label={
              locale === "cs"
                ? `${projects.length} ${plural(projects.length, ["projekt", "projekty", "projektů"], locale)}`
                : `${projects.length} ${projects.length === 1 ? "project" : "projects"}`
            }
          />
          <StatPill
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label={
              locale === "cs"
                ? `${aiCount} k AI`
                : `${aiCount} AI-related`
            }
          />
          <StatPill
            icon={<Activity className="h-3.5 w-3.5" />}
            label={
              locale === "cs"
                ? `${updatesThisWeek} ${plural(updatesThisWeek, ["aktualizace", "aktualizace", "aktualizací"], locale)} za týden`
                : `${updatesThisWeek} updates this week`
            }
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="ai">
              <Sparkles className="h-3.5 w-3.5" />
              {t("tabAi", locale)}
            </TabsTrigger>
            <TabsTrigger value="all">
              <Filter className="h-3.5 w-3.5" />
              {t("tabAll", locale)}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,320px]">
        <section className="space-y-3">
          {!statusQuery.data?.configured && !statusQuery.isLoading ? (
            <EmptyState
              icon={Users}
              title={t("notConfiguredTitle", locale)}
              description={t("notConfiguredDesc", locale)}
            />
          ) : activityQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))
          ) : projects.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t("emptyTitle", locale)}
              description={t("emptyDesc", locale)}
            />
          ) : (
            projects.map((p) => (
              <ProjectCard key={p.id} project={p} locale={locale} />
            ))
          )}
        </section>

        {/* Activity stream */}
        <aside className="space-y-3">
          <h2 className="text-caption-xs uppercase tracking-wide text-content-tertiary">
            {t("recentActivityHeading", locale)}
          </h2>
          {aggregatedActivity.length === 0 ? (
            <Card variant="soft" className="p-4 text-body-sm text-content-secondary">
              {t("noActivity", locale)}
            </Card>
          ) : (
            <Card variant="soft" className="divide-y divide-border-subtle">
              {aggregatedActivity.map(({ recording, project }) => (
                <ActivityRow
                  key={recording.id}
                  recording={recording}
                  projectName={project.name}
                  locale={locale}
                />
              ))}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

export default Component;

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */

function SyncBadge({
  locale,
  accountName,
  lastSyncAt,
  status,
}: {
  locale: Locales;
  accountName: string | null;
  lastSyncAt: string | null;
  status: string | null;
}) {
  const ts = lastSyncAt ? safeFormat(lastSyncAt) : null;
  const isError = status?.startsWith("error");
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption-xs",
        isError
          ? "border-coral-soft bg-coral-soft text-[hsl(var(--coral))]"
          : "border-border-subtle bg-surface-soft text-content-secondary",
      )}
    >
      <span className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        isError ? "bg-[hsl(var(--coral))]" : "bg-[hsl(var(--success))]",
      )} aria-hidden />
      {accountName ? <span className="font-medium">{accountName}</span> : null}
      {ts ? (
        <span className="text-content-tertiary">
          · {t("lastSync", locale)} {ts}
        </span>
      ) : null}
    </div>
  );
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-soft px-2.5 py-1 text-caption-xs text-content-secondary">
      {icon}
      {label}
    </span>
  );
}

function ProjectCard({
  project,
  locale,
}: {
  project: BasecampProjectWithActivity;
  locale: Locales;
}) {
  const lastActive = project.lastActiveAt ? safeFormat(project.lastActiveAt) : null;
  const isArchived = project.status === "archived";
  const isHidden = project.manualVisibility === "hide";
  return (
    <Card variant="elevated" interactive>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {project.isAiRelevant ? (
                <Badge variant="default">
                  <Sparkles className="h-3 w-3" />
                  {t("aiBadge", locale)}
                </Badge>
              ) : null}
              {isArchived ? (
                <Badge variant="muted">{t("archivedBadge", locale)}</Badge>
              ) : null}
              {isHidden ? (
                <Badge variant="warning">{t("hiddenByEditor", locale)}</Badge>
              ) : null}
              {lastActive ? (
                <span className="text-caption-xs text-content-tertiary">
                  · {t("lastActive", locale)} {lastActive}
                </span>
              ) : null}
            </div>
            <h3 className="text-body-lg font-semibold leading-snug tracking-tight text-content-primary">
              {project.name}
            </h3>
            {project.description ? (
              <p className="line-clamp-2 text-body-md text-content-secondary">
                {project.description}
              </p>
            ) : null}
          </div>
          <a
            href={project.appUrl ?? project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border-subtle bg-surface-base px-3 py-1.5 text-body-sm font-medium text-content-secondary transition-colors hover:border-border-strong hover:text-content-primary"
          >
            {t("openInBasecamp", locale)}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {project.recentActivity.length > 0 ? (
          <ul className="space-y-1.5 border-t border-border-subtle pt-3">
            {project.recentActivity.slice(0, 3).map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-2 text-body-sm text-content-secondary"
              >
                <span
                  className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-content-tertiary"
                  aria-hidden
                >
                  <KindIcon kind={r.kind} />
                </span>
                <span className="min-w-0 flex-1">
                  <a
                    href={r.url ?? project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-content-primary hover:text-primary"
                  >
                    {r.title ?? r.excerpt ?? recordingKindLabel(r.kind, locale)}
                  </a>
                  <span className="ml-1 text-content-tertiary">
                    · {r.authorName ?? "—"}
                    {r.postedAt ? ` · ${safeFormat(r.postedAt)}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActivityRow({
  recording,
  projectName,
  locale,
}: {
  recording: BasecampRecording;
  projectName: string;
  locale: Locales;
}) {
  const ts = recording.postedAt ? safeFormat(recording.postedAt) : null;
  return (
    <a
      href={recording.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
    >
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-content-tertiary">
        <KindIcon kind={recording.kind} />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block truncate text-body-sm font-medium text-content-primary">
          {recording.title ?? recording.excerpt ?? recordingKindLabel(recording.kind, locale)}
        </span>
        <span className="block text-caption-xs text-content-tertiary">
          {recording.authorName ? (
            <>
              {t("byline", locale)} {recording.authorName} ·{" "}
            </>
          ) : null}
          <span className="text-content-secondary">{projectName}</span>
          {ts ? <> · {ts}</> : null}
        </span>
      </span>
    </a>
  );
}

function KindIcon({ kind }: { kind: BasecampRecordingKind }) {
  switch (kind) {
    case "message":
    case "comment":
      return <MessageSquare className="h-3.5 w-3.5" />;
    case "todo":
    case "todolist":
      return <CheckSquare className="h-3.5 w-3.5" />;
    case "document":
    case "question_answer":
      return <FileText className="h-3.5 w-3.5" />;
    default:
      return <Activity className="h-3.5 w-3.5" />;
  }
}

function recordingKindLabel(kind: BasecampRecordingKind, locale: Locales): string {
  if (locale === "cs") {
    switch (kind) {
      case "message":         return "zpráva";
      case "comment":         return "komentář";
      case "todo":            return "úkol";
      case "todolist":        return "seznam úkolů";
      case "schedule_entry":  return "událost";
      case "document":        return "dokument";
      case "question_answer": return "odpověď";
      default:                return "položka";
    }
  }
  switch (kind) {
    case "message":         return "message";
    case "comment":         return "comment";
    case "todo":            return "to-do";
    case "todolist":        return "to-do list";
    case "schedule_entry":  return "schedule entry";
    case "document":        return "document";
    case "question_answer": return "answer";
    default:                return "item";
  }
}

function safeFormat(iso: string): string | null {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return null;
  }
}

/** Czech grammatical plurals for 1 / 2-4 / 5+. */
function plural(n: number, [one, few, many]: [string, string, string], locale: Locales): string {
  if (locale !== "cs") return n === 1 ? one : many;
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
