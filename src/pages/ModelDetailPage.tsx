import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Cpu,
  ExternalLink,
  Layers,
  Scale,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getLlmModelBySlug } from "@/services/modelsApi";
import { queryKeys } from "@/lib/queryKeys";
import { useI18nContext } from "@/i18n/i18n-react";
import type { LlmLicenseType, LlmPopularityTier } from "@/types/domain";
import type { TranslationFunctions } from "@/i18n/i18n-types";

const licenseVariant: Record<LlmLicenseType, "default" | "success" | "premium" | "warning"> = {
  commercial: "premium",
  open_source: "success",
  research: "default",
  unknown: "warning",
};

export function Component() {
  const { slug = "" } = useParams();
  const { LL } = useI18nContext();

  const modelQuery = useQuery({
    queryKey: queryKeys.llmModelBySlug(slug),
    queryFn: () => getLlmModelBySlug(slug),
    enabled: Boolean(slug),
  });

  const model = modelQuery.data;

  if (modelQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/spectrum">
            <ArrowLeft className="h-4 w-4" />
            {LL.spectrum.backToList()}
          </Link>
        </Button>
        <EmptyState
          icon={Cpu}
          title={LL.spectrum.notFoundTitle()}
          description={LL.spectrum.notFoundDescription()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/spectrum">
          <ArrowLeft className="h-4 w-4" />
          {LL.spectrum.backToList()}
        </Link>
      </Button>

      <PageHeader
        eyebrow={model.provider}
        title={model.name}
        description={model.summary}
        actions={
          <div className="flex flex-wrap gap-2">
            {model.homepageUrl ? (
              <Button asChild variant="outline" size="sm">
                <a href={model.homepageUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {LL.spectrum.homepageLink()}
                </a>
              </Button>
            ) : null}
            {model.docsUrl ? (
              <Button asChild variant="outline" size="sm">
                <a href={model.docsUrl} target="_blank" rel="noopener noreferrer">
                  <BookOpen className="h-4 w-4" />
                  {LL.spectrum.docsLink()}
                </a>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant={licenseVariant[model.licenseType]}>
          {licenseLabelFor(model.licenseType, LL)}
        </Badge>
        <Badge variant="default">{tierLabelFor(model.popularityTier, LL)}</Badge>
        {model.modalities.map((mod) => (
          <Badge key={mod} variant="default">
            <Layers className="mr-1 h-3 w-3" />
            {mod}
          </Badge>
        ))}
        {model.isNiche ? <Badge variant="warning">{LL.spectrum.nicheBadge()}</Badge> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {model.contextWindow ? (
          <SpecTile
            icon={Scale}
            label={LL.spectrum.specContext()}
            value={LL.spectrum.contextLabel({ tokens: model.contextWindow })}
          />
        ) : null}
        {model.parameterCount ? (
          <SpecTile icon={Cpu} label={LL.spectrum.specParams()} value={model.parameterCount} />
        ) : null}
        {model.pricingHint ? (
          <SpecTile icon={Sparkles} label={LL.spectrum.specPricing()} value={model.pricingHint} />
        ) : null}
        {model.releaseDate ? (
          <SpecTile icon={Target} label={LL.spectrum.specReleased()} value={model.releaseDate} />
        ) : null}
      </div>

      {model.typicalUseCases.length > 0 ? (
        <Card variant="soft">
          <CardHeader>
            <CardTitle className="text-body-md">{LL.spectrum.useCasesTitle()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {model.typicalUseCases.map((uc) => (
                <Badge key={uc} variant="success">{uc}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(model.strengths.length > 0 || model.limitations.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {model.strengths.length > 0 ? (
            <Card variant="soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-body-md">
                  <ThumbsUp className="h-4 w-4 text-success" />
                  {LL.spectrum.strengthsTitle()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-body-sm text-content-secondary">
                  {model.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          {model.limitations.length > 0 ? (
            <Card variant="soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-body-md">
                  <ThumbsDown className="h-4 w-4 text-coral" />
                  {LL.spectrum.limitationsTitle()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-body-sm text-content-secondary">
                  {model.limitations.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {model.descriptionMd ? (
        <Card variant="soft">
          <CardHeader>
            <CardTitle className="text-body-md">{LL.spectrum.detailTitle()}</CardTitle>
          </CardHeader>
          <CardContent className="prose-sm max-w-none">
            <Markdown source={model.descriptionMd} />
          </CardContent>
        </Card>
      ) : null}

      {model.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {model.tags.map((tag) => (
            <Badge key={tag} variant="default">{tag}</Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function licenseLabelFor(type: LlmLicenseType, LL: TranslationFunctions): string {
  switch (type) {
    case "commercial": return LL.spectrum.licenseCommercial();
    case "open_source": return LL.spectrum.licenseOpenSource();
    case "research": return LL.spectrum.licenseResearch();
    default: return LL.spectrum.licenseUnknown();
  }
}

function tierLabelFor(tier: LlmPopularityTier, LL: TranslationFunctions): string {
  switch (tier) {
    case "mainstream": return LL.spectrum.tierMainstream();
    case "emerging": return LL.spectrum.tierEmerging();
    case "niche": return LL.spectrum.tierNiche();
    case "legacy": return LL.spectrum.tierLegacy();
  }
}

function SpecTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card variant="soft" className="px-4 py-3">
      <div className="flex items-center gap-2 text-caption-xs uppercase tracking-wide text-content-tertiary">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-body-sm font-medium text-content-primary">{value}</p>
    </Card>
  );
}
