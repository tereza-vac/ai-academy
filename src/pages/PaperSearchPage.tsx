import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Search as SearchIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useI18nContext } from "@/i18n/i18n-react";
import { selectLocale, useLocaleStore } from "@/stores/localeStore";
import {
  type PapersSearchInput,
  type PapersSearchResult,
  savePaperHit,
  searchPapers,
} from "@/services/papersSearchApi";
import { ResourceActions } from "@/components/reader/ResourceActions";
import type { PaperHit } from "@/types/domain";

type Sort = NonNullable<PapersSearchInput["sort"]>;

const SORTS: ReadonlyArray<Sort> = ["relevance", "citations", "year"];

export function Component() {
  const { LL } = useI18nContext();
  const locale = useLocaleStore(selectLocale);

  // Draft (form state) vs committed (the query we actually run).
  const [draftQuery, setDraftQuery] = useState("");
  const [yearMin, setYearMin] = useState<string>("");
  const [yearMax, setYearMax] = useState<string>("");
  const [minCitations, setMinCitations] = useState<string>("");
  const [sort, setSort] = useState<Sort>("relevance");
  const [committed, setCommitted] = useState<PapersSearchInput | null>(null);
  const [justSaved, setJustSaved] = useState<Set<string>>(new Set());

  const searchQuery = useQuery({
    queryKey: ["paperSearch", committed, locale],
    queryFn: () => searchPapers(committed!),
    enabled: Boolean(committed && committed.query.trim().length >= 2),
    staleTime: 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: (hit: PaperHit) => savePaperHit(hit),
    onSuccess: (_, hit) => {
      setJustSaved((prev) => {
        const next = new Set(prev);
        next.add(hit.externalId);
        return next;
      });
      toast.success(LL.paperSearch.savedToast());
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : LL.paperSearch.saveFailed()),
  });

  useEffect(() => {
    // When sort changes, re-issue the same query so we don't have to click "Search" again.
    if (!committed) return;
    if (committed.sort === sort) return;
    setCommitted({ ...committed, sort });
  }, [sort, committed]);

  const reset = () => {
    setYearMin("");
    setYearMax("");
    setMinCitations("");
    setSort("relevance");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draftQuery.trim().length < 2) return;
    setCommitted({
      query: draftQuery.trim(),
      sort,
      limit: 30,
      yearMin: yearMin ? Number(yearMin) : undefined,
      yearMax: yearMax ? Number(yearMax) : undefined,
      minCitations: minCitations ? Number(minCitations) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/library">
          <ArrowLeft className="h-4 w-4" />
          {LL.library.eyebrow()}
        </Link>
      </Button>

      <PageHeader
        eyebrow={LL.paperSearch.eyebrow()}
        title={LL.paperSearch.title()}
        description={LL.paperSearch.description()}
      />

      <Card variant="soft" className="p-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary" />
              <Input
                value={draftQuery}
                onChange={(e) => setDraftQuery(e.target.value)}
                placeholder={LL.paperSearch.searchPlaceholder()}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={draftQuery.trim().length < 2 || searchQuery.isFetching}>
              <SearchIcon className="h-4 w-4" />
              {searchQuery.isFetching ? LL.paperSearch.searching() : LL.paperSearch.searchAction()}
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <FilterField label={LL.paperSearch.yearMinLabel()}>
              <Input
                inputMode="numeric"
                value={yearMin}
                onChange={(e) => setYearMin(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                className="w-24"
                placeholder="2017"
              />
            </FilterField>
            <FilterField label={LL.paperSearch.yearMaxLabel()}>
              <Input
                inputMode="numeric"
                value={yearMax}
                onChange={(e) => setYearMax(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                className="w-24"
                placeholder="2026"
              />
            </FilterField>
            <FilterField label={LL.paperSearch.minCitationsLabel()}>
              <Input
                inputMode="numeric"
                value={minCitations}
                onChange={(e) => setMinCitations(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                className="w-28"
                placeholder="100"
              />
            </FilterField>
            <FilterField label={LL.paperSearch.sortLabel()}>
              <Tabs value={sort} onValueChange={(v) => setSort(v as Sort)}>
                <TabsList>
                  {SORTS.map((s) => (
                    <TabsTrigger key={s} value={s}>
                      {sortLabel(s, LL)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </FilterField>
            <Button type="button" variant="ghost" size="sm" onClick={reset} className="ml-auto">
              {LL.paperSearch.reset()}
            </Button>
          </div>
        </form>
      </Card>

      <Results
        query={searchQuery.data}
        isLoading={searchQuery.isLoading || searchQuery.isFetching}
        hasCommitted={Boolean(committed)}
        savedExternalIds={justSaved}
        savingExternalId={saveMutation.isPending ? saveMutation.variables?.externalId ?? null : null}
        onSave={(hit) => saveMutation.mutate(hit)}
        LL={LL}
      />
    </div>
  );
}

function sortLabel(s: Sort, LL: ReturnType<typeof useI18nContext>["LL"]): string {
  if (s === "citations") return LL.paperSearch.sortCitations();
  if (s === "year") return LL.paperSearch.sortYear();
  return LL.paperSearch.sortRelevance();
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-caption-xs text-content-tertiary">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Results({
  query,
  isLoading,
  hasCommitted,
  savedExternalIds,
  savingExternalId,
  onSave,
  LL,
}: {
  query: PapersSearchResult | undefined;
  isLoading: boolean;
  hasCommitted: boolean;
  savedExternalIds: Set<string>;
  savingExternalId: string | null;
  onSave: (hit: PaperHit) => void;
  LL: ReturnType<typeof useI18nContext>["LL"];
}) {
  const upstreamErrors = useMemo(() => {
    return query?.upstreamErrors?.filter(Boolean) ?? [];
  }, [query?.upstreamErrors]);

  if (!hasCommitted) {
    return (
      <EmptyState
        icon={SearchIcon}
        title={LL.paperSearch.startTitle()}
        description={LL.paperSearch.startDescription()}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  if (!query || query.hits.length === 0) {
    return (
      <EmptyState
        title={LL.paperSearch.emptyTitle()}
        description={LL.paperSearch.emptyDescription()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-body-md font-semibold text-content-primary">
          {LL.paperSearch.resultsHeader({ count: query.count })}
        </h2>
        {upstreamErrors.length > 0 ? (
          <span className="text-caption-xs text-content-tertiary">
            {LL.paperSearch.upstreamWarning({ sources: upstreamErrors.join("; ") })}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-3">
        {query.hits.map((hit) => (
          <PaperHitCard
            key={hit.externalId}
            hit={hit}
            isSaved={savedExternalIds.has(hit.externalId)}
            isSaving={savingExternalId === hit.externalId}
            onSave={() => onSave(hit)}
            LL={LL}
          />
        ))}
      </div>
    </div>
  );
}

function PaperHitCard({
  hit,
  isSaved,
  isSaving,
  onSave,
  LL,
}: {
  hit: PaperHit;
  isSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
  LL: ReturnType<typeof useI18nContext>["LL"];
}) {
  return (
    <Card variant="elevated" className="p-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-caption-xs text-content-tertiary">
          <Badge variant="premium">{hit.source}</Badge>
          {hit.year ? <span>{LL.paperSearch.yearLabel({ year: hit.year })}</span> : null}
          {hit.venue ? <span>· {hit.venue}</span> : null}
          {typeof hit.citationCount === "number" && hit.citationCount > 0 ? (
            <span>· {LL.paperSearch.citationsLabel({ count: hit.citationCount })}</span>
          ) : null}
        </div>

        <h3 className="text-body-lg font-semibold leading-snug tracking-tight text-content-primary">
          {hit.title}
        </h3>

        {hit.abstract ? (
          <p className="line-clamp-3 text-body-md text-content-secondary">{hit.abstract}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 text-caption-xs text-content-tertiary">
          {hit.authors.length > 0 ? (
            <span className="line-clamp-1">{hit.authors.slice(0, 6).join(", ")}</span>
          ) : null}
          {hit.pdfUrl ? (
            <a href={hit.pdfUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              {LL.paperSearch.pdfLabel()}
            </a>
          ) : null}
        </div>

        <div className="pt-1">
          {/* PaperHit has no resourceId until saved, so the "Read in AI Academy"
              button stays hidden pre-save. After save the result is re-rendered
              with a real Resource (and its availability) by the parent surface. */}
          <ResourceActions
            originalUrl={hit.url}
            resourceId={null}
            availability={null}
            saveSlot={
              <Button
                variant={isSaved ? "secondary" : "default"}
                size="sm"
                onClick={onSave}
                disabled={isSaved || isSaving}
              >
                {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {isSaved ? LL.paperSearch.savedAction() : LL.paperSearch.saveAction()}
              </Button>
            }
          />
        </div>
      </div>
    </Card>
  );
}

export default Component;
