/**
 * Scholar-like paper search edge function.
 *
 * POST { query: string, limit?: number, yearMin?: number, yearMax?: number,
 *        minCitations?: number, sort?: 'relevance' | 'citations' | 'year' }
 *
 * Fans out to Semantic Scholar + OpenAlex in parallel (and optionally arXiv
 * for very recent preprints), normalizes into a single `PaperHit` shape, and
 * dedupes by DOI -> arXiv id -> normalized title.
 *
 * No upstream API keys are required. Semantic Scholar offers a free tier
 * (rate-limited, polite use only). OpenAlex is fully open. arXiv is free.
 *
 * Designed to power /library/search in the client.
 */
import { serve, jsonResponse, ok, err } from "../_shared/handler.ts";
import { parseFeed } from "../_shared/rss.ts";

const USER_AGENT = Deno.env.get("PAPERS_SEARCH_USER_AGENT")
  ?? "AI-Academy-Scholar/0.1 (contact: support@local)";

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------
interface SearchInput {
  query: string;
  limit?: number;
  yearMin?: number;
  yearMax?: number;
  minCitations?: number;
  sort?: "relevance" | "citations" | "year";
}

interface PaperHit {
  externalId: string;          // canonical dedup key (DOI: / arXiv: / s2:)
  doi: string | null;
  arxivId: string | null;
  source: "semanticScholar" | "openalex" | "arxiv";
  url: string;
  title: string;
  abstract: string | null;
  authors: string[];
  year: number | null;
  venue: string | null;
  citationCount: number | null;
  pdfUrl: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TIMEOUT_MS = 8000;

async function fetchJsonWithTimeout(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTextWithTimeout(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "application/atom+xml" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickExternalId(hit: { doi: string | null; arxivId: string | null; source: PaperHit["source"]; url: string }): string {
  if (hit.doi) return `DOI:${hit.doi}`;
  if (hit.arxivId) return `arXiv:${hit.arxivId}`;
  return `${hit.source}:${hit.url}`;
}

function clampLimit(n: number | undefined): number {
  if (!n || !Number.isFinite(n)) return 20;
  return Math.max(1, Math.min(50, Math.floor(n)));
}

// ---------------------------------------------------------------------------
// Semantic Scholar
// https://api.semanticscholar.org/graph/v1/paper/search
// ---------------------------------------------------------------------------
interface S2Paper {
  paperId: string;
  externalIds?: { DOI?: string; ArXiv?: string };
  url?: string;
  title?: string;
  abstract?: string | null;
  year?: number | null;
  venue?: string | null;
  citationCount?: number | null;
  authors?: Array<{ name?: string }>;
  openAccessPdf?: { url?: string } | null;
}

async function searchSemanticScholar(input: SearchInput): Promise<PaperHit[]> {
  const params = new URLSearchParams({
    query: input.query,
    limit: String(clampLimit(input.limit)),
    fields:
      "paperId,externalIds,url,title,abstract,year,venue,citationCount,authors.name,openAccessPdf",
  });
  if (input.yearMin || input.yearMax) {
    const lo = input.yearMin ?? "";
    const hi = input.yearMax ?? "";
    params.set("year", `${lo}-${hi}`);
  }
  if (input.minCitations && input.minCitations > 0) {
    params.set("minCitationCount", String(input.minCitations));
  }

  const url = `https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`;
  const json = await fetchJsonWithTimeout(url);
  const items = ((json as { data?: S2Paper[] }).data) ?? [];
  return items
    .filter((p) => p.title)
    .map((p): PaperHit => {
      const doi = p.externalIds?.DOI ?? null;
      const arxivId = p.externalIds?.ArXiv ?? null;
      const hitUrl = p.url ?? (arxivId ? `https://arxiv.org/abs/${arxivId}` : "");
      const partial = {
        doi,
        arxivId,
        source: "semanticScholar" as const,
        url: hitUrl,
      };
      return {
        ...partial,
        externalId: pickExternalId(partial),
        title: (p.title ?? "").trim(),
        abstract: p.abstract ?? null,
        authors: (p.authors ?? []).map((a) => a.name).filter(Boolean) as string[],
        year: p.year ?? null,
        venue: p.venue ?? null,
        citationCount: p.citationCount ?? null,
        pdfUrl: p.openAccessPdf?.url ?? null,
      };
    });
}

// ---------------------------------------------------------------------------
// OpenAlex
// https://api.openalex.org/works?search=...
// ---------------------------------------------------------------------------
interface OaWork {
  id?: string;
  doi?: string | null;
  title?: string | null;
  display_name?: string | null;
  publication_year?: number | null;
  cited_by_count?: number | null;
  authorships?: Array<{ author?: { display_name?: string } }>;
  primary_location?: {
    source?: { display_name?: string | null } | null;
    landing_page_url?: string | null;
    pdf_url?: string | null;
  } | null;
  open_access?: { oa_url?: string | null } | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  ids?: { doi?: string | null; mag?: string | null; openalex?: string | null };
}

function reconstructAbstract(idx: Record<string, number[]> | null | undefined): string | null {
  if (!idx) return null;
  const words: string[] = [];
  for (const [word, positions] of Object.entries(idx)) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }
  const joined = words.filter(Boolean).join(" ").trim();
  return joined.length > 0 ? joined : null;
}

function extractArxivFromOaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/i);
  return m ? m[1] : null;
}

async function searchOpenAlex(input: SearchInput): Promise<PaperHit[]> {
  const params = new URLSearchParams({
    search: input.query,
    "per-page": String(clampLimit(input.limit)),
  });
  const filters: string[] = [];
  if (input.yearMin) filters.push(`from_publication_date:${input.yearMin}-01-01`);
  if (input.yearMax) filters.push(`to_publication_date:${input.yearMax}-12-31`);
  if (input.minCitations && input.minCitations > 0) {
    filters.push(`cited_by_count:>${input.minCitations - 1}`);
  }
  if (filters.length > 0) params.set("filter", filters.join(","));
  if (input.sort === "citations") params.set("sort", "cited_by_count:desc");
  else if (input.sort === "year") params.set("sort", "publication_year:desc");

  const url = `https://api.openalex.org/works?${params.toString()}`;
  const json = await fetchJsonWithTimeout(url);
  const items = ((json as { results?: OaWork[] }).results) ?? [];
  return items
    .filter((w) => w.title || w.display_name)
    .map((w): PaperHit => {
      const doiRaw = w.doi ?? w.ids?.doi ?? null;
      const doi = doiRaw ? doiRaw.replace(/^https?:\/\/doi\.org\//i, "") : null;
      const landing = w.primary_location?.landing_page_url ?? null;
      const arxivId = extractArxivFromOaUrl(landing);
      const hitUrl = landing
        ?? (doi ? `https://doi.org/${doi}` : "")
        ?? (arxivId ? `https://arxiv.org/abs/${arxivId}` : "");
      const partial = {
        doi,
        arxivId,
        source: "openalex" as const,
        url: hitUrl,
      };
      return {
        ...partial,
        externalId: pickExternalId(partial),
        title: ((w.title ?? w.display_name) ?? "").trim(),
        abstract: reconstructAbstract(w.abstract_inverted_index),
        authors: (w.authorships ?? [])
          .map((a) => a.author?.display_name ?? null)
          .filter(Boolean) as string[],
        year: w.publication_year ?? null,
        venue: w.primary_location?.source?.display_name ?? null,
        citationCount: w.cited_by_count ?? null,
        pdfUrl: w.primary_location?.pdf_url ?? w.open_access?.oa_url ?? null,
      };
    });
}

// ---------------------------------------------------------------------------
// arXiv (used as a fallback / for very recent preprints)
// https://export.arxiv.org/api/query?search_query=...
// ---------------------------------------------------------------------------
async function searchArxiv(input: SearchInput): Promise<PaperHit[]> {
  const params = new URLSearchParams({
    search_query: `all:${input.query}`,
    sortBy: "relevance",
    sortOrder: "descending",
    max_results: String(clampLimit(input.limit)),
  });
  const url = `https://export.arxiv.org/api/query?${params.toString()}`;
  const xml = await fetchTextWithTimeout(url);
  const parsed = parseFeed(xml);
  return parsed.map((p): PaperHit => {
    const arxivIdMatch = p.link.match(/(\d{4}\.\d{4,5})/);
    const arxivId = arxivIdMatch ? arxivIdMatch[1] : null;
    const year = p.publishedAt ? new Date(p.publishedAt).getUTCFullYear() : null;
    const partial = {
      doi: null,
      arxivId,
      source: "arxiv" as const,
      url: p.link,
    };
    return {
      ...partial,
      externalId: pickExternalId(partial),
      title: p.title,
      abstract: p.summary,
      authors: p.author ? p.author.split(/,\s*/).filter(Boolean) : [],
      year,
      venue: "arXiv",
      citationCount: null,
      pdfUrl: arxivId ? `https://arxiv.org/pdf/${arxivId}` : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Fan-out, dedupe, sort
// ---------------------------------------------------------------------------
function dedupeHits(hits: PaperHit[]): PaperHit[] {
  const out = new Map<string, PaperHit>();
  const byTitle = new Map<string, PaperHit>();
  for (const hit of hits) {
    // First pass: dedupe by stable id (DOI / arXiv / source-url).
    const existing = out.get(hit.externalId);
    if (existing) {
      mergeInPlace(existing, hit);
      continue;
    }
    out.set(hit.externalId, hit);

    // Second pass key: normalized title (catches the same paper with no DOI).
    const titleKey = normalizeTitle(hit.title);
    if (titleKey.length === 0) continue;
    const titleMatch = byTitle.get(titleKey);
    if (titleMatch && titleMatch.externalId !== hit.externalId) {
      mergeInPlace(titleMatch, hit);
      out.delete(hit.externalId);
    } else {
      byTitle.set(titleKey, hit);
    }
  }
  return [...out.values()];
}

function mergeInPlace(dst: PaperHit, src: PaperHit): void {
  dst.doi ??= src.doi;
  dst.arxivId ??= src.arxivId;
  dst.abstract ??= src.abstract;
  dst.year ??= src.year;
  dst.venue ??= src.venue;
  dst.pdfUrl ??= src.pdfUrl;
  if ((src.citationCount ?? -1) > (dst.citationCount ?? -1)) {
    dst.citationCount = src.citationCount;
  }
  if (src.authors.length > dst.authors.length) dst.authors = src.authors;
  if (!dst.url) dst.url = src.url;
}

function sortHits(hits: PaperHit[], sort: SearchInput["sort"]): PaperHit[] {
  switch (sort) {
    case "citations":
      return [...hits].sort((a, b) => (b.citationCount ?? -1) - (a.citationCount ?? -1));
    case "year":
      return [...hits].sort((a, b) => (b.year ?? -1) - (a.year ?? -1));
    case "relevance":
    default:
      return hits;
  }
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method !== "POST") return jsonResponse(req, 405, err("Method not allowed"));

  let body: SearchInput;
  try {
    body = (await req.json()) as SearchInput;
  } catch {
    return jsonResponse(req, 400, err("Invalid JSON body"));
  }
  if (!body.query || typeof body.query !== "string" || body.query.trim().length < 2) {
    return jsonResponse(req, 400, err("`query` is required (min 2 chars)"));
  }
  const limit = clampLimit(body.limit);
  const input: SearchInput = { ...body, query: body.query.trim(), limit };

  const settled = await Promise.allSettled([
    searchSemanticScholar(input),
    searchOpenAlex(input),
  ]);
  const errors: string[] = [];
  const collected: PaperHit[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") collected.push(...r.value);
    else errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
  }

  // If both upstreams failed (or returned empty), try arXiv as a last resort.
  if (collected.length === 0) {
    try {
      collected.push(...(await searchArxiv(input)));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  const deduped = dedupeHits(collected);
  const sorted = sortHits(deduped, input.sort).slice(0, limit);

  return jsonResponse(req, 200, ok({
    query: input.query,
    sort: input.sort ?? "relevance",
    count: sorted.length,
    hits: sorted,
    upstreamErrors: errors,
  }));
});
