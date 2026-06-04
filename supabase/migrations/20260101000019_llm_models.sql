-- LLM model catalog ("Spektrum modelů")
-- Curated rows carry rich descriptions; models-ingest merges live API data.

create table if not exists public.llm_models (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  provider text not null,
  family text,
  license_type text not null default 'unknown'
    check (license_type in ('commercial', 'open_source', 'research', 'unknown')),
  modalities text[] not null default '{}',
  context_window integer,
  parameter_count text,
  release_date date,
  summary text,
  description_md text,
  typical_use_cases text[] not null default '{}',
  strengths text[] not null default '{}',
  limitations text[] not null default '{}',
  tags text[] not null default '{}',
  homepage_url text,
  docs_url text,
  pricing_hint text,
  is_niche boolean not null default false,
  popularity_tier text not null default 'emerging'
    check (popularity_tier in ('mainstream', 'emerging', 'niche', 'legacy')),
  external_id text,
  source text not null default 'curated'
    check (source in ('curated', 'openrouter', 'huggingface')),
  preserve_curated boolean not null default false,
  raw jsonb,
  score numeric not null default 0,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_llm_models_provider on public.llm_models(provider);
create index if not exists idx_llm_models_license on public.llm_models(license_type);
create index if not exists idx_llm_models_score on public.llm_models(score desc);
create index if not exists idx_llm_models_popularity on public.llm_models(popularity_tier);

drop trigger if exists set_llm_models_updated_at on public.llm_models;
create trigger set_llm_models_updated_at
  before update on public.llm_models
  for each row execute function public.set_updated_at();

alter table public.llm_models enable row level security;

drop policy if exists "llm_models_read_all" on public.llm_models;
create policy "llm_models_read_all" on public.llm_models
  for select to authenticated using (true);

-- Writes only via service role (edge function models-ingest).
drop policy if exists "llm_models_write_service" on public.llm_models;
create policy "llm_models_write_service" on public.llm_models
  for all to service_role using (true) with check (true);
