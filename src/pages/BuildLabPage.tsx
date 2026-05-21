import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ClipboardCopy, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Markdown } from "@/components/markdown";
import { listBuildLabItems } from "@/services/buildLabApi";
import { queryKeys } from "@/lib/queryKeys";
import { normalizeString } from "@/lib/utils";
import { useI18nContext } from "@/i18n/i18n-react";
import type { BuildLabKind } from "@/types/domain";

const KINDS: Array<{ value: "all" | BuildLabKind; label: string }> = [
  { value: "all", label: "All" },
  { value: "prompt", label: "Prompts" },
  { value: "playbook", label: "Playbooks" },
  { value: "template", label: "Templates" },
  { value: "checklist", label: "Checklists" },
];

const kindBadge: Record<BuildLabKind, "default" | "premium" | "success" | "warning"> = {
  prompt: "default",
  playbook: "premium",
  template: "success",
  checklist: "warning",
};

export function Component() {
  const { LL } = useI18nContext();
  const [kind, setKind] = useState<"all" | BuildLabKind>("all");
  const [search, setSearch] = useState("");

  const itemsQuery = useQuery({
    queryKey: queryKeys.buildLab(),
    queryFn: () => listBuildLabItems(),
  });

  const items = useMemo(() => {
    let list = itemsQuery.data ?? [];
    if (kind !== "all") list = list.filter((i) => i.kind === kind);
    if (search.trim()) {
      const q = normalizeString(search);
      list = list.filter((i) =>
        [i.title, i.summary ?? "", i.tags.join(" ")]
          .map(normalizeString)
          .some((s) => s.includes(q)),
      );
    }
    return list;
  }, [itemsQuery.data, kind, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={LL.buildLab.eyebrow()}
        title={LL.buildLab.title()}
        description={LL.buildLab.description()}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, tag…"
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

      {itemsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Nothing here yet"
          description="Add prompts and playbooks via the Supabase seed file or directly in the table."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((item) => (
            <BuildLabCard
              key={item.id}
              title={item.title}
              summary={item.summary ?? ""}
              kind={item.kind}
              tags={item.tags}
              body={item.bodyMd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BuildLabCard({
  title,
  summary,
  kind,
  tags,
  body,
}: {
  title: string;
  summary: string;
  kind: BuildLabKind;
  tags: string[];
  body: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <Card variant="elevated" className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <Badge variant={kindBadge[kind]}>{kind}</Badge>
          <Button variant="ghost" size="sm" onClick={copy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <CardTitle>{title}</CardTitle>
        {summary ? (
          <p className="text-body-md text-content-secondary">{summary}</p>
        ) : null}
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
          <Markdown source={body} />
        </div>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline">#{tag}</Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default Component;
