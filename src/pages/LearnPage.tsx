import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, Layers } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listTopics, listTracks } from "@/services/topicsApi";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { useI18nContext } from "@/i18n/i18n-react";
import type { TranslationFunctions } from "@/i18n/i18n-types";
import type { Topic, Track } from "@/types/domain";

const trackAccent: Record<string, string> = {
  brand: "bg-brand-soft text-primary",
  premium: "bg-premium-soft text-[hsl(var(--premium))]",
  success: "bg-success-soft text-[hsl(var(--success))]",
  coral: "bg-coral-soft text-[hsl(var(--coral))]",
};

const FALLBACK_COLORS = ["brand", "premium", "success", "coral"] as const;
const UNCATEGORISED_KEY = "__uncategorised__";

interface DerivedGroup {
  track: Track;
  topics: Topic[];
  /** True when this group's track metadata had to be inferred from topic rows. */
  derived: boolean;
}

export function Component() {
  const { LL } = useI18nContext();
  const tracksQuery = useQuery({ queryKey: queryKeys.tracks, queryFn: listTracks });
  const topicsQuery = useQuery({ queryKey: queryKeys.topics, queryFn: listTopics });

  // Build groups from topic rows, then decorate with `tracks` metadata when available.
  // This keeps the page useful when the `tracks` table is empty, blocked by RLS, or
  // out-of-sync with what `topics.track_id` references.
  const grouped = useMemo<DerivedGroup[]>(() => {
    const tracks = tracksQuery.data ?? [];
    const topics = topicsQuery.data ?? [];

    const trackById = new Map(tracks.map((t) => [t.id, t]));

    const byKey = new Map<string, Topic[]>();
    for (const topic of topics) {
      const key = topic.trackId ?? UNCATEGORISED_KEY;
      const bucket = byKey.get(key) ?? [];
      bucket.push(topic);
      byKey.set(key, bucket);
    }

    let derivedIndex = 0;
    const groups: DerivedGroup[] = Array.from(byKey.entries()).map(([key, items]) => {
      const sortedTopics = [...items].sort((a, b) => a.position - b.position);

      if (key === UNCATEGORISED_KEY) {
        return {
          track: {
            id: UNCATEGORISED_KEY,
            slug: "uncategorised",
            title: LL.learn.uncategorisedTitle(),
            description: LL.learn.uncategorisedDescription(),
            color: "brand",
            position: Number.MAX_SAFE_INTEGER,
          },
          topics: sortedTopics,
          derived: true,
        };
      }

      const known = trackById.get(key);
      if (known) {
        return { track: known, topics: sortedTopics, derived: false };
      }

      // Topics reference a track id we can't read (missing row, RLS, etc.).
      // Push them to the end and label them generically — better than dropping them silently.
      const color = FALLBACK_COLORS[derivedIndex % FALLBACK_COLORS.length];
      derivedIndex += 1;
      return {
        track: {
          id: key,
          slug: `track-${derivedIndex}`,
          title: LL.learn.derivedTrackTitle({ n: derivedIndex }),
          description: LL.learn.derivedTrackDescription(),
          color,
          position: 1_000 + derivedIndex,
        },
        topics: sortedTopics,
        derived: true,
      };
    });

    return groups.sort((a, b) => a.track.position - b.track.position);
  }, [tracksQuery.data, topicsQuery.data, LL]);

  const totalMinutes = useMemo(
    () => (topicsQuery.data ?? []).reduce((sum, t) => sum + t.estimatedMinutes, 0),
    [topicsQuery.data],
  );

  const isLoading = tracksQuery.isLoading || topicsQuery.isLoading;

  // Prefer the number of groups we can actually render (covers the case where
  // topics exist but the `tracks` table is empty or unreadable). Fall back to
  // the raw `tracks` count when there are no topics yet but tracks exist.
  const tracksCount =
    grouped.length > 0 ? grouped.length : tracksQuery.data?.length ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={LL.learn.eyebrow()}
        title={LL.learn.title()}
        description={LL.learn.description()}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryStat
          label={LL.learn.statTracks()}
          value={isLoading ? "—" : tracksCount}
          icon={<Layers className="h-4 w-4" />}
        />
        <SummaryStat
          label={LL.learn.statTopics()}
          value={isLoading ? "—" : topicsQuery.data?.length ?? 0}
          icon={<Layers className="h-4 w-4" />}
        />
        <SummaryStat
          label={LL.learn.statEstimatedReading()}
          value={totalMinutes ? LL.common.estimatedReadingShort({ count: totalMinutes }) : "—"}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      <div className="space-y-10">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)
          : grouped.map(({ track, topics, derived }, idx) => (
              <TrackSection
                key={track.id}
                LL={LL}
                track={track}
                topics={topics}
                derived={derived}
                indexLabel={idx + 1}
              />
            ))}
      </div>
    </div>
  );
}

function SummaryStat({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Card variant="soft" className="px-5 py-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-caption-xs uppercase tracking-wide text-content-tertiary">
            {label}
          </div>
          <div className="mt-1 text-heading-sm font-semibold text-content-primary">{value}</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated text-content-tertiary">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function TrackSection({
  LL,
  track,
  topics,
  derived,
  indexLabel,
}: {
  LL: TranslationFunctions;
  track: Track;
  topics: Topic[];
  derived: boolean;
  indexLabel: number;
}) {
  const accent = trackAccent[track.color ?? ""] ?? trackAccent.brand;

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg text-body-sm font-semibold",
              accent,
            )}
          >
            {indexLabel}
          </div>
          <div>
            <div className="flex items-center gap-2 text-caption-xs uppercase tracking-wide text-content-tertiary">
              <span>{LL.learn.trackEyebrow()}</span>
              {derived ? <Badge variant="muted">{LL.learn.trackDerived()}</Badge> : null}
            </div>
            <h2 className="text-heading-sm font-semibold tracking-tight text-content-primary">
              {track.title}
            </h2>
          </div>
        </div>
        <span className="text-body-sm text-content-tertiary">
          {LL.learn.topicsCount({ count: topics.length })}
        </span>
      </div>
      {track.description ? (
        <p className="mb-4 max-w-2xl text-body-md text-content-secondary">{track.description}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {topics.map((topic) => (
          <Link key={topic.id} to={`/learn/${topic.slug}`} className="group">
            <Card variant="elevated" interactive className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="muted">{topic.difficulty}</Badge>
                  <span className="text-caption-xs text-content-tertiary">
                    {LL.learn.topicMinutes({ count: topic.estimatedMinutes })}
                  </span>
                </div>
                <CardTitle>
                  <span className="group-hover:text-primary">{topic.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-2 text-body-md text-content-secondary">
                  {topic.summary}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {topic.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline">#{tag}</Badge>
                  ))}
                </div>
                <div className="mt-3 inline-flex items-center gap-1 text-body-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  {LL.learn.openTopic()} <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default Component;
