import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Radar as RadarIcon,
  Library as LibraryIcon,
  Brain,
  Wrench,
  ArrowRight,
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
import type { TranslationFunctions } from "@/i18n/i18n-types";

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

export function Component() {
  const { LL } = useI18nContext();
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
