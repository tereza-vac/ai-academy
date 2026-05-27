import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { listRadarItems, saveRadarItem } from "@/services/radarApi";
import { getResourceById } from "@/services/resourcesApi";
import { queryKeys } from "@/lib/queryKeys";
import { normalizeString, cn } from "@/lib/utils";
import { useI18nContext } from "@/i18n/i18n-react";
import { selectLocale, useLocaleStore } from "@/stores/localeStore";
import { ResourceActions } from "@/components/reader/ResourceActions";
import type { RadarItem, RadarKind, ResourceAvailability } from "@/types/domain";
import type { TranslationFunctions } from "@/i18n/i18n-types";

type Tab = "all" | "paper" | "release" | "article" | "community";
type Sort = "recommended" | "recent";

const TABS: ReadonlyArray<{ value: Tab; kind: RadarKind | null }> = [
  { value: "all",       kind: null },
  { value: "paper",     kind: "paper" },
  { value: "release",   kind: "release" },
  { value: "article",   kind: "article" },
  { value: "community", kind: "community" },
];

function tabLabel(value: Tab, LL: TranslationFunctions): string {
  switch (value) {
    case "all":       return LL.radar.tabAll();
    case "paper":     return LL.radar.tabPapers();
    case "release":   return LL.radar.tabReleases();
    case "article":   return LL.radar.tabBlogs();
    case "community": return LL.radar.tabCommunity();
  }
}

export function Component() {
  const { LL } = useI18nContext();
  const queryClient = useQueryClient();
  const locale = useLocaleStore(selectLocale);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<Sort>("recommended");
  // Items the user just saved this session — gives instant visual feedback
  // without needing to cross-reference saved_items.resource_id.
  const [justSaved, setJustSaved] = useState<Set<string>>(new Set());

  const radarQuery = useQuery({
    queryKey: [...queryKeys.radar(), { sort, locale }],
    queryFn: () => listRadarItems({ sort, limit: 60 }),
  });

  const saveMutation = useMutation({
    mutationFn: (item: RadarItem) => saveRadarItem(item),
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedItems });
      setJustSaved((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });
      toast.success(LL.radar.savedToast());
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : LL.radar.saveFailed());
    },
  });

  const filtered = useMemo(() => {
    let list = radarQuery.data ?? [];
    const activeTab = TABS.find((t) => t.value === tab);
    if (activeTab?.kind) list = list.filter((r) => r.kind === activeTab.kind);
    if (search.trim()) {
      const q = normalizeString(search);
      list = list.filter((r) =>
        [r.title, r.summary ?? "", r.sourceName ?? "", r.tags.join(" ")]
          .map((s) => normalizeString(s))
          .some((s) => s.includes(q)),
      );
    }
    return list;
  }, [radarQuery.data, search, tab]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={LL.radar.eyebrow()}
        title={LL.radar.title()}
        description={LL.radar.description()}
        actions={
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.radar() })}
            disabled={radarQuery.isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", radarQuery.isFetching && "animate-spin")} />
            {LL.radar.refresh()}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={LL.radar.searchPlaceholder()}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <TabsList>
              <TabsTrigger value="recommended">
                <Sparkles className="h-3.5 w-3.5" />
                {LL.radar.sortRecommended()}
              </TabsTrigger>
              <TabsTrigger value="recent">
                <TrendingUp className="h-3.5 w-3.5" />
                {LL.radar.sortRecent()}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {tabLabel(t.value, LL)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {radarQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
        ) : radarQuery.isError ? (
          <div className="md:col-span-2">
            <EmptyState
              title={LL.radar.errorTitle()}
              description={
                radarQuery.error instanceof Error
                  ? radarQuery.error.message
                  : String(radarQuery.error)
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="md:col-span-2">
            <EmptyState
              title={LL.radar.emptyTitle()}
              description={LL.radar.emptyDescription()}
            />
          </div>
        ) : (
          filtered.map((item) => (
            <RadarItemCard
              key={item.id}
              item={item}
              isSaving={saveMutation.isPending && saveMutation.variables?.id === item.id}
              isSaved={justSaved.has(item.id)}
              onSave={() => saveMutation.mutate(item)}
              LL={LL}
            />
          ))
        )}
      </div>
    </div>
  );
}

function RadarItemCard({
  item,
  isSaved,
  isSaving,
  onSave,
  LL,
}: {
  item: RadarItem;
  isSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
  LL: TranslationFunctions;
}) {
  const published = item.publishedAt
    ? safeFormat(item.publishedAt)
    : null;

  // Resources for radar items aren't denormalized into radar_items — fetch
  // the resource lazily on hover-or-mount so the Reader button can light up
  // for already-imported items. Falls back to availability=undefined → button
  // hidden, which is fine.
  const resourceQuery = useQuery({
    queryKey: queryKeys.resourceById(item.resourceId ?? ""),
    queryFn: () => getResourceById(item.resourceId!),
    enabled: Boolean(item.resourceId),
    staleTime: 60_000,
  });
  const availability: ResourceAvailability | undefined =
    resourceQuery.data?.availability;

  return (
    <Card variant="elevated" interactive className="p-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-caption-xs text-content-tertiary">
          {item.kind ? <Badge variant={kindToVariant(item.kind)}>{kindLabel(item.kind)}</Badge> : null}
          {item.sourceName ? (
            <span className="font-medium text-content-secondary">{item.sourceName}</span>
          ) : null}
          {published ? (
            <>
              <span>·</span>
              <span>{published}</span>
            </>
          ) : null}
          {item.hfUpvotes && item.hfUpvotes > 0 ? (
            <>
              <span>·</span>
              <span>{LL.radar.upvotesLabel({ count: item.hfUpvotes })}</span>
            </>
          ) : null}
        </div>

        <h3 className="text-body-lg font-semibold leading-snug tracking-tight text-content-primary">
          {item.title}
        </h3>

        {item.summary ? (
          <p className="line-clamp-3 text-body-md text-content-secondary">{item.summary}</p>
        ) : null}

        {item.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.slice(0, 5).map((tag) => (
              <Badge key={tag} variant="outline">#{tag}</Badge>
            ))}
          </div>
        ) : null}

        <div className="pt-1">
          <ResourceActions
            originalUrl={item.link}
            resourceId={item.resourceId}
            availability={availability}
            saveSlot={
              <Button
                variant={isSaved ? "secondary" : "ghost"}
                size="sm"
                onClick={onSave}
                disabled={isSaving || isSaved}
                aria-label={isSaved ? LL.radar.unsaveAction() : LL.radar.saveAction()}
              >
                {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {isSaved ? LL.radar.unsaveAction() : LL.radar.saveAction()}
              </Button>
            }
          />
        </div>
      </div>
    </Card>
  );
}

function safeFormat(iso: string): string | null {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return null;
  }
}

function kindLabel(kind: RadarKind): string {
  // We deliberately keep these in English because they're short type labels
  // and the surrounding chrome (eyebrow, tabs, etc.) is already localized.
  switch (kind) {
    case "paper":     return "Paper";
    case "release":   return "Release";
    case "article":   return "Article";
    case "community": return "Community";
    case "tool":      return "Tool";
    case "video":     return "Video";
    case "podcast":   return "Podcast";
    case "tweet":     return "Post";
    default:          return "Item";
  }
}

function kindToVariant(kind: RadarKind): "default" | "muted" | "success" | "premium" | "warning" {
  switch (kind) {
    case "paper":     return "premium";
    case "release":   return "default";
    case "tool":      return "success";
    case "community": return "muted";
    default:          return "muted";
  }
}

export default Component;
