import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { cs, enUS, pl, sk } from "date-fns/locale";
import { Boxes, Cpu, Images, Lock, RefreshCw, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ModelCard } from "@/components/spectrum/ModelCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getModelsCatalogMeta, listLlmModels } from "@/services/modelsApi";
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

  const modelsQuery = useQuery({
    queryKey: [...queryKeys.llmModels(), { sort }],
    queryFn: () => listLlmModels({ sort }),
  });

  const metaQuery = useQuery({
    queryKey: queryKeys.llmModelsMeta,
    queryFn: getModelsCatalogMeta,
  });

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
      const q = normalizeString(search);
      list = list.filter((m) =>
        modelSearchHaystack(m).some((s) => s.includes(q)),
      );
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
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: queryKeys.llmModels() });
              queryClient.invalidateQueries({ queryKey: queryKeys.llmModelsMeta });
            }}
            disabled={modelsQuery.isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", modelsQuery.isFetching && "animate-spin")} />
            {LL.spectrum.refresh()}
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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={LL.spectrum.searchPlaceholder()}
            className="pl-9"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="flex h-auto flex-wrap">
              {(["all", "commercial", "open_source", "multimodal", "niche"] as const).map((t) => (
                <TabsTrigger key={t} value={t} className="text-caption-xs sm:text-body-sm">
                  {tabLabel(t, LL)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Tabs value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <TabsList>
              <TabsTrigger value="popular">{LL.spectrum.sortPopular()}</TabsTrigger>
              <TabsTrigger value="name">{LL.spectrum.sortName()}</TabsTrigger>
              <TabsTrigger value="recent">{LL.spectrum.sortRecent()}</TabsTrigger>
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

function modelSearchHaystack(m: LlmModel): string[] {
  return [
    m.name,
    m.provider,
    m.summary ?? "",
    m.family ?? "",
    m.tags.join(" "),
    m.typicalUseCases.join(" "),
  ].map(normalizeString);
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
