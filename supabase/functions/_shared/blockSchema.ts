/**
 * Server-side Zod schema for content blocks.
 *
 * Keep in lock-step with `src/types/blocks.ts`. The list of `type` values must
 * match the CHECK constraint in migration
 * `20260101000014_resource_content.sql`.
 *
 * Used by `resource-import` to validate importer output before sending it to
 * the `upsert_resource_content` RPC, and by `resource-translate` to validate
 * what the model returns before persisting it.
 */
import { z } from "zod";

export const InlineMark = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("strong"), start: z.number().int().min(0), end: z.number().int().min(0) }),
  z.object({ kind: z.literal("em"),     start: z.number().int().min(0), end: z.number().int().min(0) }),
  z.object({ kind: z.literal("code"),   start: z.number().int().min(0), end: z.number().int().min(0) }),
  z.object({ kind: z.literal("link"),   start: z.number().int().min(0), end: z.number().int().min(0), href: z.string().url() }),
]);

export const BlockPayload = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    text: z.string(),
  }),
  z.object({
    type: z.literal("paragraph"),
    text: z.string(),
    marks: z.array(InlineMark).optional(),
  }),
  z.object({
    type: z.literal("image"),
    src: z.string().url(),
    alt: z.string().nullable(),
    caption: z.string().nullable().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({
    type: z.literal("caption"),
    text: z.string(),
    ref: z.string().optional(),
  }),
  z.object({
    type: z.literal("table"),
    rows: z.array(z.array(z.string())),
    header: z.boolean(),
  }),
  z.object({
    type: z.literal("list"),
    ordered: z.boolean(),
    items: z.array(z.string()),
  }),
  z.object({
    type: z.literal("equation"),
    tex: z.string(),
    mathml: z.string().optional(),
    display: z.boolean(),
  }),
  z.object({
    type: z.literal("code"),
    lang: z.string().nullable(),
    text: z.string(),
  }),
  z.object({
    type: z.literal("callout"),
    tone: z.enum(["info", "warn", "note"]),
    text: z.string(),
  }),
  z.object({
    type: z.literal("quote"),
    text: z.string(),
    cite: z.string().optional(),
  }),
]);

export type BlockPayloadT = z.infer<typeof BlockPayload>;

export const ImportedBlock = z.object({
  block_uid: z.string().min(1),
  position: z.number().int().min(0),
  type: z.enum([
    "heading","paragraph","image","caption","table","list",
    "equation","code","callout","quote",
  ]),
  payload: BlockPayload,
  text_hash: z.string().nullable().optional(),
});
export type ImportedBlockT = z.infer<typeof ImportedBlock>;

export const ImportedContentMeta = z.object({
  source_url: z.string().url(),
  source_lang: z.string(),
  license: z.string().nullable(),
  importer: z.enum([
    "arxiv-ar5iv", "pmc-jats", "unpaywall-pdf", "readability", "metadata-only",
  ]),
  importer_version: z.number().int().min(1),
  word_count: z.number().int().nullable(),
  has_equations: z.boolean(),
  has_tables: z.boolean(),
  raw_meta: z.record(z.string(), z.unknown()).default({}),
  availability: z.enum([
    "metadata_only","excerpt_only","full_text_api",
    "full_text_scraped","full_text_unavailable",
  ]),
});
export type ImportedContentMetaT = z.infer<typeof ImportedContentMeta>;

/**
 * Stable text hash for translation freshness comparisons.
 * Uses crypto.subtle (available in Deno + browsers).
 */
export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Extracts the "translatable text" from a block payload — the subset that
 * counts toward `text_hash` and gets sent through the translator. Opaque
 * fields (tex, code, src, href, mathml) are intentionally excluded.
 */
export function extractTextForHash(payload: BlockPayloadT): string {
  switch (payload.type) {
    case "heading":   return payload.text;
    case "paragraph": return payload.text;
    case "image":     return [payload.alt ?? "", payload.caption ?? ""].join("\n");
    case "caption":   return payload.text;
    case "table":     return payload.rows.flat().join("\n");
    case "list":      return payload.items.join("\n");
    case "equation":  return ""; // TeX is opaque — no translation
    case "code":      return ""; // Code is opaque — no translation
    case "callout":   return payload.text;
    case "quote":     return payload.text;
  }
}
