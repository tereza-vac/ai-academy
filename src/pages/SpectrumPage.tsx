import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { cs, enUS, pl, sk } from "date-fns/locale";
import { Boxes, Cpu, Images, Lock, RefreshCw, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ModelCard } from "@/components/spectrum/ModelCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getModelsCatalogMeta,
  listLlmModels,
  triggerModelsCatalogSync,
} from "@/services/modelsApi";
import { queryKeys } from "@/lib/queryKeys";
import { normalizeString, cn } from "@/lib/utils";
import { useI18nContext } from "@/i18n/i18n-react";
import { selectLocale, useLocaleStore } from "@/stores/localeStore";
import type { LlmLicenseType, LlmModel } from "@/types/domain";

type Tab = "all" | "commercial" | "open_source" | "multimodal" | "niche";
type Sort = "popular" | "name" | "recent";

const TAB_LICENSE: Partial<Record<Tab, LlmLicenseType>> = {
  commercial: "commercial",
  open_source: "open_source",
};

const dateFnsLocale = { cs, en: enUS, pl, sk } as const;

export function Component() {
  const { LL } = useI18nContext();
  const queryClient = useQueryClient();
  const locale = useLocaleStore(selectLocale);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<Sort>("popular");
  const [isSyncing, setIsSyncing] = useState(false);

  const modelsQuery = useQuery({
    queryKey: [...queryKeys.llmModels(), { sort }],
    queryFn: () => listLlmModels({ sort }),
  });

  const metaQuery = useQuery({
    queryKey: queryKeys.llmModelsMeta,
    queryFn: getModelsCatalogMeta,
  });

  const refetchCatalog = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.llmModels() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.llmModelsMeta }),
    ]);

  const handleRefresh = async () => {
    setIsSyncing(true);
    const toastId = toast.loading(LL.spectrum.syncing());
    try {
      // Pull the latest models from OpenRouter / Hugging Face, then re-read.
      await triggerModelsCatalogSync();
      await refetchCatalog();
      toast.success(LL.spectrum.syncDone(), { id: toastId });
    } catch {
      // Edge function unreachable (or mock mode) — still re-read the DB so the
      // button does something useful instead of silently failing.
      await refetchCatalog();
      toast.error(LL.spectrum.syncFailed(), { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    let list = modelsQuery.data ?? [];

    if (tab === "multimodal") {
      list = list.filter((m) =>
        m.modalities.some((mod) => mod !== "text"),
      );
    } else if (tab === "niche") {
      list = list.filter((m) => m.isNiche || m.popularityTier === "niche");
    } else if (TAB_LICENSE[tab]) {
      list = list.filter((m) => m.licenseType === TAB_LICENSE[tab]);
    }

    if (search.trim()) {
      const tokens = normalizeString(search).split(/\s+/).filter(Boolean);
      list = list
        .map((m) => ({ model: m, relevance: searchRelevance(m, tokens) }))
        .filter((x) => x.relevance > 0)
        // Most relevant first; break ties by the catalog's own popularity score.
        .sort((a, b) => b.relevance - a.relevance || b.model.score - a.model.score)
        .map((x) => x.model);
    }
    return list;
  }, [modelsQuery.data, search, tab]);

  const counts = useMemo(() => {
    const list = modelsQuery.data ?? [];
    return {
      total: metaQuery.data?.count ?? list.length,
      commercial: list.filter((m) => m.licenseType === "commercial").length,
      openSource: list.filter((m) => m.licenseType === "open_source").length,
      multimodal: list.filter((m) => m.modalities.some((mod) => mod !== "text")).length,
    };
  }, [modelsQuery.data, metaQuery.data]);

  const lastUpdated = metaQuery.data?.lastFetchedAt
    ? formatDistanceToNow(parseISO(metaQuery.data.lastFetchedAt), {
        addSuffix: true,
        locale: dateFnsLocale[locale],
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={LL.spectrum.eyebrow()}
        title={LL.spectrum.title()}
        description={LL.spectrum.description()}
        actions={
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isSyncing || modelsQuery.isFetching}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                (isSyncing || modelsQuery.isFetching) && "animate-spin",
              )}
            />
            {isSyncing ? LL.spectrum.syncing() : LL.spectrum.refresh()}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={LL.spectrum.statModels()}
          value={counts.total}
          icon={Cpu}
          tone="brand"
        />
        <StatCard
          label={LL.spectrum.tabCommercial()}
          value={counts.commercial}
          icon={Lock}
          tone="premium"
        />
        <StatCard
          label={LL.spectrum.tabOpenSource()}
          value={counts.openSource}
          icon={Boxes}
          tone="success"
        />
        <StatCard
          label={LL.spectrum.tabMultimodal()}
          value={counts.multimodal}
          icon={Images}
          tone="brand"
        />
      </div>

      <p className="flex items-center gap-1.5 text-caption-xs text-content-tertiary">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--premium))]" />
        <span>{LL.spectrum.catalogNote()}</span>
        {lastUpdated ? (
          <span className="text-content-tertiary/70">· {LL.spectrum.lastUpdated({ when: lastUpdated })}</span>
        ) : null}
      </p>

      <div className="space-y-3">
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={LL.spectrum.searchPlaceholder()}
            className="pl-9"
          />
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="flex h-auto flex-wrap justify-start gap-1 rounded-2xl">
              {(["all", "commercial", "open_source", "multimodal", "niche"] as const).map((t) => (
                <TabsTrigger key={t} value={t} className="text-caption-xs sm:text-body-sm">
                  {tabLabel(t, LL)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Tabs value={sort} onValueChange={(v) => setSort(v as Sort)} className="lg:shrink-0">
            <TabsList className="flex h-auto flex-wrap gap-1 rounded-2xl">
              <TabsTrigger value="popular" className="text-caption-xs sm:text-body-sm">
                {LL.spectrum.sortPopular()}
              </TabsTrigger>
              <TabsTrigger value="name" className="text-caption-xs sm:text-body-sm">
                {LL.spectrum.sortName()}
              </TabsTrigger>
              <TabsTrigger value="recent" className="text-caption-xs sm:text-body-sm">
                {LL.spectrum.sortRecent()}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {modelsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : modelsQuery.isError ? (
        <EmptyState
          icon={Cpu}
          title={LL.spectrum.errorTitle()}
          description={modelsQuery.error instanceof Error ? modelsQuery.error.message : undefined}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Cpu}
          title={LL.spectrum.emptyTitle()}
          description={LL.spectrum.emptyDescription()}
        />
      ) : (
        <>
          <p className="text-caption-xs text-content-tertiary">
            {LL.spectrum.showingCount({ count: filtered.length })}
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((model) => (
              <ModelCard key={model.id} model={model} LL={LL} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Relevance score for a model against the (already normalized) query tokens.
 *
 * Every token must match at least one field (AND semantics), otherwise the
 * model is excluded (score 0). When it matches, more important fields (name,
 * provider) contribute more, and a name-prefix hit is boosted — so e.g. typing
 * "claude fable" ranks "Claude Fable 5" above a model that only mentions it.
 */
function searchRelevance(m: LlmModel, tokens: string[]): number {
  if (tokens.length === 0) return 1;

  const name = normalizeString(m.name);
  const fields: Array<{ text: string; weight: number }> = [
    { text: name, weight: 6 },
    { text: normalizeString(m.provider), weight: 4 },
    { text: normalizeString(m.family ?? ""), weight: 3 },
    { text: normalizeString(m.tags.join(" ")), weight: 2 },
    { text: normalizeString(m.summary ?? ""), weight: 1 },
    { text: normalizeString(m.typicalUseCases.join(" ")), weight: 1 },
  ];

  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const { text, weight } of fields) {
      if (text.includes(token)) best = Math.max(best, weight);
    }
    if (best === 0) return 0; // a required token matched nothing
    if (name.startsWith(token)) best += 4;
    total += best;
  }
  return total;
}

function tabLabel(tab: Tab, LL: ReturnType<typeof useI18nContext>["LL"]): string {
  switch (tab) {
    case "all": return LL.spectrum.tabAll();
    case "commercial": return LL.spectrum.tabCommercial();
    case "open_source": return LL.spectrum.tabOpenSource();
    case "multimodal": return LL.spectrum.tabMultimodal();
    case "niche": return LL.spectrum.tabNiche();
  }
}
