/**
 * Radar ingestion edge function.
 *
 * Polls every active row in `public.rss_sources`, parses the feed and upserts
 * new entries into `public.radar_items` (deduping by `link`). Optionally also
 * creates a matching `public.resources` row for items that aren't represented
 * yet, leaving `enrichment_status='pending'` so the `ai-enrich` function can
 * pick them up.
 *
 * Designed to be invoked:
 *   - manually via `curl -X POST http://localhost:54321/functions/v1/radar-ingest`
 *   - on a cron (Supabase scheduled functions / pg_cron) once we go past MVP
 *
 * Returns a small JSON summary:
 *   { data: { sources, items_ingested, errors }, error: null }
 */
import { createClient } from "@supabase/supabase-js";
import { serve, jsonResponse, ok, err } from "../_shared/handler.ts";
import { parseFeed } from "../_shared/rss.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const USER_AGENT = Deno.env.get("RSS_USER_AGENT") ?? "AI-Academy-Radar/0.1";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface SourceRow {
  id: string;
  name: string;
  url: string;
}

interface IngestSummary {
  sources: number;
  items_ingested: number;
  errors: Array<{ source: string; message: string }>;
}

async function ingestSource(source: SourceRow): Promise<number> {
  const res = await fetch(source.url, {
    headers: { "user-agent": USER_AGENT, accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const parsed = parseFeed(xml);
  if (parsed.length === 0) return 0;

  // Upsert radar items (dedup by link)
  const rows = parsed.map((p) => ({
    source_id: source.id,
    link: p.link,
    title: p.title,
    summary: p.summary,
    author: p.author,
    published_at: p.publishedAt,
    raw: p.raw,
  }));

  const { error: upsertError, count } = await supabase
    .from("radar_items")
    .upsert(rows, { onConflict: "link", ignoreDuplicates: true, count: "exact" });
  if (upsertError) throw upsertError;

  // Mark source as polled
  await supabase
    .from("rss_sources")
    .update({ last_polled_at: new Date().toISOString(), last_polled_status: "ok" })
    .eq("id", source.id);

  return count ?? 0;
}

serve(async (req) => {
  if (req.method !== "POST") return jsonResponse(req, 405, err("Method not allowed"));

  const { data: sources, error } = await supabase
    .from("rss_sources")
    .select("id,name,url")
    .eq("is_active", true);
  if (error) return jsonResponse(req, 500, err(error.message));

  const summary: IngestSummary = { sources: sources?.length ?? 0, items_ingested: 0, errors: [] };

  for (const source of sources ?? []) {
    try {
      const ingested = await ingestSource(source as SourceRow);
      summary.items_ingested += ingested;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      summary.errors.push({ source: source.name, message });
      await supabase
        .from("rss_sources")
        .update({
          last_polled_at: new Date().toISOString(),
          last_polled_status: `error: ${message}`.slice(0, 240),
        })
        .eq("id", source.id);
    }
  }

  return jsonResponse(req, 200, ok(summary));
});
