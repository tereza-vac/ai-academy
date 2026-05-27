/**
 * Structured content blocks rendered by the internal reader.
 *
 * Mirrors the JATS/Portable-Text-inspired shape that the resource-import edge
 * function writes into `public.resource_content_blocks.payload` (and the
 * resource-translate edge function writes into
 * `public.resource_content_translations.payload` per locale).
 *
 * Keep this file in lock-step with
 * `supabase/functions/_shared/blockSchema.ts` (the zod schema used by the
 * edge functions to validate parser output). The list of `type` values must
 * match the CHECK constraint in migration
 * `20260101000014_resource_content.sql`.
 *
 * Translations preserve all opaque fields (`tex`, `code`, `src`, `href`,
 * `mathml`) and only translate the human-readable text fields:
 *   - heading.text / paragraph.text / caption.text / quote.text / callout.text
 *   - image.alt / image.caption
 *   - list.items[]
 *   - table.rows[][]
 */

export type BlockType =
  | "heading"
  | "paragraph"
  | "image"
  | "caption"
  | "table"
  | "list"
  | "equation"
  | "code"
  | "callout"
  | "quote";

export interface InlineMarkStrong { kind: "strong"; start: number; end: number; }
export interface InlineMarkEm     { kind: "em";     start: number; end: number; }
export interface InlineMarkCode   { kind: "code";   start: number; end: number; }
export interface InlineMarkLink   { kind: "link";   start: number; end: number; href: string; }

export type InlineMark =
  | InlineMarkStrong
  | InlineMarkEm
  | InlineMarkCode
  | InlineMarkLink;

export interface HeadingBlock {
  type: "heading";
  level: 1 | 2 | 3 | 4;
  text: string;
}

export interface ParagraphBlock {
  type: "paragraph";
  text: string;
  marks?: InlineMark[];
}

export interface ImageBlock {
  type: "image";
  src: string;
  alt: string | null;
  caption?: string | null;
  width?: number;
  height?: number;
}

export interface CaptionBlock {
  type: "caption";
  text: string;
  ref?: string;
}

export interface TableBlock {
  type: "table";
  rows: string[][];
  header: boolean;
}

export interface ListBlock {
  type: "list";
  ordered: boolean;
  items: string[];
}

export interface EquationBlock {
  type: "equation";
  tex: string;
  mathml?: string;
  display: boolean;
}

export interface CodeBlock {
  type: "code";
  lang: string | null;
  text: string;
}

export interface CalloutBlock {
  type: "callout";
  tone: "info" | "warn" | "note";
  text: string;
}

export interface QuoteBlock {
  type: "quote";
  text: string;
  cite?: string;
}

export type BlockPayload =
  | HeadingBlock
  | ParagraphBlock
  | ImageBlock
  | CaptionBlock
  | TableBlock
  | ListBlock
  | EquationBlock
  | CodeBlock
  | CalloutBlock
  | QuoteBlock;

/**
 * Database row shape for a single block (one row in
 * `public.resource_content_blocks`).
 */
export interface ContentBlock {
  id: string;
  resourceId: string;
  blockUid: string;
  position: number;
  type: BlockType;
  payload: BlockPayload;
  textHash: string | null;
}

/**
 * Manifest row shape (one row in `public.resource_contents`).
 */
export type ContentImporter =
  | "arxiv-ar5iv"
  | "pmc-jats"
  | "unpaywall-pdf"
  | "readability"
  | "metadata-only";

export type ContentLicense =
  | "cc-by"
  | "cc-by-sa"
  | "cc-by-nd"
  | "cc0"
  | "arxiv-nonexclusive"
  | "allowlisted-blog"
  | "unknown";

export interface ResourceContent {
  resourceId: string;
  sourceUrl: string;
  sourceLang: string;
  license: ContentLicense | null;
  importer: ContentImporter;
  importerVersion: number;
  wordCount: number | null;
  hasEquations: boolean;
  hasTables: boolean;
  lastImportedAt: string;
  rawMeta: Record<string, unknown>;
}

/**
 * Locale-resolved view used by the reader: blocks already merged with their
 * translation (if any) for the active locale.
 */
export interface ResolvedContent {
  manifest: ResourceContent;
  blocks: ContentBlock[];
  /** ISO 639-1; equals manifest.sourceLang for untranslated views. */
  renderedLocale: string;
  /** True when at least one block was rendered from a translation row. */
  translated: boolean;
  /** Provider name for the most recent translation row, if any. */
  translator: string | null;
}

/** Helper used by cards to decide whether to show "Read in AI Academy". */
export function isReaderAvailable(
  availability: string | null | undefined,
): boolean {
  return availability === "full_text_api" || availability === "full_text_scraped";
}
