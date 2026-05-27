-- Structured content blocks for the internal reader.
--
-- Three tables, in priority order:
--
--   resource_contents              1:1 manifest per imported resource (source-
--                                  language master). One row per resource.
--   resource_content_blocks        Ordered structured blocks (heading,
--                                  paragraph, image, equation, table, list,
--                                  code, callout, quote, caption). One row
--                                  per block. block_uid is stable across
--                                  re-imports so translations survive.
--   resource_content_translations  Per-locale translated payloads, keyed by
--                                  (block_id, locale). Fresh only while
--                                  source_text_hash == blocks.text_hash.
--   resource_imports_log           Audit trail. Cheap diagnostics for ops.
--
-- All four tables are READ-ONLY to authenticated clients. Writes go through
-- the SECURITY DEFINER RPCs in migration 20260101000015_resource_content_rpcs
-- which are restricted to the service role (called by edge functions only).

-- ---------------------------------------------------------------------------
-- resource_contents
-- ---------------------------------------------------------------------------
create table if not exists public.resource_contents (
  resource_id uuid primary key
    references public.resources(id) on delete cascade,
  source_url text not null,
  source_lang text not null default 'en',
  license text,                      -- 'cc-by' | 'cc-by-sa' | 'cc-by-nd' | 'cc0' | 'arxiv-nonexclusive' | 'allowlisted-blog' | 'unknown'
  importer text not null,            -- 'arxiv-ar5iv' | 'pmc-jats' | 'unpaywall-pdf' | 'readability' | 'metadata-only'
  importer_version smallint not null default 1,
  word_count int,
  has_equations boolean not null default false,
  has_tables boolean not null default false,
  last_imported_at timestamptz not null default now(),
  raw_meta jsonb not null default '{}'::jsonb
);

drop trigger if exists set_resource_contents_updated_at on public.resource_contents;
-- resource_contents has no updated_at column on purpose; last_imported_at is
-- the moral equivalent and is set explicitly by the import RPC.

create index if not exists idx_resource_contents_importer
  on public.resource_contents(importer);
create index if not exists idx_resource_contents_license
  on public.resource_contents(license);

-- ---------------------------------------------------------------------------
-- resource_content_blocks
-- ---------------------------------------------------------------------------
create table if not exists public.resource_content_blocks (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  block_uid text not null,           -- stable within doc; e.g. 'h1-1', 'p-12', 'eq-3'
  position int not null,
  type text not null check (type in (
    'heading','paragraph','image','caption','table','list',
    'equation','code','callout','quote'
  )),
  payload jsonb not null,            -- shape depends on type; validated client-side via Zod
  text_hash text,                    -- sha256 of source text; drives translation freshness
  created_at timestamptz not null default now(),
  unique (resource_id, block_uid)
);

create index if not exists idx_resource_content_blocks_resource_pos
  on public.resource_content_blocks(resource_id, position);
create index if not exists idx_resource_content_blocks_type
  on public.resource_content_blocks(type);

-- ---------------------------------------------------------------------------
-- resource_content_translations
-- ---------------------------------------------------------------------------
create table if not exists public.resource_content_translations (
  block_id uuid not null
    references public.resource_content_blocks(id) on delete cascade,
  locale text not null check (locale in ('cs','en','sk','pl')),
  payload jsonb not null,            -- same shape as blocks.payload; only text fields translated
  translator text not null,          -- 'openai/gpt-4o-mini' | 'human' | future providers
  source_text_hash text not null,    -- must equal blocks.text_hash to be considered fresh
  generated_at timestamptz not null default now(),
  primary key (block_id, locale)
);

create index if not exists idx_resource_content_translations_locale
  on public.resource_content_translations(locale);

-- ---------------------------------------------------------------------------
-- resource_imports_log
-- ---------------------------------------------------------------------------
create table if not exists public.resource_imports_log (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  importer text not null,
  status text not null check (status in ('ok','partial','failed','skipped')),
  message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists idx_resource_imports_log_resource_created
  on public.resource_imports_log(resource_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: read-only to authenticated; writes via SECURITY DEFINER RPCs only
-- ---------------------------------------------------------------------------
alter table public.resource_contents enable row level security;
alter table public.resource_content_blocks enable row level security;
alter table public.resource_content_translations enable row level security;
alter table public.resource_imports_log enable row level security;

drop policy if exists "resource_contents_read_all" on public.resource_contents;
create policy "resource_contents_read_all" on public.resource_contents
  for select to authenticated using (true);

drop policy if exists "resource_content_blocks_read_all" on public.resource_content_blocks;
create policy "resource_content_blocks_read_all" on public.resource_content_blocks
  for select to authenticated using (true);

drop policy if exists "resource_content_translations_read_all" on public.resource_content_translations;
create policy "resource_content_translations_read_all" on public.resource_content_translations
  for select to authenticated using (true);

drop policy if exists "resource_imports_log_read_editors" on public.resource_imports_log;
create policy "resource_imports_log_read_editors" on public.resource_imports_log
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor','admin')
    )
  );

comment on table public.resource_contents is
  'One row per imported resource. Holds the source-language manifest (URL, license, importer used).';
comment on table public.resource_content_blocks is
  'Ordered structured blocks rendered by the internal reader. block_uid is stable across re-imports.';
comment on table public.resource_content_translations is
  'Per-locale translated block payloads. Freshness is gated on source_text_hash matching the parent block.';
comment on table public.resource_imports_log is
  'Audit trail for the resource-import edge function. Editors-only read; ops/debugging.';
