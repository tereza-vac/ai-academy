/**
 * Translation glossary loader.
 *
 * The `public.translation_glossary` table is keyed by `(locale, term)` and
 * holds editor-curated translations for jargon that the model otherwise
 * mangles (e.g. "fine-tuning" → cs "doladění", sk "dolaďovanie", pl "dostrajanie").
 *
 * We pull all rows for the active locale once per translation request and
 * embed them as a system-prompt snippet. The table is small (target: low
 * hundreds of rows per locale) so this stays cheap.
 *
 * The actual table + seed land in PR-3 (`resource-translate`); this module is
 * shared so the migration can reference the same column names.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface GlossaryEntry {
  term: string;
  translation: string;
  notes?: string | null;
}

const cache = new Map<string, { entries: GlossaryEntry[]; expires: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes — editor edits feel fresh

export async function loadGlossary(
  supabase: SupabaseClient,
  locale: string,
): Promise<GlossaryEntry[]> {
  const cached = cache.get(locale);
  if (cached && cached.expires > Date.now()) return cached.entries;

  const { data, error } = await supabase
    .from("translation_glossary")
    .select("term,translation,notes")
    .eq("locale", locale);
  if (error) {
    // Table may not exist yet (PR-3 introduces it). Fail open with empty list.
    console.warn("[glossary] load failed:", error.message);
    return [];
  }
  const entries = (data ?? []) as GlossaryEntry[];
  cache.set(locale, { entries, expires: Date.now() + TTL_MS });
  return entries;
}

/**
 * Formats the glossary entries into a compact system-prompt snippet. Kept
 * deterministic (sorted alphabetically) so the same translation request
 * produces the same prompt across runs — handy for diffing.
 */
export function formatGlossaryForPrompt(entries: GlossaryEntry[]): string {
  if (entries.length === 0) return "";
  const sorted = [...entries].sort((a, b) => a.term.localeCompare(b.term));
  const lines = sorted.map((e) =>
    e.notes
      ? `- "${e.term}" -> "${e.translation}"  (${e.notes})`
      : `- "${e.term}" -> "${e.translation}"`,
  );
  return [
    "Use this glossary verbatim for the following terms (case-insensitive):",
    ...lines,
  ].join("\n");
}
