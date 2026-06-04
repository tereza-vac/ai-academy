function getFallbackSupabaseUrl(): string {
  if (typeof window === "undefined") return "http://127.0.0.1:54321";
  const host = window.location.hostname || "127.0.0.1";
  return `http://${host}:54321`;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || getFallbackSupabaseUrl();
// Accept either `VITE_SUPABASE_PUBLISHABLE_KEY` (new naming used by `supabase start`)
// or `VITE_SUPABASE_ANON_KEY` (legacy, still issued by the hosted dashboard).
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_local_anon_key";

export const API_CONFIG = {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,

  RADAR_INGEST_URL: `${SUPABASE_URL}/functions/v1/radar-ingest`,
  AI_ENRICH_URL: `${SUPABASE_URL}/functions/v1/ai-enrich`,
  AI_TUTOR_URL: `${SUPABASE_URL}/functions/v1/ai-tutor`,
  PAPERS_SEARCH_URL: `${SUPABASE_URL}/functions/v1/papers-search`,
  RESOURCE_IMPORT_URL: `${SUPABASE_URL}/functions/v1/resource-import`,
  RESOURCE_TRANSLATE_URL: `${SUPABASE_URL}/functions/v1/resource-translate`,
} as const;
