import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Brain, BookOpen, Clock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Markdown } from "@/components/markdown";
import { ResourceCard } from "@/components/resource-card";
import { getTopicBySlug, listTopics } from "@/services/topicsApi";
import { listResources } from "@/services/resourcesApi";
import { listQuizzes } from "@/services/practiceApi";
import { queryKeys } from "@/lib/queryKeys";

export function Component() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const topicQuery = useQuery({
    queryKey: queryKeys.topicBySlug(slug),
    queryFn: () => getTopicBySlug(slug),
    enabled: Boolean(slug),
  });
  const allTopicsQuery = useQuery({ queryKey: queryKeys.topics, queryFn: listTopics });
  const resourcesQuery = useQuery({
    queryKey: queryKeys.resources({ topicId: topicQuery.data?.id ?? "" }),
    queryFn: () => listResources({ topicId: topicQuery.data!.id }),
    enabled: Boolean(topicQuery.data?.id),
  });
  const quizzesQuery = useQuery({ queryKey: queryKeys.quizzes, queryFn: listQuizzes });

  if (topicQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  const topic = topicQuery.data;
  if (!topic) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Topic not found"
        description="The topic you're looking for doesn't exist or hasn't been published yet."
        action={<Button onClick={() => navigate("/learn")}>Back to Learn</Button>}
      />
    );
  }

  const allTopics = allTopicsQuery.data ?? [];
  const prereqs = topic.prerequisites
    .map((s) => allTopics.find((t) => t.slug === s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const quizzes = (quizzesQuery.data ?? []).filter((q) => q.topicId === topic.id);
  const resources = resourcesQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link to="/learn">
            <ArrowLeft className="h-4 w-4" />
            Back to Learn
          </Link>
        </Button>
        <PageHeader
          eyebrow="Topic"
          title={topic.title}
          description={topic.summary ?? undefined}
          actions={
            <>
              <Badge variant="muted">{topic.difficulty}</Badge>
              <Badge variant="outline">
                <Clock className="h-3 w-3" />
                {topic.estimatedMinutes} min
              </Badge>
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,280px]">
        <Card variant="elevated">
          <CardContent className="prose-academy p-6 pt-6 sm:p-8 sm:pt-8">
            <Markdown source={topic.bodyMd ?? "_No content yet._"} />
          </CardContent>
        </Card>

        <aside className="space-y-4">
          {prereqs.length > 0 ? (
            <Card variant="soft">
              <CardHeader>
                <CardTitle className="text-body-md">Prerequisites</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {prereqs.map((p) => (
                  <Link
                    key={p.id}
                    to={`/learn/${p.slug}`}
                    className="block rounded-lg border border-border-subtle bg-surface-elevated p-3 transition-colors hover:border-border-strong"
                  >
                    <div className="text-body-sm font-medium text-content-primary">{p.title}</div>
                    <div className="text-caption-xs text-content-tertiary">
                      {p.estimatedMinutes} min · {p.difficulty}
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card variant="soft">
            <CardHeader>
              <CardTitle className="text-body-md">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              {topic.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {topic.tags.map((tag) => (
                    <Badge key={tag} variant="outline">#{tag}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-body-sm text-content-tertiary">No tags yet.</p>
              )}
            </CardContent>
          </Card>

          {quizzes.length > 0 ? (
            <Card variant="soft">
              <CardHeader>
                <CardTitle className="text-body-md">Practice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quizzes.map((q) => (
                  <Button key={q.id} variant="outline" asChild className="w-full justify-start">
                    <Link to={`/practice/${q.slug}`}>
                      <Brain className="h-4 w-4" />
                      {q.title}
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>

      <section>
        <h2 className="mb-3 text-body-sm font-semibold uppercase tracking-wide text-content-tertiary">
          Related resources
        </h2>
        {resources.length === 0 ? (
          <EmptyState
            title="No resources linked yet"
            description="Run the radar-ingest function or pin a manual resource to surface curated reading."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {resources.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Component;
