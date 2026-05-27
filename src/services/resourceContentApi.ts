/**
 * Client for the internal-reader content pipeline.
 *
 * Three responsibilities:
 *   - `triggerImport(resourceId)`     -> fire-and-forget POST to the
 *                                        `resource-import` edge function
 *                                        (kicked off by saveResource after a
 *                                        successful save).
 *   - `getResourceContent(id,locale)` -> assemble the reader payload:
 *                                        manifest + ordered blocks merged with
 *                                        their cached translation for `locale`
 *                                        (falling back to source).
 *   - `requestTranslation(id,locale)` -> POST to the `resource-translate` edge
 *                                        function and wait for fresh
 *                                        translations to land in the DB.
 *
 * Edge functions land in PR-2 / PR-3. Until then the import call silently
 * no-ops on 404 and the reader page falls back to "metadata only".
 */
import { supabase } from "@/integrations/supabase/client";
import { API_CONFIG } from "@/config/api";
import { isMock } from "@/lib/dataMode";
import {
  mockResourceContents,
  mockResourceBlocks,
} from "@/lib/mockData";
import type {
  BlockPayload,
  ContentBlock,
  ResolvedContent,
  ResourceContent,
} from "@/types/blocks";

interface ContentRow {
  resource_id: string;
  source_url: string;
  source_lang: string;
  license: ResourceContent["license"];
  importer: ResourceContent["importer"];
  importer_version: number;
  word_count: number | null;
  has_equations: boolean;
  has_tables: boolean;
  last_imported_at: string;
  raw_meta: Record<string, unknown> | null;
}

interface BlockRow {
  id: string;
  resource_id: string;
  block_uid: string;
  position: number;
  type: ContentBlock["type"];
  payload: BlockPayload;
  text_hash: string | null;
}

interface TranslationRow {
  block_id: string;
  locale: string;
  payload: BlockPayload;
  translator: string;
  source_text_hash: string;
}

function mapContent(row: ContentRow): ResourceContent {
  return {
    resourceId: row.resource_id,
    sourceUrl: row.source_url,
    sourceLang: row.source_lang,
    license: row.license,
    importer: row.importer,
    importerVersion: row.importer_version,
    wordCount: row.word_count,
    hasEquations: row.has_equations,
    hasTables: row.has_tables,
    lastImportedAt: row.last_imported_at,
    rawMeta: row.raw_meta ?? {},
  };
}

function mapBlock(row: BlockRow): ContentBlock {
  return {
    id: row.id,
    resourceId: row.resource_id,
    blockUid: row.block_uid,
    position: row.position,
    type: row.type,
    payload: row.payload,
    textHash: row.text_hash,
  };
}

/**
 * Kicks off the import pipeline for a freshly saved resource.
 *
 * Fire-and-forget on purpose:
 *   - Save UX must not block on a multi-second remote fetch.
 *   - If the edge function isn't deployed yet (PR-1 ships before PR-2),
 *     we swallow the 404 so the Save action stays clean.
 *
 * Returns `void` rather than the import result; callers should refetch the
 * resource later (TanStack Query invalidation) to learn the new availability.
 */
export async function triggerImport(resourceId: string): Promise<void> {
  if (isMock) return;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken =
      sessionData.session?.access_token ?? API_CONFIG.SUPABASE_PUBLISHABLE_KEY;

    await fetch(API_CONFIG.RESOURCE_IMPORT_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: API_CONFIG.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ resourceId }),
      // No `keepalive: true` here because the request happens after save;
      // we just don't await it from the caller.
    }).catch(() => {
      // Edge function not deployed yet (PR-1) or transient network error.
      // The reader page handles missing content gracefully.
    });
  } catch {
    // Same rationale: swallow so saveResource doesn't fail loudly.
  }
}

interface TranslateResponse {
  upserted: number;
  skipped: number;
  remaining: number;
  failed_batches: number;
  first_error: string | null;
}

/**
 * Translates the resource into `locale`. Large documents exceed the edge
 * function's per-invocation time budget, so the server returns a
 * `remaining` count and we loop until 0 (or a reasonable hard cap). The
 * function is idempotent server-side — each call picks up where the
 * previous one left off via the source_text_hash freshness check.
 */
export async function requestTranslation(
  resourceId: string,
  locale: string,
): Promise<{ count: number }> {
  if (isMock) return { count: 0 };

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken =
    sessionData.session?.access_token ?? API_CONFIG.SUPABASE_PUBLISHABLE_KEY;

  // Hard cap so a misbehaving server doesn't keep us looping forever.
  const MAX_CALLS = 8;
  let totalUpserted = 0;

  for (let call = 0; call < MAX_CALLS; call++) {
    const res = await fetch(API_CONFIG.RESOURCE_TRANSLATE_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: API_CONFIG.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ resourceId, locale }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(body || `Translation failed (HTTP ${res.status})`);
    }
    const json = (await res.json()) as {
      data: TranslateResponse | null;
      error: string | null;
    };
    if (json.error || !json.data) {
      throw new Error(json.error ?? "Translation returned no data");
    }
    totalUpserted += json.data.upserted;
    if (json.data.failed_batches > 0 && json.data.first_error) {
      throw new Error(json.data.first_error);
    }
    if (json.data.remaining <= 0) break;
  }

  return { count: totalUpserted };
}

/**
 * Loads the manifest + ordered blocks for a resource, merged with the
 * cached translation row for `locale` (if any). Returns `null` when the
 * resource has never been imported, so the reader can surface a
 * "metadata only" empty state.
 *
 * Pass a special sentinel `"source"` for `locale` to force source-language
 * rendering (used by the reader's "Show source" toggle).
 */
export async function getResourceContent(
  resourceId: string,
  locale: string,
): Promise<ResolvedContent | null> {
  const forceSource = locale === "source";

  if (isMock) {
    const manifest = mockResourceContents.find((c) => c.resourceId === resourceId);
    if (!manifest) return null;
    const blocks = mockResourceBlocks
      .filter((b) => b.resourceId === resourceId)
      .sort((a, b) => a.position - b.position);
    return {
      manifest,
      blocks,
      renderedLocale: manifest.sourceLang,
      translated: false,
      translator: null,
    };
  }

  const [contentRes, blocksRes] = await Promise.all([
    supabase
      .from("resource_contents")
      .select(
        "resource_id,source_url,source_lang,license,importer,importer_version,word_count,has_equations,has_tables,last_imported_at,raw_meta",
      )
      .eq("resource_id", resourceId)
      .maybeSingle(),
    supabase
      .from("resource_content_blocks")
      .select("id,resource_id,block_uid,position,type,payload,text_hash")
      .eq("resource_id", resourceId)
      .order("position", { ascending: true }),
  ]);
  if (contentRes.error) throw new Error(contentRes.error.message);
  if (blocksRes.error) throw new Error(blocksRes.error.message);
  if (!contentRes.data) return null;

  const manifest = mapContent(contentRes.data as ContentRow);
  const blocks = (blocksRes.data ?? []).map((b) => mapBlock(b as BlockRow));

  // Source-language render — no translation lookup needed.
  if (forceSource || locale === manifest.sourceLang || blocks.length === 0) {
    return {
      manifest,
      blocks,
      renderedLocale: manifest.sourceLang,
      translated: false,
      translator: null,
    };
  }

  const blockIds = blocks.map((b) => b.id);
  const { data: translations, error: tErr } = await supabase
    .from("resource_content_translations")
    .select("block_id,locale,payload,translator,source_text_hash")
    .eq("locale", locale)
    .in("block_id", blockIds);
  if (tErr) throw new Error(tErr.message);

  const byBlockId = new Map<string, TranslationRow>();
  for (const t of (translations ?? []) as TranslationRow[]) {
    byBlockId.set(t.block_id, t);
  }

  let translated = false;
  let translator: string | null = null;
  const merged: ContentBlock[] = blocks.map((b) => {
    const t = byBlockId.get(b.id);
    // Translation is only used when source_text_hash still matches the block.
    if (t && t.source_text_hash === (b.textHash ?? "")) {
      translated = true;
      translator = t.translator;
      return { ...b, payload: t.payload };
    }
    return b;
  });

  return {
    manifest,
    blocks: merged,
    renderedLocale: translated ? locale : manifest.sourceLang,
    translated,
    translator,
  };
}
