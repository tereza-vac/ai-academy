import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  Plus,
  Search as SearchIcon,
  Sparkles,
  StickyNote,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceCard } from "@/components/resource-card";
import { listSavedItems, unsaveResource } from "@/services/libraryApi";
import { listCanonicalResources, listResources } from "@/services/resourcesApi";
import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
} from "@/services/notesApi";
import { queryKeys } from "@/lib/queryKeys";
import { useI18nContext } from "@/i18n/i18n-react";
import { selectLocale, useLocaleStore } from "@/stores/localeStore";
import type { Resource } from "@/types/domain";
import type { TranslationFunctions } from "@/i18n/i18n-types";

export function Component() {
  const { LL } = useI18nContext();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={LL.library.eyebrow()}
        title={LL.library.title()}
        description={LL.library.description()}
      />

      <SearchPromptCard LL={LL} />

      <Tabs defaultValue="saved">
        <TabsList>
          <TabsTrigger value="saved">
            <Bookmark className="h-3.5 w-3.5" />
            {LL.library.tabSaved()}
          </TabsTrigger>
          <TabsTrigger value="notes">
            <StickyNote className="h-3.5 w-3.5" />
            {LL.library.tabNotes()}
          </TabsTrigger>
          <TabsTrigger value="canon">
            <Sparkles className="h-3.5 w-3.5" />
            {LL.library.tabCanon()}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved">
          <SavedList />
        </TabsContent>
        <TabsContent value="notes">
          <NotesList />
        </TabsContent>
        <TabsContent value="canon">
          <CanonList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SearchPromptCard({ LL }: { LL: TranslationFunctions }) {
  return (
    <Card variant="soft" className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-primary">
            <SearchIcon className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <div className="text-body-md font-semibold tracking-tight text-content-primary">
              {LL.library.searchCardTitle()}
            </div>
            <p className="text-body-sm text-content-secondary">
              {LL.library.searchCardDescription()}
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link to="/library/search">
            {LL.library.searchCardCta()}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function SavedList() {
  const { LL } = useI18nContext();
  const locale = useLocaleStore(selectLocale);
  const queryClient = useQueryClient();
  const savedQuery = useQuery({
    queryKey: queryKeys.savedItems,
    queryFn: listSavedItems,
  });
  const resourcesQuery = useQuery({
    queryKey: [...queryKeys.resources(), locale],
    queryFn: () => listResources(),
  });

  const items = useMemo(() => {
    const resources = resourcesQuery.data ?? [];
    return (savedQuery.data ?? [])
      .map((s) => ({ saved: s, resource: resources.find((r) => r.id === s.resourceId) }))
      .filter((row): row is { saved: typeof row.saved; resource: NonNullable<typeof row.resource> } =>
        Boolean(row.resource),
      );
  }, [savedQuery.data, resourcesQuery.data]);

  const unsave = useMutation({
    mutationFn: unsaveResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedItems });
      toast.success(LL.radar.removedToast());
    },
  });

  if (savedQuery.isLoading || resourcesQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title={LL.library.emptyTitle()}
        description={LL.library.emptyDescription()}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map(({ resource }) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          isSaved
          onToggleSave={() => unsave.mutate(resource.id)}
        />
      ))}
    </div>
  );
}

function CanonList() {
  const { LL } = useI18nContext();
  const locale = useLocaleStore(selectLocale);
  const canonQuery = useQuery({
    queryKey: ["resources", "canonical", locale],
    queryFn: listCanonicalResources,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Resource[]>();
    for (const r of canonQuery.data ?? []) {
      const category = r.canonicalCategory ?? "other";
      const list = map.get(category) ?? [];
      list.push(r);
      map.set(category, list);
    }
    // Categories that exist in the i18n labels — keep stable order.
    const order = [
      "foundations",
      "models",
      "alignment",
      "prompting",
      "agents",
      "rag",
      "scaling",
      "multimodal",
      "reasoning",
      "other",
    ];
    return order
      .map((category) => ({ category, items: map.get(category) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [canonQuery.data]);

  if (canonQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title={LL.library.canonEmptyTitle()}
        description={LL.library.canonEmptyDescription()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="text-caption-xs uppercase tracking-wide text-content-tertiary">
          {LL.library.canonEyebrow()}
        </div>
        <h2 className="text-heading-md font-semibold tracking-tight text-content-primary">
          {LL.library.canonTitle()}
        </h2>
        <p className="max-w-2xl text-body-md text-content-secondary">
          {LL.library.canonDescription()}
        </p>
      </div>
      {grouped.map(({ category, items }) => (
        <section key={category} className="space-y-3">
          <h3 className="text-body-lg font-semibold tracking-tight text-content-primary">
            {canonCategoryLabel(category, LL)}
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {items.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function canonCategoryLabel(category: string, LL: TranslationFunctions): string {
  switch (category) {
    case "foundations": return LL.library.canonCategoryFoundations();
    case "models":      return LL.library.canonCategoryModels();
    case "alignment":   return LL.library.canonCategoryAlignment();
    case "prompting":   return LL.library.canonCategoryPrompting();
    case "agents":      return LL.library.canonCategoryAgents();
    case "rag":         return LL.library.canonCategoryRag();
    case "scaling":     return LL.library.canonCategoryScaling();
    case "multimodal":  return LL.library.canonCategoryMultimodal();
    case "reasoning":   return LL.library.canonCategoryReasoning();
    default:            return LL.library.canonCategoryOther();
  }
}

function NotesList() {
  const { LL } = useI18nContext();
  const queryClient = useQueryClient();
  const notesQuery = useQuery({ queryKey: queryKeys.notes, queryFn: listNotes });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const create = useMutation({
    mutationFn: () => createNote({ title: title.trim(), body: body.trim() || null }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      toast.success("Note added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add note"),
  });

  const update = useMutation({
    mutationFn: (input: { id: string; body: string }) => updateNote(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notes }),
  });

  const remove = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      toast.success("Note deleted");
    },
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
      <div className="space-y-3">
        {notesQuery.isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (notesQuery.data ?? []).length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title={LL.library.notesEmptyTitle()}
            description={LL.library.notesEmptyDescription()}
          />
        ) : (
          (notesQuery.data ?? []).map((n) => {
            const updated = (() => {
              try {
                return formatDistanceToNow(parseISO(n.updatedAt), { addSuffix: true });
              } catch {
                return null;
              }
            })();
            return (
              <Card key={n.id} variant="elevated" className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-body-lg font-semibold tracking-tight text-content-primary">
                      {n.title}
                    </h3>
                    {updated ? (
                      <div className="text-caption-xs text-content-tertiary">
                        Updated {updated}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove.mutate(n.id)}
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  defaultValue={n.body ?? ""}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value !== (n.body ?? "")) {
                      update.mutate({ id: n.id, body: value });
                    }
                  }}
                  placeholder="Write your note…"
                  className="mt-3 min-h-[100px]"
                />
                {n.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {n.tags.map((tag) => (
                      <Badge key={tag} variant="outline">#{tag}</Badge>
                    ))}
                  </div>
                ) : null}
              </Card>
            );
          })
        )}
      </div>

      <Card variant="soft" className="h-fit lg:sticky lg:top-4">
        <CardHeader>
          <CardTitle className="text-body-md">New note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What did you learn?"
            className="min-h-[120px]"
          />
          <Button
            disabled={!title.trim() || create.isPending}
            onClick={() => create.mutate()}
            className="w-full"
          >
            <Plus className="h-4 w-4" />
            Add note
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default Component;
