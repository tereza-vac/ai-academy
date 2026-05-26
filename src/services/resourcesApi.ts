import { supabase } from "@/integrations/supabase/client";
import { isMock } from "@/lib/dataMode";
import { localizeResource } from "@/lib/contentLocalization";
import { mockResources } from "@/lib/mockData";
import type { ExternalResourceInput, Resource, ResourceKind } from "@/types/domain";

interface ResourceRow {
  id: string;
  url: string;
  title: string;
  title_key: string | null;
  source_name: string | null;
  kind: ResourceKind;
  summary: string | null;
  summary_key: string | null;
  author: string | null;
  published_at: string | null;
  image_url: string | null;
  tags: string[];
  topic_ids: string[];
  enrichment_status: Resource["enrichmentStatus"];
  external_id?: string | null;
  is_canonical?: boolean | null;
  canonical_category?: string | null;
  canonical_position?: number | null;
}

function mapResource(row: ResourceRow): Resource {
  return {
    id: row.id, url: row.url, title: row.title,
    titleKey: row.title_key,
    sourceName: row.source_name, kind: row.kind,
    summary: row.summary, author: row.author,
    summaryKey: row.summary_key,
    publishedAt: row.published_at, imageUrl: row.image_url,
    tags: row.tags ?? [], topicIds: row.topic_ids ?? [],
    enrichmentStatus: row.enrichment_status,
    externalId: row.external_id ?? null,
    isCanonical: Boolean(row.is_canonical),
    canonicalCategory: row.canonical_category ?? null,
    canonicalPosition: row.canonical_position ?? null,
  };
}

const SELECT =
  "id,url,title,title_key,source_name,kind,summary,summary_key,author,published_at,image_url,tags,topic_ids,enrichment_status,external_id,is_canonical,canonical_category,canonical_position";

export async function listResources(opts?: { topicId?: string; limit?: number }): Promise<Resource[]> {
  if (isMock) {
    let items = [...mockResources];
    if (opts?.topicId) items = items.filter((r) => r.topicIds.includes(opts.topicId!));
    items.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    const localized = items.map(localizeResource);
    return opts?.limit ? localized.slice(0, opts.limit) : localized;
  }

  let query = supabase
    .from("resources")
    .select(SELECT)
    .order("published_at", { ascending: false, nullsFirst: false });
  if (opts?.topicId) query = query.contains("topic_ids", [opts.topicId]);
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapResource).map(localizeResource);
}

export async function getResourceById(id: string): Promise<Resource | null> {
  if (isMock) {
    const resource = mockResources.find((r) => r.id === id);
    return resource ? localizeResource(resource) : null;
  }

  const { data, error } = await supabase
    .from("resources")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? localizeResource(mapResource(data)) : null;
}

/**
 * List canonical / foundational resources, ordered by category then position.
 * In mock mode this returns whichever mock resources opted into the flag.
 */
export async function listCanonicalResources(): Promise<Resource[]> {
  if (isMock) {
    return mockResources
      .filter((r) => r.isCanonical)
      .sort((a, b) => {
        const cat = (a.canonicalCategory ?? "").localeCompare(b.canonicalCategory ?? "");
        if (cat !== 0) return cat;
        return (a.canonicalPosition ?? 999) - (b.canonicalPosition ?? 999);
      })
      .map(localizeResource);
  }

  const { data, error } = await supabase
    .from("resources")
    .select(SELECT)
    .eq("is_canonical", true)
    .order("canonical_category", { ascending: true, nullsFirst: false })
    .order("canonical_position", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapResource).map(localizeResource);
}

/**
 * Mint or refresh a `resources` row from any external item (Radar pick,
 * Scholar hit, manual entry). Idempotent by `url`. Resources upserted this
 * way carry `enrichment_status='pending'` so the `ai-enrich` worker can
 * fill summary/tags/embedding later.
 */
export async function upsertExternalResource(input: ExternalResourceInput): Promise<Resource> {
  if (isMock) {
    const existing = mockResources.find((r) => r.url === input.url);
    if (existing) return localizeResource(existing);
    const minted: Resource = {
      id: `mock-resource-${input.url}`,
      url: input.url,
      title: input.title,
      titleKey: null,
      sourceName: input.sourceName ?? null,
      kind: input.kind ?? "article",
      summary: input.summary ?? null,
      summaryKey: null,
      author: input.author ?? null,
      publishedAt: input.publishedAt ?? null,
      imageUrl: null,
      tags: input.tags ?? [],
      topicIds: [],
      enrichmentStatus: "pending",
      externalId: input.externalId ?? null,
      isCanonical: false,
      canonicalCategory: null,
      canonicalPosition: null,
    };
    mockResources.push(minted);
    return localizeResource(minted);
  }

  // Route through the SECURITY DEFINER RPC so regular users can mint external
  // resources without needing editor/admin RLS. See migration
  // 20260101000012_external_resource_rpc.sql for the policy rationale.
  const { data: newId, error: rpcError } = await supabase.rpc(
    "upsert_external_resource",
    {
      p_url: input.url,
      p_title: input.title,
      p_source_name: input.sourceName ?? null,
      p_kind: input.kind ?? "article",
      p_summary: input.summary ?? null,
      p_author: input.author ?? null,
      p_published_at: input.publishedAt ?? null,
      p_tags: input.tags ?? [],
      p_external_id: input.externalId ?? null,
    },
  );
  if (rpcError) throw new Error(rpcError.message);
  if (!newId) throw new Error("upsert_external_resource returned no id");

  const { data, error } = await supabase
    .from("resources")
    .select(SELECT)
    .eq("id", newId as string)
    .single();
  if (error) throw new Error(error.message);
  return localizeResource(mapResource(data as ResourceRow));
}
