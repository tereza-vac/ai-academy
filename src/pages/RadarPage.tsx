import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceCard } from "@/components/resource-card";
import { listResources } from "@/services/resourcesApi";
import { listSavedItems, saveResource, unsaveResource } from "@/services/libraryApi";
import { queryKeys } from "@/lib/queryKeys";
import { normalizeString } from "@/lib/utils";
import type { Resource } from "@/types/domain";

const KINDS: Array<{ value: "all" | Resource["kind"]; label: string }> = [
  { value: "all", label: "All" },
  { value: "article", label: "Articles" },
  { value: "paper", label: "Papers" },
  { value: "release", label: "Releases" },
  { value: "tool", label: "Tools" },
];

export function Component() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | Resource["kind"]>("all");

  const resourcesQuery = useQuery({
    queryKey: queryKeys.resources(),
    queryFn: () => listResources(),
  });

  const savedQuery = useQuery({
    queryKey: queryKeys.savedItems,
    queryFn: listSavedItems,
  });

  const savedIds = useMemo(
    () => new Set((savedQuery.data ?? []).map((s) => s.resourceId)),
    [savedQuery.data],
  );

  const toggleSave = useMutation({
    mutationFn: async (input: { resourceId: string; saved: boolean }) => {
      if (input.saved) return unsaveResource(input.resourceId);
      return saveResource({ resourceId: input.resourceId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedItems });
      toast.success(variables.saved ? "Removed from Library" : "Saved to Library");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update Library"),
  });

  const filtered = useMemo(() => {
    let list = resourcesQuery.data ?? [];
    if (kind !== "all") list = list.filter((r) => r.kind === kind);
    if (search.trim()) {
      const q = normalizeString(search);
      list = list.filter((r) =>
        [r.title, r.summary ?? "", r.sourceName ?? "", r.tags.join(" ")]
          .map((s) => normalizeString(s))
          .some((s) => s.includes(q)),
      );
    }
    return list;
  }, [resourcesQuery.data, search, kind]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Radar"
        title="What's new in AI"
        description="A unified feed of articles, papers, releases and tools — pulled from registered RSS sources and curated picks. Save anything to your Library."
        actions={
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.resources() })}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, summary, tags…"
            className="pl-9"
          />
        </div>
        <Tabs value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
          <TabsList>
            {KINDS.map((k) => (
              <TabsTrigger key={k.value} value={k.value}>
                {k.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {resourcesQuery.isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
          : filtered.length === 0
            ? (
                <div className="md:col-span-2">
                  <EmptyState
                    title="Nothing matches your filters"
                    description="Try a different search term or kind."
                  />
                </div>
              )
            : filtered.map((r) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  isSaved={savedIds.has(r.id)}
                  onToggleSave={() =>
                    toggleSave.mutate({ resourceId: r.id, saved: savedIds.has(r.id) })
                  }
                />
              ))}
      </div>
    </div>
  );
}

export default Component;
