import { supabase } from "@/integrations/supabase/client";
import { isMock } from "@/lib/dataMode";
import { mockRadar } from "@/lib/mockData";
import type { RadarItem } from "@/types/domain";

interface RadarRow {
  id: string;
  link: string;
  title: string;
  summary: string | null;
  author: string | null;
  published_at: string | null;
  rss_sources: { name: string | null; category: string | null } | null;
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
  };
}

export async function listRadarItems(opts?: { limit?: number; category?: string }): Promise<RadarItem[]> {
  if (isMock) {
    let items = [...mockRadar];
    if (opts?.category) items = items.filter((r) => r.sourceCategory === opts.category);
    items.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    return opts?.limit ? items.slice(0, opts.limit) : items;
  }

  let query = supabase
    .from("radar_items")
    .select("id,link,title,summary,author,published_at,rss_sources(name,category)")
    .order("published_at", { ascending: false, nullsFirst: false });
  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.category) query = query.eq("rss_sources.category", opts.category);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRadar(row as unknown as RadarRow));
}
