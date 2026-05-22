import { supabase } from "@/integrations/supabase/client";
import { API_CONFIG } from "@/config/api";
import { isMock } from "@/lib/dataMode";
import { saveResource } from "@/services/libraryApi";
import { upsertExternalResource } from "@/services/resourcesApi";
import { mockPaperHits } from "@/lib/mockData";
import type { PaperHit, Resource, SavedItem } from "@/types/domain";

export interface PapersSearchInput {
  query: string;
  limit?: number;
  yearMin?: number;
  yearMax?: number;
  minCitations?: number;
  sort?: "relevance" | "citations" | "year";
}

export interface PapersSearchResult {
  query: string;
  sort: "relevance" | "citations" | "year";
  count: number;
  hits: PaperHit[];
  upstreamErrors: string[];
}

/**
 * Hit the `papers-search` Edge Function. In mock mode we filter a small
 * canned list so the UI is testable offline.
 */
export async function searchPapers(input: PapersSearchInput): Promise<PapersSearchResult> {
  const trimmed = input.query.trim();
  if (trimmed.length < 2) {
    return { query: trimmed, sort: input.sort ?? "relevance", count: 0, hits: [], upstreamErrors: [] };
  }

  if (isMock) {
    const q = trimmed.toLowerCase();
    const hits = mockPaperHits
      .filter((p) => [p.title, p.abstract ?? "", p.authors.join(" ")].some((s) => s.toLowerCase().includes(q)))
      .filter((p) => (input.yearMin ? (p.year ?? 0) >= input.yearMin : true))
      .filter((p) => (input.yearMax ? (p.year ?? 0) <= input.yearMax : true))
      .filter((p) => (input.minCitations ? (p.citationCount ?? 0) >= input.minCitations : true))
      .slice(0, input.limit ?? 20);
    return {
      query: trimmed,
      sort: input.sort ?? "relevance",
      count: hits.length,
      hits,
      upstreamErrors: [],
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? API_CONFIG.SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(API_CONFIG.PAPERS_SEARCH_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: API_CONFIG.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Search failed with HTTP ${res.status}`);
  }
  const json = (await res.json()) as { data: PapersSearchResult | null; error: string | null };
  if (json.error || !json.data) {
    throw new Error(json.error ?? "Search returned no data");
  }
  return json.data;
}

/**
 * Save a search hit into the user's library by minting a `resources` row
 * for it (idempotent by URL) and then saving that resource.
 */
export async function savePaperHit(hit: PaperHit): Promise<{ resource: Resource; saved: SavedItem }> {
  const tags: string[] = [hit.source];
  if (hit.year) tags.push(String(hit.year));
  if (hit.venue) tags.push(hit.venue);

  const resource = await upsertExternalResource({
    url: hit.url,
    title: hit.title,
    summary: hit.abstract,
    sourceName: hit.venue ?? hit.source,
    kind: "paper",
    author: hit.authors.length > 0 ? hit.authors.slice(0, 4).join(", ") : null,
    publishedAt: hit.year ? `${hit.year}-01-01T00:00:00Z` : null,
    tags,
    externalId: hit.externalId,
  });

  const saved = await saveResource({ resourceId: resource.id });
  return { resource, saved };
}
