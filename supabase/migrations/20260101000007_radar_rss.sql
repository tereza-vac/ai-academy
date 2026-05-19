-- Radar / RSS ingestion
-- rss_sources: feeds to poll (registered manually or via Build Lab item).
-- radar_items: dedup-by-link items that surface in the Radar feed.
-- radar_items can become a `resources` row (via radar_item.resource_id) once enriched.

create table if not exists public.rss_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  homepage_url text,
  category text,                    -- 'research' | 'product' | 'news' | 'community'
  is_active boolean not null default true,
  last_polled_at timestamptz,
  last_polled_status text,          -- 'ok' | 'error: <message>'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_rss_sources_updated_at on public.rss_sources;
create trigger set_rss_sources_updated_at
  before update on public.rss_sources
  for each row execute function public.set_updated_at();

create table if not exists public.radar_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.rss_sources(id) on delete set null,
  link text not null,
  title text not null,
  summary text,
  author text,
  published_at timestamptz,
  raw jsonb,                        -- raw parsed entry, kept for debugging / re-enrichment
  resource_id uuid references public.resources(id) on delete set null,
  ingested_at timestamptz not null default now(),
  unique (link)
);

create index if not exists idx_radar_items_published_at on public.radar_items(published_at desc nulls last);
create index if not exists idx_radar_items_source_id on public.radar_items(source_id);

alter table public.rss_sources enable row level security;
alter table public.radar_items enable row level security;

-- Everyone authenticated can browse the radar; only editors/admins manage sources.
drop policy if exists "rss_sources_read_all" on public.rss_sources;
create policy "rss_sources_read_all" on public.rss_sources
  for select to authenticated using (true);

drop policy if exists "rss_sources_write_editors" on public.rss_sources;
create policy "rss_sources_write_editors" on public.rss_sources
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('editor','admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('editor','admin')));

drop policy if exists "radar_items_read_all" on public.radar_items;
create policy "radar_items_read_all" on public.radar_items
  for select to authenticated using (true);
