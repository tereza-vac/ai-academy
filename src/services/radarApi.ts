import { supabase } from "@/integrations/supabase/client";
import { isMock } from "@/lib/dataMode";
import { mockRadar } from "@/lib/mockData";
import { saveResource } from "@/services/libraryApi";
import { upsertExternalResource } from "@/services/resourcesApi";
import type {
  RadarItem,
  RadarKind,
  RadarSourceType,
  Resource,
  SavedItem,
} from "@/types/domain";

interface RadarRow {
  id: string;
  link: string;
  title: string;
  summary: string | null;
  author: string | null;
  published_at: string | null;
  kind: RadarKind | null;
  tags: string[] | null;
  hf_upvotes: number | null;
  external_id: string | null;
  score: number | null;
  resource_id: string | null;
  rss_sources: {
    name: string | null;
    category: string | null;
    source_type: RadarSourceType | null;
  } | null;
}

function mapRadar(row: RadarRow): RadarItem {
  return {
    id: row.id,
    link: row.link,
    title: row.title,
    summary: row.summary,
    author: row.author,
    publishedAt: row.published_at,
    sourceName: row.rss_sources?.name ?? null,
    sourceCategory: row.rss_sources?.category ?? null,
    sourceType: row.rss_sources?.source_type ?? null,
    kind: row.kind,
    tags: row.tags ?? [],
    hfUpvotes: row.hf_upvotes,
    externalId: row.external_id,
    score: row.score,
    resourceId: row.resource_id,
  };
}

const SELECT =
  "id,link,title,summary,author,published_at,kind,tags,hf_upvotes,external_id,score,resource_id," +
  "rss_sources(name,category,source_type)";

export interface ListRadarOptions {
  limit?: number;
  /** Filter by source.category (research/product/news/community). */
  category?: string;
  /** Filter by item kind (paper/release/article/community/…). */
  kind?: RadarKind;
  /** "recommended" = global score, "recent" = published_at desc. */
  sort?: "recommended" | "recent";
}

function sortItems(items: RadarItem[], sort: ListRadarOptions["sort"]): RadarItem[] {
  if (sort === "recommended") {
    return [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }
  return [...items].sort((a, b) =>
    (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
}

export async function listRadarItems(opts: ListRadarOptions = {}): Promise<RadarItem[]> {
  if (isMock) {
    let items = [...mockRadar];
    if (opts.category) items = items.filter((r) => r.sourceCategory === opts.category);
    if (opts.kind) items = items.filter((r) => r.kind === opts.kind);
    items = sortItems(items, opts.sort);
    return opts.limit ? items.slice(0, opts.limit) : items;
  }

  let query = supabase.from("radar_items").select(SELECT);

  // Push sorting to Postgres so `limit` works correctly.
  if (opts.sort === "recommended") {
    query = query.order("score", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("published_at", { ascending: false, nullsFirst: false });
  }

  if (opts.kind) query = query.eq("kind", opts.kind);
  if (opts.category) query = query.eq("rss_sources.category", opts.category);
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRadar(row as unknown as RadarRow));
}

/**
 * Save a Radar item into the user's library.
 *
 * Auto-upserts a `resources` row keyed on the item URL, then writes the
 * `saved_items` row through the existing library service. Falls back to
 * existing `radar_items.resource_id` when present so we don't re-mint a
 * resource that's already linked.
 */
export async function saveRadarItem(item: RadarItem, opts?: { note?: string; tags?: string[] }): Promise<{
  resource: Resource | null;
  saved: SavedItem;
}> {
  let resource: Resource | null = null;
  // If radar-ingest has already linked the item to a resource (future
  // enrichment path), we can save against that id directly without minting.
  if (!item.resourceId) {
    resource = await upsertExternalResource({
      url: item.link,
      title: item.title,
      summary: item.summary,
      sourceName: item.sourceName,
      kind: (item.kind ?? "article") as Resource["kind"],
      author: item.author,
      publishedAt: item.publishedAt,
      tags: item.tags,
      externalId: item.externalId,
    });
  }
  const resourceId = item.resourceId ?? resource?.id;
  if (!resourceId) throw new Error("Could not derive a resource id for this Radar item.");

  const saved = await saveResource({
    resourceId,
    note: opts?.note,
    tags: opts?.tags,
  });
  return { resource, saved };
}
