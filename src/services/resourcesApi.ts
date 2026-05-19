import { supabase } from "@/integrations/supabase/client";
import { isMock } from "@/lib/dataMode";
import { mockResources } from "@/lib/mockData";
import type { Resource, ResourceKind } from "@/types/domain";

interface ResourceRow {
  id: string;
  url: string;
  title: string;
  source_name: string | null;
  kind: ResourceKind;
  summary: string | null;
  author: string | null;
  published_at: string | null;
  image_url: string | null;
  tags: string[];
  topic_ids: string[];
  enrichment_status: Resource["enrichmentStatus"];
}

function mapResource(row: ResourceRow): Resource {
  return {
    id: row.id, url: row.url, title: row.title,
    sourceName: row.source_name, kind: row.kind,
    summary: row.summary, author: row.author,
    publishedAt: row.published_at, imageUrl: row.image_url,
    tags: row.tags ?? [], topicIds: row.topic_ids ?? [],
    enrichmentStatus: row.enrichment_status,
  };
}

const SELECT =
  "id,url,title,source_name,kind,summary,author,published_at,image_url,tags,topic_ids,enrichment_status";

export async function listResources(opts?: { topicId?: string; limit?: number }): Promise<Resource[]> {
  if (isMock) {
    let items = [...mockResources];
    if (opts?.topicId) items = items.filter((r) => r.topicIds.includes(opts.topicId!));
    items.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    return opts?.limit ? items.slice(0, opts.limit) : items;
  }

  let query = supabase
    .from("resources")
    .select(SELECT)
    .order("published_at", { ascending: false, nullsFirst: false });
  if (opts?.topicId) query = query.contains("topic_ids", [opts.topicId]);
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapResource);
}

export async function getResourceById(id: string): Promise<Resource | null> {
  if (isMock) return mockResources.find((r) => r.id === id) ?? null;

  const { data, error } = await supabase
    .from("resources")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapResource(data) : null;
}
