import { supabase } from "@/integrations/supabase/client";
import { isMock } from "@/lib/dataMode";
import { localizeBuildLabItem } from "@/lib/contentLocalization";
import { mockBuildLab } from "@/lib/mockData";
import type { BuildLabItem, BuildLabKind } from "@/types/domain";

interface BuildLabRow {
  id: string;
  slug: string;
  title: string;
  title_key: string | null;
  summary: string | null;
  summary_key: string | null;
  kind: BuildLabKind;
  body_md: string;
  body_key: string | null;
  tags: string[];
  topic_ids: string[];
  author: string | null;
  position: number;
}

function mapItem(row: BuildLabRow): BuildLabItem {
  return {
    id: row.id, slug: row.slug, title: row.title,
    titleKey: row.title_key,
    summary: row.summary, kind: row.kind, bodyMd: row.body_md,
    summaryKey: row.summary_key,
    bodyKey: row.body_key,
    tags: row.tags ?? [], topicIds: row.topic_ids ?? [],
    author: row.author, position: row.position,
  };
}

const SELECT = "id,slug,title,title_key,summary,summary_key,kind,body_md,body_key,tags,topic_ids,author,position";

export async function listBuildLabItems(opts?: { kind?: BuildLabKind }): Promise<BuildLabItem[]> {
  if (isMock) {
    let items = [...mockBuildLab];
    if (opts?.kind) items = items.filter((i) => i.kind === opts.kind);
    return items.map(localizeBuildLabItem).sort((a, b) => a.position - b.position);
  }

  let query = supabase
    .from("build_lab_items")
    .select(SELECT)
    .eq("is_published", true)
    .order("position");
  if (opts?.kind) query = query.eq("kind", opts.kind);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapItem(row as unknown as BuildLabRow)).map(localizeBuildLabItem);
}

export async function getBuildLabItemBySlug(slug: string): Promise<BuildLabItem | null> {
  if (isMock) {
    const item = mockBuildLab.find((i) => i.slug === slug);
    return item ? localizeBuildLabItem(item) : null;
  }

  const { data, error } = await supabase
    .from("build_lab_items")
    .select(SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? localizeBuildLabItem(mapItem(data as unknown as BuildLabRow)) : null;
}
