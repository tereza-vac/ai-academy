import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Plus, StickyNote, Trash2 } from "lucide-react";
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
import { listResources } from "@/services/resourcesApi";
import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
} from "@/services/notesApi";
import { queryKeys } from "@/lib/queryKeys";
import { useI18nContext } from "@/i18n/i18n-react";

export function Component() {
  const { LL } = useI18nContext();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={LL.library.eyebrow()}
        title={LL.library.title()}
        description={LL.library.description()}
      />

      <Tabs defaultValue="saved">
        <TabsList>
          <TabsTrigger value="saved">
            <Bookmark className="h-3.5 w-3.5" />
            Saved
          </TabsTrigger>
          <TabsTrigger value="notes">
            <StickyNote className="h-3.5 w-3.5" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved">
          <SavedList />
        </TabsContent>
        <TabsContent value="notes">
          <NotesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SavedList() {
  const queryClient = useQueryClient();
  const savedQuery = useQuery({
    queryKey: queryKeys.savedItems,
    queryFn: listSavedItems,
  });
  const resourcesQuery = useQuery({
    queryKey: queryKeys.resources(),
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
      toast.success("Removed");
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
        title="Nothing saved yet"
        description="Hit the bookmark on any Radar item or topic resource to save it here."
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

function NotesList() {
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
            title="No notes yet"
            description="Capture short, scannable notes as you learn. Notes are private and editable in place."
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
