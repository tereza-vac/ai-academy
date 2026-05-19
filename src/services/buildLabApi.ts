import { supabase } from "@/integrations/supabase/client";
import { isMock } from "@/lib/dataMode";
import { mockBuildLab } from "@/lib/mockData";
import type { BuildLabItem, BuildLabKind } from "@/types/domain";

interface BuildLabRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  kind: BuildLabKind;
  body_md: string;
  tags: string[];
  topic_ids: string[];
  author: string | null;
  position: number;
}

function mapItem(row: BuildLabRow): BuildLabItem {
  return {
    id: row.id, slug: row.slug, title: row.title,
    summary: row.summary, kind: row.kind, bodyMd: row.body_md,
    tags: row.tags ?? [], topicIds: row.topic_ids ?? [],
    author: row.author, position: row.position,
  };
}

const SELECT = "id,slug,title,summary,kind,body_md,tags,topic_ids,author,position";

export async function listBuildLabItems(opts?: { kind?: BuildLabKind }): Promise<BuildLabItem[]> {
  if (isMock) {
    let items = [...mockBuildLab];
    if (opts?.kind) items = items.filter((i) => i.kind === opts.kind);
    return items.sort((a, b) => a.position - b.position);
  }

  let query = supabase
    .from("build_lab_items")
    .select(SELECT)
    .eq("is_published", true)
    .order("position");
  if (opts?.kind) query = query.eq("kind", opts.kind);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapItem(row as unknown as BuildLabRow));
}

export async function getBuildLabItemBySlug(slug: string): Promise<BuildLabItem | null> {
  if (isMock) return mockBuildLab.find((i) => i.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("build_lab_items")
    .select(SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapItem(data as unknown as BuildLabRow) : null;
}
