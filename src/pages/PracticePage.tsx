import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Brain, Clock, Layers } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { listQuizzes } from "@/services/practiceApi";
import { listTopics } from "@/services/topicsApi";
import { queryKeys } from "@/lib/queryKeys";
import { useI18nContext } from "@/i18n/i18n-react";
import { selectLocale, useLocaleStore } from "@/stores/localeStore";

export function Component() {
  const { LL } = useI18nContext();
  const locale = useLocaleStore(selectLocale);
  const quizzesQuery = useQuery({
    queryKey: [...queryKeys.quizzes, locale],
    queryFn: listQuizzes,
  });
  const topicsQuery = useQuery({
    queryKey: [...queryKeys.topics, locale],
    queryFn: listTopics,
  });

  const topicById = new Map((topicsQuery.data ?? []).map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={LL.practice.eyebrow()}
        title={LL.practice.title()}
        description={LL.practice.description()}
      />

      {quizzesQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (quizzesQuery.data ?? []).length === 0 ? (
        <EmptyState
          icon={Brain}
          title={LL.practice.emptyTitle()}
          description={LL.practice.emptyDescription()}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(quizzesQuery.data ?? []).map((q) => {
            const topic = q.topicId ? topicById.get(q.topicId) : null;
            const counts = q.questions.reduce(
              (acc, qq) => {
                if (qq.kind === "mcq") acc.mcq++;
                else acc.fc++;
                return acc;
              },
              { mcq: 0, fc: 0 },
            );
            return (
              <Card key={q.id} variant="elevated" interactive className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="muted">{q.difficulty}</Badge>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3" />
                      {q.estimatedMinutes} min
                    </Badge>
                    <Badge variant="outline">
                      <Layers className="h-3 w-3" />
                      {LL.practice.questionCount({ count: q.questions.length })}
                    </Badge>
                  </div>
                  <CardTitle>{q.title}</CardTitle>
                  {topic ? (
                    <div className="text-caption-xs text-content-tertiary">
                      {LL.practice.topicLabel()} ·{" "}
                      <Link to={`/learn/${topic.slug}`} className="hover:text-primary">
                        {topic.title}
                      </Link>
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-body-md text-content-secondary">{q.description}</p>
                  <div className="text-caption-xs text-content-tertiary">
                    {LL.practice.mcqCount({ count: counts.mcq })} ·{" "}
                    {LL.practice.flashcardCount({ count: counts.fc })}
                  </div>
                  <Button asChild className="w-full">
                    <Link to={`/practice/${q.slug}`}>
                      <Brain className="h-4 w-4" />
                      {LL.practice.start()}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Component;
