/**
 * Internal reader.
 *
 * Handles all four UI states (loading / not found / not ready / ready) and
 * supports lazy translation:
 *
 *   - If the user is in the source locale, render blocks as-is.
 *   - If the user is in a non-source locale and a fresh translation exists,
 *     it's already merged in by `getResourceContent`.
 *   - If the user is in a non-source locale and no fresh translation exists,
 *     fire `requestTranslation` and refetch. The "Show in source language"
 *     toggle lets the user opt out.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, ExternalLink, Languages, Loader2 } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { useI18nContext } from "@/i18n/i18n-react";
import { selectLocale, useLocaleStore } from "@/stores/localeStore";
import { getResourceById } from "@/services/resourcesApi";
import { getResourceContent, requestTranslation } from "@/services/resourceContentApi";
import { queryKeys } from "@/lib/queryKeys";
import { isReaderAvailable } from "@/types/blocks";
import { BlockRenderer } from "@/components/reader/BlockRenderer";

export function Component() {
  const { resourceId = "" } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const { LL } = useI18nContext();
  const uiLocale = useLocaleStore(selectLocale);
  const queryClient = useQueryClient();

  // User toggle: render in source language (skip translation lookup entirely).
  const [forceSource, setForceSource] = useState(false);

  const resourceQuery = useQuery({
    queryKey: queryKeys.resourceById(resourceId),
    queryFn: () => getResourceById(resourceId),
    enabled: Boolean(resourceId),
  });

  // Locale used for the content fetch. The "source" sentinel tells
  // getResourceContent to skip the translation join.
  const renderLocale = forceSource ? "source" : uiLocale;

  const contentQuery = useQuery({
    queryKey: queryKeys.resourceContent(resourceId, renderLocale),
    queryFn: () => getResourceContent(resourceId, renderLocale),
    enabled: Boolean(resourceId) && isReaderAvailable(resourceQuery.data?.availability),
  });

  const translateMutation = useMutation({
    mutationFn: () => requestTranslation(resourceId, uiLocale),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.resourceContent(resourceId, uiLocale),
      });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : LL.reader.translateFailed());
    },
  });

  // Auto-translate on first render in a non-source locale when nothing is
  // cached yet. We only kick it off once per (resource, locale) pair per
  // page session — TanStack Query's cache handles subsequent visits.
  const content = contentQuery.data ?? null;
  const sourceLang = content?.manifest.sourceLang ?? null;
  const needsAutoTranslate =
    !forceSource &&
    !translateMutation.isPending &&
    !translateMutation.isSuccess &&
    Boolean(content) &&
    content!.blocks.length > 0 &&
    sourceLang !== null &&
    uiLocale !== sourceLang &&
    !content!.translated;

  useEffect(() => {
    if (needsAutoTranslate) translateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAutoTranslate]);

  const publishedRelative = useMemo(() => {
    const iso = resourceQuery.data?.publishedAt;
    if (!iso) return null;
    try {
      return formatDistanceToNow(parseISO(iso), { addSuffix: true });
    } catch {
      return null;
    }
  }, [resourceQuery.data?.publishedAt]);

  if (resourceQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const resource = resourceQuery.data;
  if (!resource) {
    return (
      <EmptyState
        icon={BookOpen}
        title={LL.reader.notFoundTitle()}
        description={LL.reader.notFoundDescription()}
        action={
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            {LL.reader.back()}
          </Button>
        }
      />
    );
  }

  const readerOK = isReaderAvailable(resource.availability);

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />
        {LL.reader.back()}
      </Button>

      <PageHeader
        eyebrow={LL.reader.eyebrow()}
        title={resource.title}
        description={resource.summary ?? undefined}
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={resource.url} target="_blank" rel="noreferrer" aria-label={LL.reader.openOriginalAria()}>
              {LL.reader.openOriginal()}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-caption-xs text-content-tertiary">
        {resource.sourceName ? (
          <span className="font-medium text-content-secondary">{resource.sourceName}</span>
        ) : null}
        {resource.author ? <span>· {LL.reader.authorLabel({ author: resource.author })}</span> : null}
        {publishedRelative ? <span>· {LL.reader.publishedLabel({ date: publishedRelative })}</span> : null}
        {!readerOK ? (
          <Badge variant="muted">{availabilityBadge(resource.availability, LL)}</Badge>
        ) : null}
      </div>

      {readerOK && content && sourceLang && uiLocale !== sourceLang ? (
        <TranslationBanner
          translated={content.translated}
          translator={content.translator}
          sourceLang={sourceLang}
          uiLocale={uiLocale}
          forceSource={forceSource}
          isTranslating={translateMutation.isPending}
          onTranslate={() => {
            setForceSource(false);
            translateMutation.mutate();
          }}
          onShowSource={() => setForceSource(true)}
          onShowTranslated={() => setForceSource(false)}
        />
      ) : null}

      {!readerOK ? (
        <EmptyState
          icon={BookOpen}
          title={LL.reader.notReadyTitle()}
          description={LL.reader.notReadyDescription()}
          action={
            <Button asChild>
              <a href={resource.url} target="_blank" rel="noreferrer">
                {LL.reader.openOriginal()}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          }
        />
      ) : contentQuery.isLoading ? (
        <Card variant="elevated">
          <CardContent className="space-y-3 p-6 sm:p-8">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
      ) : contentQuery.isError || !content ? (
        <EmptyState
          title={LL.reader.importFailedTitle()}
          description={
            contentQuery.error instanceof Error
              ? contentQuery.error.message
              : LL.reader.importFailedDescription()
          }
        />
      ) : (
        <Card variant="elevated">
          <CardContent className="prose-academy p-6 sm:p-8">
            <BlockRenderer blocks={content.blocks} />
          </CardContent>
        </Card>
      )}
    </article>
  );
}

function TranslationBanner({
  translated,
  translator,
  sourceLang,
  uiLocale,
  forceSource,
  isTranslating,
  onTranslate,
  onShowSource,
  onShowTranslated,
}: {
  translated: boolean;
  translator: string | null;
  sourceLang: string;
  uiLocale: string;
  forceSource: boolean;
  isTranslating: boolean;
  onTranslate: () => void;
  onShowSource: () => void;
  onShowTranslated: () => void;
}) {
  const { LL } = useI18nContext();
  const targetLabel = uiLocale.toUpperCase();
  const sourceLabel = sourceLang.toUpperCase();

  if (isTranslating) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-soft p-3 text-body-sm text-content-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{LL.reader.translatingNow()}</span>
      </div>
    );
  }

  if (forceSource) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-soft p-3 text-body-sm text-content-secondary">
        <span className="flex items-center gap-2">
          <Languages className="h-4 w-4" />
          {sourceLabel}
        </span>
        <Button size="sm" variant="ghost" onClick={onShowTranslated}>
          {LL.reader.translateAction({ locale: targetLabel })}
        </Button>
      </div>
    );
  }

  if (translated) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-soft p-3 text-body-sm text-content-secondary">
        <span className="flex items-center gap-2">
          <Languages className="h-4 w-4" />
          {LL.reader.translatedFromSource({ sourceLang: sourceLabel })}
          {translator ? (
            <span className="text-caption-xs text-content-tertiary">
              · {LL.reader.translatedBy({ provider: translator })}
            </span>
          ) : null}
        </span>
        <Button size="sm" variant="ghost" onClick={onShowSource}>
          {LL.reader.showSource()}
        </Button>
      </div>
    );
  }

  // Not translated yet — offer the action.
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-soft p-3 text-body-sm text-content-secondary">
      <span className="flex items-center gap-2">
        <Languages className="h-4 w-4" />
        {sourceLabel}
      </span>
      <Button size="sm" variant="outline" onClick={onTranslate}>
        {LL.reader.translateAction({ locale: targetLabel })}
      </Button>
    </div>
  );
}

function availabilityBadge(
  availability: string,
  LL: ReturnType<typeof useI18nContext>["LL"],
): string {
  switch (availability) {
    case "excerpt_only":
      return LL.reader.availabilityExcerptOnly();
    case "full_text_unavailable":
      return LL.reader.availabilityUnavailable();
    default:
      return LL.reader.availabilityMetadataOnly();
  }
}

export default Component;
