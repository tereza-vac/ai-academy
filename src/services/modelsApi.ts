import { supabase } from "@/integrations/supabase/client";
import { isMock } from "@/lib/dataMode";
import { mockLlmModels } from "@/lib/mockData";
import type { LlmLicenseType, LlmModel, LlmPopularityTier, LlmModelSource } from "@/types/domain";

interface LlmModelRow {
  id: string;
  slug: string;
  name: string;
  provider: string;
  family: string | null;
  license_type: LlmLicenseType;
  modalities: string[] | null;
  context_window: number | null;
  parameter_count: string | null;
  release_date: string | null;
  summary: string | null;
  description_md: string | null;
  typical_use_cases: string[] | null;
  strengths: string[] | null;
  limitations: string[] | null;
  tags: string[] | null;
  homepage_url: string | null;
  docs_url: string | null;
  pricing_hint: string | null;
  is_niche: boolean;
  popularity_tier: LlmPopularityTier;
  external_id: string | null;
  source: LlmModelSource;
  score: number;
  fetched_at: string;
}

const SELECT =
  "id,slug,name,provider,family,license_type,modalities,context_window,parameter_count," +
  "release_date,summary,description_md,typical_use_cases,strengths,limitations,tags," +
  "homepage_url,docs_url,pricing_hint,is_niche,popularity_tier,external_id,source,score,fetched_at";

function mapModel(row: LlmModelRow): LlmModel {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    provider: row.provider,
    family: row.family,
    licenseType: row.license_type,
    modalities: row.modalities ?? [],
    contextWindow: row.context_window,
    parameterCount: row.parameter_count,
    releaseDate: row.release_date,
    summary: row.summary,
    descriptionMd: row.description_md,
    typicalUseCases: row.typical_use_cases ?? [],
    strengths: row.strengths ?? [],
    limitations: row.limitations ?? [],
    tags: row.tags ?? [],
    homepageUrl: row.homepage_url,
    docsUrl: row.docs_url,
    pricingHint: row.pricing_hint,
    isNiche: row.is_niche,
    popularityTier: row.popularity_tier,
    externalId: row.external_id,
    source: row.source,
    score: row.score,
    fetchedAt: row.fetched_at,
  };
}

export interface ListModelsOptions {
  limit?: number;
  licenseType?: LlmLicenseType;
  popularityTier?: LlmPopularityTier;
  /** "popular" = score desc, "name" = alphabetical, "recent" = release_date desc */
  sort?: "popular" | "name" | "recent";
}

export async function listLlmModels(opts: ListModelsOptions = {}): Promise<LlmModel[]> {
  if (isMock) {
    let items = [...mockLlmModels];
    if (opts.licenseType) items = items.filter((m) => m.licenseType === opts.licenseType);
    if (opts.popularityTier) items = items.filter((m) => m.popularityTier === opts.popularityTier);
    items = sortModels(items, opts.sort);
    return opts.limit ? items.slice(0, opts.limit) : items;
  }

  let query = supabase.from("llm_models").select(SELECT);

  if (opts.sort === "name") {
    query = query.order("name", { ascending: true });
  } else if (opts.sort === "recent") {
    query = query.order("release_date", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("score", { ascending: false });
  }

  if (opts.licenseType) query = query.eq("license_type", opts.licenseType);
  if (opts.popularityTier) query = query.eq("popularity_tier", opts.popularityTier);
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapModel(row as unknown as LlmModelRow));
}

export async function getLlmModelBySlug(slug: string): Promise<LlmModel | null> {
  if (isMock) {
    return mockLlmModels.find((m) => m.slug === slug) ?? null;
  }

  const { data, error } = await supabase
    .from("llm_models")
    .select(SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapModel(data as unknown as LlmModelRow) : null;
}

/**
 * Triggers a live catalog refresh by invoking the `models-ingest` edge function
 * (OpenRouter + Hugging Face). Resolves once the upstream upsert has completed,
 * so the caller can safely refetch fresh rows afterwards. No-op in mock mode.
 */
export async function triggerModelsCatalogSync(): Promise<void> {
  if (isMock) return;

  const { error } = await supabase.functions.invoke("models-ingest", {
    body: {},
  });
  if (error) throw new Error(error.message);
}

export async function getModelsCatalogMeta(): Promise<{ count: number; lastFetchedAt: string | null }> {
  if (isMock) {
    const latest = mockLlmModels.reduce(
      (max, m) => (m.fetchedAt > max ? m.fetchedAt : max),
      "",
    );
    return { count: mockLlmModels.length, lastFetchedAt: latest || null };
  }

  const { count, error: countErr } = await supabase
    .from("llm_models")
    .select("id", { count: "exact", head: true });
  if (countErr) throw new Error(countErr.message);

  const { data, error } = await supabase
    .from("llm_models")
    .select("fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return {
    count: count ?? 0,
    lastFetchedAt: (data as { fetched_at?: string } | null)?.fetched_at ?? null,
  };
}

function sortModels(items: LlmModel[], sort: ListModelsOptions["sort"]): LlmModel[] {
  if (sort === "name") return [...items].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "recent") {
    return [...items].sort((a, b) =>
      (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""),
    );
  }
  return [...items].sort((a, b) => b.score - a.score);
}
