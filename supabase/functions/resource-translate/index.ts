/**
 * resource-translate edge function.
 *
 * POST /functions/v1/resource-translate
 *   { "resourceId": "<uuid>", "locale": "cs" | "en" | "sk" | "pl" }
 *
 * Loads the content blocks that don't yet have a fresh translation for
 * `locale` (fresh = `translations.source_text_hash == blocks.text_hash`),
 * batches them through OpenAI structured output, and persists results via
 * the SECURITY DEFINER `upsert_resource_translations` RPC.
 *
 * Idempotent per `(resource_id, locale)`. License gating:
 *   - `cc-by-nd` blocks are skipped (the ND clause forbids derivative works).
 *   - `unknown` license falls through too, since we can't prove we may
 *     translate.
 *
 * Only translatable text fields are sent to the model. `tex`, `code`, `src`,
 * `href`, `mathml` round-trip unchanged.
 */
import { createClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { serve, jsonResponse, ok, err } from "../_shared/handler.ts";
import { loadGlossary, formatGlossaryForPrompt } from "../_shared/glossary.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const TRANSLATOR_MODEL = Deno.env.get("TRANSLATOR_MODEL") ?? "gpt-4o-mini";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SUPPORTED_LOCALES = ["cs", "en", "sk", "pl"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

// Smaller batches keep each OpenAI call short (better p99 latency, fewer
// retries on transient failures), and we fan-out a small concurrent pool so
// throughput is good. The function is naturally idempotent (the freshness
// check skips already-translated blocks on the next call), so the client
// just re-invokes until `remaining` hits 0 if the per-invocation wall time
// runs out.
const BATCH_SIZE = 8;
const PARALLEL_BATCHES = 4;
const SOFT_TIME_BUDGET_MS = 90_000;

// ---------------------------------------------------------------------------
// Translatable payload shape
// ---------------------------------------------------------------------------
//
// For translation we only round-trip text fields. The translator prompt is
// told to preserve every other property as opaque. We use one compact schema
// per block type so the model returns predictable JSON.
// ---------------------------------------------------------------------------

// What we ask the model to return per block (only the text fields).
//
// OpenAI structured-output strict mode rejects `oneOf`, so we can't use a
// discriminated union here. Instead we flatten every block type into a single
// schema where every field is nullable; the `type` field is the discriminator
// and the caller picks the right fields based on it. Strict mode also
// requires every property to be `required`, so all of these are `.nullable()`
// rather than `.optional()`.
const TranslatedTextSchema = z.object({
  type: z.enum([
    "heading", "paragraph", "image", "caption", "table", "list", "callout", "quote",
  ]),
  text: z.string().nullable().describe("heading | paragraph | caption | callout | quote"),
  alt: z.string().nullable().describe("image only"),
  caption: z.string().nullable().describe("image only"),
  rows: z.array(z.array(z.string())).nullable().describe("table only"),
  items: z.array(z.string()).nullable().describe("list only"),
});

const TranslationBatchSchema = z.object({
  translations: z.array(
    z.object({
      block_uid: z.string(),
      content: TranslatedTextSchema,
    }),
  ),
});

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------
interface BlockRow {
  id: string;
  block_uid: string;
  position: number;
  type: string;
  payload: Record<string, unknown>;
  text_hash: string | null;
}

interface ManifestRow {
  source_lang: string;
  license: string | null;
}

const NON_TRANSLATABLE_TYPES = new Set(["equation", "code"]);

const TRANSLATABLE_LICENSES = new Set([
  "cc-by", "cc-by-sa", "cc0", "arxiv-nonexclusive", "allowlisted-blog",
]);

async function loadManifest(resourceId: string): Promise<ManifestRow | null> {
  const { data, error } = await supabase
    .from("resource_contents")
    .select("source_lang, license")
    .eq("resource_id", resourceId)
    .maybeSingle();
  if (error) {
    console.error("[resource-translate] manifest lookup failed:", error.message);
    return null;
  }
  return (data as ManifestRow) ?? null;
}

async function loadStaleBlocks(resourceId: string, locale: Locale): Promise<BlockRow[]> {
  // Fetch all blocks for the resource + any existing translation rows for the
  // locale, then filter client-side so we don't write a Postgres view just
  // for this query.
  const { data: blocks, error: bErr } = await supabase
    .from("resource_content_blocks")
    .select("id, block_uid, position, type, payload, text_hash")
    .eq("resource_id", resourceId)
    .order("position", { ascending: true });
  if (bErr) throw new Error(bErr.message);
  const rows = (blocks ?? []) as BlockRow[];

  if (rows.length === 0) return [];

  const { data: existing, error: tErr } = await supabase
    .from("resource_content_translations")
    .select("block_id, source_text_hash")
    .eq("locale", locale)
    .in("block_id", rows.map((r) => r.id));
  if (tErr) throw new Error(tErr.message);
  const byBlock = new Map<string, string>();
  for (const t of (existing ?? []) as { block_id: string; source_text_hash: string }[]) {
    byBlock.set(t.block_id, t.source_text_hash);
  }

  return rows.filter(
    (r) =>
      !NON_TRANSLATABLE_TYPES.has(r.type) &&
      byBlock.get(r.id) !== (r.text_hash ?? ""),
  );
}

// ---------------------------------------------------------------------------
// Prompting
// ---------------------------------------------------------------------------
function buildSystemPrompt(sourceLang: string, targetLocale: Locale, glossarySnippet: string): string {
  const localeNames: Record<Locale, string> = {
    cs: "Czech (cs)", en: "English (en)", sk: "Slovak (sk)", pl: "Polish (pl)",
  };
  return [
    `You are a professional technical translator from ${sourceLang} to ${localeNames[targetLocale]}.`,
    "You translate academic / engineering content about AI and ML.",
    "",
    "STRICT RULES:",
    "- Translate ONLY the text fields you are given.",
    "- Preserve markdown-like formatting where present (no extra **bold** or backticks).",
    "- Never invent content. Stay faithful to the original.",
    "- Keep proper nouns, model names, product names, function/method names in their original form.",
    "- Keep numeric values, units, code identifiers, URLs untouched.",
    "- Output JSON exactly matching the requested schema.",
    "",
    glossarySnippet || "(no glossary entries for this locale)",
  ].join("\n");
}

function buildUserPrompt(batch: BlockRow[]): string {
  const items = batch.map((b) => ({
    block_uid: b.block_uid,
    source: extractSourceText(b),
  }));
  return [
    "Translate each item below. Return JSON with `translations[]` matching this list,",
    "one entry per input `block_uid` in the same order. Each `content` object must",
    "have the same `type` as the source.",
    "",
    JSON.stringify(items, null, 2),
  ].join("\n");
}

function extractSourceText(b: BlockRow): Record<string, unknown> {
  const p = b.payload as Record<string, unknown>;
  switch (b.type) {
    case "heading":   return { type: "heading",   text: p.text ?? "" };
    case "paragraph": return { type: "paragraph", text: p.text ?? "" };
    case "image":     return { type: "image",     alt: p.alt ?? null, caption: p.caption ?? null };
    case "caption":   return { type: "caption",   text: p.text ?? "" };
    case "table":     return { type: "table",     rows: p.rows ?? [] };
    case "list":      return { type: "list",      items: p.items ?? [] };
    case "callout":   return { type: "callout",   text: p.text ?? "" };
    case "quote":     return { type: "quote",     text: p.text ?? "" };
    default:          return { type: b.type };
  }
}

/**
 * Merge translated text back onto the original payload — preserves opaque
 * fields (level, ordered, header, marks, width/height, etc.). Only the
 * fields belonging to `translated.type` are read; the rest are tolerated as
 * `null` from the model.
 */
function mergeTranslated(
  original: BlockRow,
  translated: z.infer<typeof TranslatedTextSchema>,
): Record<string, unknown> | null {
  const p = { ...(original.payload as Record<string, unknown>) };
  switch (translated.type) {
    case "heading":
    case "paragraph":
    case "caption":
    case "callout":
    case "quote":
      if (translated.text === null) return null;
      return { ...p, text: translated.text };
    case "image":
      return { ...p, alt: translated.alt, caption: translated.caption ?? (p.caption as string | null) };
    case "table":
      if (translated.rows === null) return null;
      return { ...p, rows: translated.rows };
    case "list":
      if (translated.items === null) return null;
      return { ...p, items: translated.items };
  }
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method !== "POST") return jsonResponse(req, 405, err("Method not allowed"));
  if (!OPENAI_API_KEY) return jsonResponse(req, 503, err("Translator unavailable (OPENAI_API_KEY missing)"));

  let body: { resourceId?: string; locale?: string };
  try { body = await req.json(); } catch { return jsonResponse(req, 400, err("Invalid JSON body")); }

  const resourceId = body.resourceId;
  const locale = body.locale as Locale | undefined;
  if (!resourceId || typeof resourceId !== "string") {
    return jsonResponse(req, 400, err("resourceId required"));
  }
  if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
    return jsonResponse(req, 400, err("Unsupported locale"));
  }

  const manifest = await loadManifest(resourceId);
  if (!manifest) return jsonResponse(req, 404, err("Resource content not found"));

  // No-op when target locale matches source.
  if (manifest.source_lang === locale) {
    return jsonResponse(req, 200, ok({ upserted: 0, skipped: 0, reason: "source_lang_matches_locale" }));
  }

  // License gate.
  const license = (manifest.license ?? "unknown").toLowerCase();
  if (!TRANSLATABLE_LICENSES.has(license)) {
    return jsonResponse(req, 200, ok({ upserted: 0, skipped: 0, reason: `license_blocks_translation:${license}` }));
  }

  const stale = await loadStaleBlocks(resourceId, locale);
  if (stale.length === 0) {
    return jsonResponse(req, 200, ok({ upserted: 0, skipped: 0, reason: "already_fresh" }));
  }

  const openai = createOpenAI({ apiKey: OPENAI_API_KEY });
  const model = openai(TRANSLATOR_MODEL);
  const glossary = await loadGlossary(supabase, locale);
  const glossarySnippet = formatGlossaryForPrompt(glossary);
  const system = buildSystemPrompt(manifest.source_lang, locale, glossarySnippet);

  let totalUpserted = 0;
  let totalSkipped = 0;
  let firstError: string | null = null;
  let failedBatches = 0;
  let processedBlocks = 0;
  const startedAt = Date.now();
  const budgetExceeded = () => Date.now() - startedAt > SOFT_TIME_BUDGET_MS;

  // Pre-slice into BATCH_SIZE chunks, then drain a queue of indices with
  // PARALLEL_BATCHES concurrent workers.
  const batches: BlockRow[][] = [];
  for (let i = 0; i < stale.length; i += BATCH_SIZE) {
    batches.push(stale.slice(i, i + BATCH_SIZE));
  }
  let nextBatchIdx = 0;

  async function processOneBatch(batch: BlockRow[]): Promise<void> {
    let output: z.infer<typeof TranslationBatchSchema>;
    try {
      const res = await generateObject({
        model,
        system,
        prompt: buildUserPrompt(batch),
        schema: TranslationBatchSchema,
        temperature: 0.2,
      });
      output = res.object;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[resource-translate] generateObject failed:", message);
      if (!firstError) firstError = message;
      failedBatches++;
      totalSkipped += batch.length;
      return;
    }

    const byUid = new Map<string, z.infer<typeof TranslatedTextSchema>>();
    for (const t of output.translations) byUid.set(t.block_uid, t.content);

    const merged = batch
      .map((b) => {
        const t = byUid.get(b.block_uid);
        if (!t) return null;
        const payload = mergeTranslated(b, t);
        if (payload === null) return null;
        return {
          block_uid: b.block_uid,
          payload,
          translator: `openai/${TRANSLATOR_MODEL}`,
          source_text_hash: b.text_hash ?? "",
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const { data, error } = await supabase.rpc("upsert_resource_translations", {
      p_resource_id: resourceId,
      p_locale: locale,
      p_translations: merged,
    });
    if (error) {
      console.error("[resource-translate] upsert failed:", error.message);
      totalSkipped += batch.length;
      return;
    }
    const result = data as { upserted: number; skipped: number };
    totalUpserted += result.upserted ?? 0;
    totalSkipped += result.skipped ?? 0;
    processedBlocks += batch.length;
  }

  async function worker(): Promise<void> {
    while (true) {
      if (budgetExceeded()) return;
      const idx = nextBatchIdx++;
      if (idx >= batches.length) return;
      await processOneBatch(batches[idx]);
    }
  }

  const workers: Promise<void>[] = [];
  for (let w = 0; w < Math.min(PARALLEL_BATCHES, batches.length); w++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return jsonResponse(req, 200, ok({
    upserted: totalUpserted,
    skipped: totalSkipped,
    failed_batches: failedBatches,
    first_error: firstError,
    remaining: Math.max(0, stale.length - processedBlocks),
    elapsed_ms: Date.now() - startedAt,
    locale,
    sourceLang: manifest.source_lang,
  }));
});
