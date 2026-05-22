/**
 * Radar ingestion edge function.
 *
 * Polls every active `public.rss_sources` row, dispatches by `source_type`,
 * normalizes the result into a common `RadarItemRow` shape, computes a
 * deterministic global ranking score, and upserts into `public.radar_items`
 * (dedup by `link`).
 *
 * Dispatch:
 *   - `rss`              -> generic RSS/Atom via the shared XML parser
 *   - `arxiv`            -> arXiv API (Atom + extra metadata: arXiv id, categories)
 *   - `hf_daily_papers`  -> Hugging Face Daily Papers JSON (includes upvotes)
 *
 * Designed to be invoked:
 *   - manually via `curl -X POST <fn-url>` (typical in dev)
 *   - on a cron via Supabase scheduled functions or pg_cron
 *
 * Returns:
 *   { data: { sources, items_ingested, errors }, error: null }
 */
import { createClient } from "@supabase/supabase-js";
import { serve, jsonResponse, ok, err } from "../_shared/handler.ts";
import { parseFeed, type ParsedFeedItem } from "../_shared/rss.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const USER_AGENT = Deno.env.get("RSS_USER_AGENT") ?? "AI-Academy-Radar/0.2";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SourceType = "rss" | "arxiv" | "hf_daily_papers";

interface SourceRow {
  id: string;
  name: string;
  url: string;
  category: string | null;
  source_type: SourceType;
  weight: number;
}

interface RadarItemRow {
  source_id: string;
  link: string;
  title: string;
  summary: string | null;
  author: string | null;
  published_at: string | null;
  raw: Record<string, unknown>;
  kind: string | null;
  tags: string[];
  hf_upvotes: number | null;
  external_id: string | null;
  content_lang: string | null;
  score: number;
}

interface IngestSummary {
  sources: number;
  items_ingested: number;
  errors: Array<{ source: string; message: string }>;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
const RECENCY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;
const UPVOTES_WEIGHT = 0.3;

/**
 * Deterministic global score so any client can render "Recommended"
 * without per-user state. Higher = rank first.
 *
 *   score = weight * (recency_decay + UPVOTES_WEIGHT * log10(1 + upvotes))
 *
 * recency_decay = exp(-age_ms / half_life_ms), clamped to [0,1].
 * Unknown publishedAt -> recency_decay = 0.4 (treat as moderately fresh).
 */
function computeScore(input: {
  weight: number;
  publishedAt: string | null;
  hfUpvotes: number | null;
}): number {
  const now = Date.now();
  const ts = input.publishedAt ? Date.parse(input.publishedAt) : NaN;
  const recency = Number.isFinite(ts)
    ? Math.exp(-Math.max(0, now - ts) / RECENCY_HALF_LIFE_MS)
    : 0.4;
  const upvotesTerm = input.hfUpvotes && input.hfUpvotes > 0
    ? UPVOTES_WEIGHT * Math.log10(1 + input.hfUpvotes)
    : 0;
  const raw = input.weight * (recency + upvotesTerm);
  return Number(raw.toFixed(6));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

/** Pull the arXiv id out of any common arXiv URL or atom id. */
function extractArxivId(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/(?:arxiv\.org\/(?:abs|pdf)\/|^)\s*(\d{4}\.\d{4,5})(v\d+)?/i);
  if (m) return `arXiv:${m[1]}`;
  return null;
}

/** Infer a default `kind` for an item based on the source type + link. */
function inferKind(source: SourceRow, link: string): string {
  if (source.source_type === "arxiv" || source.source_type === "hf_daily_papers") {
    return "paper";
  }
  if (/arxiv\.org\/abs\//i.test(link)) return "paper";
  if (source.category === "research") return "paper";
  if (source.category === "product") return "release";
  if (source.category === "community") return "community";
  return "article";
}

// ---------------------------------------------------------------------------
// Ingesters
// ---------------------------------------------------------------------------
async function ingestGenericRss(source: SourceRow): Promise<RadarItemRow[]> {
  const xml = await fetchText(source.url);
  const parsed: ParsedFeedItem[] = parseFeed(xml);
  return parsed.map((p) => {
    const kind = inferKind(source, p.link);
    return {
      source_id: source.id,
      link: p.link,
      title: p.title,
      summary: p.summary,
      author: p.author,
      published_at: p.publishedAt,
      raw: p.raw,
      kind,
      tags: [],
      hf_upvotes: null,
      external_id: extractArxivId(p.link),
      content_lang: null,
      score: computeScore({
        weight: source.weight,
        publishedAt: p.publishedAt,
        hfUpvotes: null,
      }),
    };
  });
}

async function ingestArxiv(source: SourceRow): Promise<RadarItemRow[]> {
  // arXiv exposes Atom 1.0. The shared parser handles the bulk of fields; we
  // do a tiny extra pass for the arXiv-specific `<id>` (which is the canonical
  // abstract URL) and `<category term="...">` tags.
  const xml = await fetchText(source.url);
  const parsed: ParsedFeedItem[] = parseFeed(xml);

  return parsed.map((p) => {
    // arXiv puts the canonical abs URL inside the <id> of the entry; the
    // shared parser extracts <link href> instead, but both work for dedup.
    const arxivId = extractArxivId(p.link) ?? extractArxivId(JSON.stringify(p.raw));

    // Best-effort category extraction from the raw XML block kept by the
    // shared parser. Categories look like: <category term="cs.LG" .../>
    const rawBlock = typeof p.raw.rawBlock === "string" ? p.raw.rawBlock : "";
    const tagMatches = [...rawBlock.matchAll(/<category[^>]*term=["']([^"']+)["']/gi)];
    const tags = tagMatches.map((m) => m[1]).filter((t) => t.length > 0).slice(0, 8);

    return {
      source_id: source.id,
      link: p.link,
      title: p.title,
      summary: p.summary,
      author: p.author,
      published_at: p.publishedAt,
      raw: p.raw,
      kind: "paper",
      tags,
      hf_upvotes: null,
      external_id: arxivId,
      content_lang: null,
      score: computeScore({
        weight: source.weight,
        publishedAt: p.publishedAt,
        hfUpvotes: null,
      }),
    };
  });
}

interface HfPaperEntry {
  publishedAt?: string;
  submittedOnDailyAt?: string;
  thumbnail?: string;
  paper?: {
    id?: string;
    title?: string;
    summary?: string;
    upvotes?: number;
    authors?: Array<{ name?: string }>;
    publishedAt?: string;
  };
  title?: string;
  summary?: string;
}

async function ingestHfDailyPapers(source: SourceRow): Promise<RadarItemRow[]> {
  const body = (await fetchJson(source.url)) as unknown;
  const entries: HfPaperEntry[] = Array.isArray(body)
    ? (body as HfPaperEntry[])
    : Array.isArray((body as { data?: unknown }).data)
      ? ((body as { data: HfPaperEntry[] }).data)
      : [];

  const rows: RadarItemRow[] = [];
  for (const entry of entries) {
    const paper = entry.paper ?? {};
    const arxivId = paper.id ? `arXiv:${paper.id}` : null;
    const link = paper.id
      ? `https://huggingface.co/papers/${paper.id}`
      : null;
    if (!link) continue;

    const title = (paper.title ?? entry.title ?? "").trim();
    if (!title) continue;

    const summary = (paper.summary ?? entry.summary ?? "").trim() || null;
    const author = Array.isArray(paper.authors) && paper.authors.length > 0
      ? paper.authors.slice(0, 4).map((a) => a.name).filter(Boolean).join(", ")
      : null;
    const publishedAt = paper.publishedAt
      ?? entry.publishedAt
      ?? entry.submittedOnDailyAt
      ?? null;
    const upvotes = typeof paper.upvotes === "number" ? paper.upvotes : null;

    rows.push({
      source_id: source.id,
      link,
      title,
      summary,
      author,
      published_at: publishedAt,
      raw: entry as unknown as Record<string, unknown>,
      kind: "paper",
      tags: ["hf-daily"],
      hf_upvotes: upvotes,
      external_id: arxivId,
      content_lang: null,
      score: computeScore({
        weight: source.weight,
        publishedAt,
        hfUpvotes: upvotes,
      }),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Per-source dispatch + upsert
// ---------------------------------------------------------------------------
async function ingestSource(source: SourceRow): Promise<number> {
  let rows: RadarItemRow[];
  switch (source.source_type) {
    case "arxiv":
      rows = await ingestArxiv(source);
      break;
    case "hf_daily_papers":
      rows = await ingestHfDailyPapers(source);
      break;
    case "rss":
    default:
      rows = await ingestGenericRss(source);
      break;
  }

  if (rows.length === 0) {
    await supabase.from("rss_sources").update({
      last_polled_at: new Date().toISOString(),
      last_polled_status: "ok (empty)",
    }).eq("id", source.id);
    return 0;
  }

  // Upsert by link. Using `merge-duplicates` (the default) means we refresh
  // score / upvotes / kind / tags on every poll even for known links — that's
  // what we want so ranking stays current.
  const { error: upsertError, count } = await supabase
    .from("radar_items")
    .upsert(rows, { onConflict: "link", count: "exact" });
  if (upsertError) throw upsertError;

  await supabase.from("rss_sources").update({
    last_polled_at: new Date().toISOString(),
    last_polled_status: "ok",
  }).eq("id", source.id);

  return count ?? rows.length;
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method !== "POST") return jsonResponse(req, 405, err("Method not allowed"));

  const { data: sources, error } = await supabase
    .from("rss_sources")
    .select("id,name,url,category,source_type,weight")
    .eq("is_active", true);
  if (error) return jsonResponse(req, 500, err(error.message));

  const summary: IngestSummary = {
    sources: sources?.length ?? 0,
    items_ingested: 0,
    errors: [],
  };

  for (const raw of sources ?? []) {
    const source = raw as SourceRow;
    try {
      const ingested = await ingestSource(source);
      summary.items_ingested += ingested;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      summary.errors.push({ source: source.name, message });
      await supabase.from("rss_sources").update({
        last_polled_at: new Date().toISOString(),
        last_polled_status: `error: ${message}`.slice(0, 240),
      }).eq("id", source.id);
    }
  }

  return jsonResponse(req, 200, ok(summary));
});
