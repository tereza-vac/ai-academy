-- Resources: any link, article, paper or video that can appear in Learn / Radar / Library.
-- An enrichment pass (see ai-enrich edge function) fills `summary`, `tags`, `embedding`.

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  title text not null,
  source_name text,                 -- 'OpenAI', 'Anthropic', 'arXiv', etc.
  kind text not null default 'article'
    check (kind in ('article','paper','video','podcast','tool','release','tweet','other')),
  summary text,
  author text,
  published_at timestamptz,
  image_url text,
  tags text[] not null default '{}',
  topic_ids uuid[] not null default '{}',     -- topics this resource is associated with
  embedding vector(1536),
  enrichment_status text not null default 'pending'
    check (enrichment_status in ('pending','enriched','failed','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (url)
);

drop trigger if exists set_resources_updated_at on public.resources;
create trigger set_resources_updated_at
  before update on public.resources
  for each row execute function public.set_updated_at();

create index if not exists idx_resources_published_at on public.resources(published_at desc nulls last);
create index if not exists idx_resources_kind on public.resources(kind);
create index if not exists idx_resources_tags on public.resources using gin(tags);
create index if not exists idx_resources_topic_ids on public.resources using gin(topic_ids);
create index if not exists idx_resources_embedding
  on public.resources using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.resources enable row level security;

drop policy if exists "resources_read_all" on public.resources;
create policy "resources_read_all" on public.resources
  for select to authenticated using (true);

-- Editors and admins may upsert resources (RSS ingestion uses the service role anyway).
drop policy if exists "resources_write_editors" on public.resources;
create policy "resources_write_editors" on public.resources
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('editor','admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('editor','admin')));
