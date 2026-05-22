-- Long-term Radar / Library / Scholar foundation.
--
-- This migration extends three existing tables with the columns needed for:
--   1. A multi-source Radar feed (RSS + arXiv API + HF Daily Papers) with a
--      deterministic global ranking score so we can render "Recommended" /
--      "Recent" / per-kind tabs without per-user state.
--   2. A "Canon" of foundational papers, stored as regular resources with an
--      `is_canonical` flag and grouped by `canonical_category`. Reusing
--      `public.resources` keeps the Library Save flow, embeddings column, and
--      i18n keys uniform.
--   3. Saving external paper hits (Semantic Scholar / OpenAlex / arXiv) by
--      upserting a `resources` row keyed on its public URL plus a stable
--      `external_id` (DOI or arXiv id).
--
-- The personalized pgvector ranking layer is intentionally NOT added yet, but
-- `radar_items.embedding` is reserved here so adding it later is a one-line
-- `create index` rather than a schema change.

-- ---------------------------------------------------------------------------
-- rss_sources: per-source type + weight for ranking
-- ---------------------------------------------------------------------------
alter table public.rss_sources
  add column if not exists source_type text not null default 'rss',
  add column if not exists weight numeric not null default 1.0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'rss_sources_source_type_check'
  ) then
    alter table public.rss_sources
      add constraint rss_sources_source_type_check
      check (source_type in ('rss', 'arxiv', 'hf_daily_papers'));
  end if;
end$$;

comment on column public.rss_sources.source_type is
  'Ingest dispatcher: rss = generic RSS/Atom, arxiv = arXiv API (Atom + extra fields), hf_daily_papers = Hugging Face Daily Papers JSON.';
comment on column public.rss_sources.weight is
  'Editorial trust weight, multiplied into radar_items.score. Higher = more authoritative.';

-- ---------------------------------------------------------------------------
-- radar_items: kind, tags, hf_upvotes, external_id, score, content_lang, embedding
-- ---------------------------------------------------------------------------
alter table public.radar_items
  add column if not exists kind text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists hf_upvotes integer,
  add column if not exists external_id text,
  add column if not exists score numeric,
  add column if not exists content_lang text,
  add column if not exists embedding vector(1536);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'radar_items_kind_check'
  ) then
    alter table public.radar_items
      add constraint radar_items_kind_check
      check (kind is null or kind in (
        'article', 'paper', 'release', 'video', 'podcast', 'tool', 'tweet', 'community', 'other'
      ));
  end if;
end$$;

create index if not exists idx_radar_items_score on public.radar_items(score desc nulls last);
create index if not exists idx_radar_items_kind on public.radar_items(kind);
create index if not exists idx_radar_items_tags on public.radar_items using gin(tags);
create index if not exists idx_radar_items_external_id on public.radar_items(external_id);

-- Embedding index is omitted on purpose: ivfflat needs the table to be
-- non-empty to be useful. Add it via a follow-up migration after the first
-- backfill of embeddings is complete:
--   create index idx_radar_items_embedding on public.radar_items
--     using ivfflat (embedding vector_cosine_ops) with (lists = 100);

comment on column public.radar_items.kind is
  'Inferred content type. Drives Radar tabs and Library filters.';
comment on column public.radar_items.score is
  'Deterministic global ranking score. Updated by radar-ingest on every upsert. Higher = rank first.';
comment on column public.radar_items.external_id is
  'Stable id from the upstream source (arXiv id, DOI, HF paper id). Used to dedupe across sources.';
comment on column public.radar_items.embedding is
  'Reserved for per-user pgvector ranking (Phase E). Backfill via ai-enrich embed action when enabled.';

-- ---------------------------------------------------------------------------
-- resources: canonical flag + external id (for Canon + saved Scholar hits)
-- ---------------------------------------------------------------------------
alter table public.resources
  add column if not exists is_canonical boolean not null default false,
  add column if not exists canonical_category text,
  add column if not exists canonical_position integer,
  add column if not exists external_id text;

create index if not exists idx_resources_is_canonical
  on public.resources(canonical_category, canonical_position)
  where is_canonical = true;

create index if not exists idx_resources_external_id on public.resources(external_id)
  where external_id is not null;

comment on column public.resources.is_canonical is
  'True for foundational papers/articles. Surfaced via /library/canon.';
comment on column public.resources.canonical_category is
  'Editorial section: foundations, transformers, prompting, alignment, agents, rag, scaling, multimodal, reasoning.';
comment on column public.resources.canonical_position is
  'Display order within a canonical_category. NULL items render at the end.';
comment on column public.resources.external_id is
  'DOI, arXiv id, or HF paper id. Set when the resource was minted from a Scholar/Radar source.';
