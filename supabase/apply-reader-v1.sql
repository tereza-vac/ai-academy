-- =============================================================================
-- AI Academy — Internal Reader v1 (PR-1 + PR-2 + PR-3)
--
-- One-shot bootstrap of:
--   * migrations 20260101000013_resource_availability.sql
--   * migrations 20260101000014_resource_content.sql
--   * migrations 20260101000015_resource_content_rpcs.sql
--   * migrations 20260101000016_translation_glossary.sql
--   * seed       07_translation_glossary.sql
--
-- Paste this into the Supabase SQL editor and run as a single statement.
-- All four migrations are idempotent (`if not exists`, `do … exception …`)
-- so re-running is safe.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 13 — resource availability enum + columns
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.resource_availability as enum (
    'metadata_only',
    'excerpt_only',
    'full_text_api',
    'full_text_scraped',
    'full_text_unavailable'
  );
exception when duplicate_object then
  null;
end$$;

alter table public.resources
  add column if not exists availability public.resource_availability
    not null default 'metadata_only';

alter table public.resources
  add column if not exists source_lang text;

create index if not exists idx_resources_availability
  on public.resources(availability);

comment on column public.resources.availability is
  'How much of this resource we can render in the internal reader. Set by the resource-import edge function.';
comment on column public.resources.source_lang is
  'ISO 639-1 of the imported source content (e.g. ''en''). Drives lazy-translation decisions in the reader.';


-- ---------------------------------------------------------------------------
-- 14 — content tables
-- ---------------------------------------------------------------------------
create table if not exists public.resource_contents (
  resource_id uuid primary key
    references public.resources(id) on delete cascade,
  source_url text not null,
  source_lang text not null default 'en',
  license text,
  importer text not null,
  importer_version smallint not null default 1,
  word_count int,
  has_equations boolean not null default false,
  has_tables boolean not null default false,
  last_imported_at timestamptz not null default now(),
  raw_meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_resource_contents_importer
  on public.resource_contents(importer);
create index if not exists idx_resource_contents_license
  on public.resource_contents(license);

create table if not exists public.resource_content_blocks (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  block_uid text not null,
  position int not null,
  type text not null check (type in (
    'heading','paragraph','image','caption','table','list',
    'equation','code','callout','quote'
  )),
  payload jsonb not null,
  text_hash text,
  created_at timestamptz not null default now(),
  unique (resource_id, block_uid)
);

create index if not exists idx_resource_content_blocks_resource_pos
  on public.resource_content_blocks(resource_id, position);
create index if not exists idx_resource_content_blocks_type
  on public.resource_content_blocks(type);

create table if not exists public.resource_content_translations (
  block_id uuid not null
    references public.resource_content_blocks(id) on delete cascade,
  locale text not null check (locale in ('cs','en','sk','pl')),
  payload jsonb not null,
  translator text not null,
  source_text_hash text not null,
  generated_at timestamptz not null default now(),
  primary key (block_id, locale)
);

create index if not exists idx_resource_content_translations_locale
  on public.resource_content_translations(locale);

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


-- ---------------------------------------------------------------------------
-- 15 — content RPCs (SECURITY DEFINER, service_role only)
-- ---------------------------------------------------------------------------
create or replace function public.upsert_resource_content(
  p_resource_id uuid,
  p_meta jsonb,
  p_blocks jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int := 0;
  v_updated  int := 0;
  v_deleted  int := 0;
  v_kept     int := 0;
  v_avail    text;
begin
  if p_resource_id is null then
    raise exception 'p_resource_id required' using errcode = '22023';
  end if;
  if p_meta is null or jsonb_typeof(p_meta) <> 'object' then
    raise exception 'p_meta must be a JSON object' using errcode = '22023';
  end if;
  if p_blocks is null or jsonb_typeof(p_blocks) <> 'array' then
    raise exception 'p_blocks must be a JSON array' using errcode = '22023';
  end if;

  v_avail := coalesce(p_meta->>'availability', 'metadata_only');
  if v_avail not in (
    'metadata_only','excerpt_only','full_text_api',
    'full_text_scraped','full_text_unavailable'
  ) then
    raise exception 'invalid availability: %', v_avail using errcode = '22023';
  end if;

  insert into public.resource_contents (
    resource_id, source_url, source_lang, license, importer,
    importer_version, word_count, has_equations, has_tables,
    last_imported_at, raw_meta
  ) values (
    p_resource_id,
    coalesce(p_meta->>'source_url', ''),
    coalesce(p_meta->>'source_lang', 'en'),
    p_meta->>'license',
    coalesce(p_meta->>'importer', 'unknown'),
    coalesce((p_meta->>'importer_version')::smallint, 1::smallint),
    nullif(p_meta->>'word_count','')::int,
    coalesce((p_meta->>'has_equations')::boolean, false),
    coalesce((p_meta->>'has_tables')::boolean, false),
    now(),
    coalesce(p_meta->'raw_meta', '{}'::jsonb)
  )
  on conflict (resource_id) do update set
    source_url       = excluded.source_url,
    source_lang      = excluded.source_lang,
    license          = excluded.license,
    importer         = excluded.importer,
    importer_version = excluded.importer_version,
    word_count       = excluded.word_count,
    has_equations    = excluded.has_equations,
    has_tables       = excluded.has_tables,
    last_imported_at = excluded.last_imported_at,
    raw_meta         = excluded.raw_meta;

  create temp table _incoming on commit drop as
  select
    (b->>'block_uid')::text                            as block_uid,
    (b->>'position')::int                              as position,
    (b->>'type')::text                                 as type,
    coalesce(b->'payload', '{}'::jsonb)                as payload,
    nullif(b->>'text_hash','')                         as text_hash
  from jsonb_array_elements(p_blocks) b;

  with d as (
    delete from public.resource_content_blocks b
    where b.resource_id = p_resource_id
      and not exists (
        select 1 from _incoming i where i.block_uid = b.block_uid
      )
    returning 1
  )
  select count(*) into v_deleted from d;

  with ins as (
    insert into public.resource_content_blocks
      (resource_id, block_uid, position, type, payload, text_hash)
    select p_resource_id, i.block_uid, i.position, i.type, i.payload, i.text_hash
    from _incoming i
    where not exists (
      select 1 from public.resource_content_blocks b
      where b.resource_id = p_resource_id and b.block_uid = i.block_uid
    )
    returning 1
  )
  select count(*) into v_inserted from ins;

  with upd as (
    update public.resource_content_blocks b
    set position = i.position,
        type     = i.type,
        payload  = i.payload,
        text_hash = i.text_hash
    from _incoming i
    where b.resource_id = p_resource_id
      and b.block_uid = i.block_uid
      and (b.text_hash is distinct from i.text_hash
        or b.position <> i.position
        or b.type    <> i.type)
    returning 1
  )
  select count(*) into v_updated from upd;

  v_kept := greatest(
    0,
    (select count(*) from _incoming) - v_inserted - v_updated
  );

  delete from public.resource_content_translations t
  using public.resource_content_blocks b
  where t.block_id = b.id
    and b.resource_id = p_resource_id
    and t.source_text_hash is distinct from b.text_hash;

  update public.resources
     set availability = v_avail::public.resource_availability,
         source_lang  = coalesce(p_meta->>'source_lang', source_lang)
   where id = p_resource_id;

  return jsonb_build_object(
    'inserted', v_inserted,
    'updated',  v_updated,
    'kept',     v_kept,
    'deleted',  v_deleted,
    'availability', v_avail
  );
end;
$$;

comment on function public.upsert_resource_content is
  'Service-role only. Replaces a resources content manifest and diffs its block list, preserving block_uid identity so translations survive re-imports.';

revoke all on function public.upsert_resource_content(uuid, jsonb, jsonb) from public;
revoke all on function public.upsert_resource_content(uuid, jsonb, jsonb) from anon;
revoke all on function public.upsert_resource_content(uuid, jsonb, jsonb) from authenticated;
grant execute on function public.upsert_resource_content(uuid, jsonb, jsonb) to service_role;


create or replace function public.upsert_resource_translations(
  p_resource_id uuid,
  p_locale text,
  p_translations jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_upserted int := 0;
  v_skipped  int := 0;
begin
  if p_resource_id is null then
    raise exception 'p_resource_id required' using errcode = '22023';
  end if;
  if p_locale not in ('cs','en','sk','pl') then
    raise exception 'unsupported locale: %', p_locale using errcode = '22023';
  end if;
  if p_translations is null or jsonb_typeof(p_translations) <> 'array' then
    raise exception 'p_translations must be a JSON array' using errcode = '22023';
  end if;

  with incoming as (
    select
      (t->>'block_uid')::text       as block_uid,
      coalesce(t->'payload','{}'::jsonb) as payload,
      coalesce(t->>'translator','openai/gpt-4o-mini') as translator,
      coalesce(t->>'source_text_hash','') as source_text_hash
    from jsonb_array_elements(p_translations) t
  ),
  joined as (
    select b.id as block_id, i.payload, i.translator, i.source_text_hash, b.text_hash
    from incoming i
    join public.resource_content_blocks b
      on b.resource_id = p_resource_id
     and b.block_uid   = i.block_uid
  ),
  fresh as (
    select * from joined
    where source_text_hash = coalesce(text_hash, '')
  ),
  upserted as (
    insert into public.resource_content_translations
      (block_id, locale, payload, translator, source_text_hash, generated_at)
    select block_id, p_locale, payload, translator, source_text_hash, now()
    from fresh
    on conflict (block_id, locale) do update set
      payload          = excluded.payload,
      translator       = excluded.translator,
      source_text_hash = excluded.source_text_hash,
      generated_at     = excluded.generated_at
    returning 1
  )
  select count(*) into v_upserted from upserted;

  v_skipped := (
    select count(*) from jsonb_array_elements(p_translations)
  ) - v_upserted;

  return jsonb_build_object(
    'upserted', v_upserted,
    'skipped',  v_skipped,
    'locale',   p_locale
  );
end;
$$;

comment on function public.upsert_resource_translations is
  'Service-role only. Persists translated block payloads for one (resource, locale). Silently skips entries whose source_text_hash is stale.';

revoke all on function public.upsert_resource_translations(uuid, text, jsonb) from public;
revoke all on function public.upsert_resource_translations(uuid, text, jsonb) from anon;
revoke all on function public.upsert_resource_translations(uuid, text, jsonb) from authenticated;
grant execute on function public.upsert_resource_translations(uuid, text, jsonb) to service_role;


create or replace function public.log_resource_import(
  p_resource_id uuid,
  p_importer text,
  p_status text,
  p_message text default null,
  p_duration_ms int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_status not in ('ok','partial','failed','skipped') then
    raise exception 'invalid status: %', p_status using errcode = '22023';
  end if;
  insert into public.resource_imports_log
    (resource_id, importer, status, message, duration_ms)
  values
    (p_resource_id, p_importer, p_status, p_message, p_duration_ms)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.log_resource_import(uuid, text, text, text, int) from public;
revoke all on function public.log_resource_import(uuid, text, text, text, int) from anon;
revoke all on function public.log_resource_import(uuid, text, text, text, int) from authenticated;
grant execute on function public.log_resource_import(uuid, text, text, text, int) to service_role;


-- ---------------------------------------------------------------------------
-- 16 — translation glossary (table + seed inline)
-- ---------------------------------------------------------------------------
create table if not exists public.translation_glossary (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('cs','en','sk','pl')),
  term text not null,
  translation text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (locale, term)
);

create index if not exists idx_translation_glossary_locale
  on public.translation_glossary(locale);

drop trigger if exists set_translation_glossary_updated_at on public.translation_glossary;
create trigger set_translation_glossary_updated_at
  before update on public.translation_glossary
  for each row execute function public.set_updated_at();

alter table public.translation_glossary enable row level security;

drop policy if exists "translation_glossary_read_all" on public.translation_glossary;
create policy "translation_glossary_read_all" on public.translation_glossary
  for select to authenticated using (true);

drop policy if exists "translation_glossary_write_editors" on public.translation_glossary;
create policy "translation_glossary_write_editors" on public.translation_glossary
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor','admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor','admin')
    )
  );

comment on table public.translation_glossary is
  'Per-locale jargon translations injected into the resource-translate prompt to keep terminology consistent.';

-- Seed data (idempotent via ON CONFLICT DO NOTHING)
insert into public.translation_glossary (locale, term, translation, notes) values
  ('cs','fine-tuning','doladění','noun'),
  ('cs','pre-training','předtrénování',null),
  ('cs','prompt engineering','prompt engineering','leave untranslated'),
  ('cs','attention head','attention hlava',null),
  ('cs','transformer','transformer','leave untranslated'),
  ('cs','embedding','embedding','leave untranslated'),
  ('cs','token','token',null),
  ('cs','context window','kontextové okno',null),
  ('cs','inference','inference',null),
  ('cs','large language model','velký jazykový model',null),
  ('cs','reinforcement learning','zpětnovazební učení',null),
  ('cs','chain of thought','řetězec úvah',null),
  ('cs','few-shot','few-shot','leave untranslated'),
  ('cs','zero-shot','zero-shot','leave untranslated'),
  ('cs','retrieval-augmented generation','generování s vyhledáváním (RAG)',null),
  ('cs','alignment','zarovnání',null),
  ('cs','evaluation','evaluace',null),
  ('sk','fine-tuning','doladenie','noun'),
  ('sk','pre-training','predtrénovanie',null),
  ('sk','prompt engineering','prompt engineering','leave untranslated'),
  ('sk','attention head','attention hlava',null),
  ('sk','transformer','transformer','leave untranslated'),
  ('sk','embedding','embedding','leave untranslated'),
  ('sk','token','token',null),
  ('sk','context window','kontextové okno',null),
  ('sk','inference','inferencia',null),
  ('sk','large language model','veľký jazykový model',null),
  ('sk','reinforcement learning','spätnoväzbové učenie',null),
  ('sk','chain of thought','reťazec úvah',null),
  ('sk','few-shot','few-shot','leave untranslated'),
  ('sk','zero-shot','zero-shot','leave untranslated'),
  ('sk','retrieval-augmented generation','generovanie s vyhľadávaním (RAG)',null),
  ('sk','alignment','zarovnanie',null),
  ('sk','evaluation','evaluácia',null),
  ('pl','fine-tuning','dostrajanie','noun'),
  ('pl','pre-training','pretrenowanie',null),
  ('pl','prompt engineering','inżynieria promptów',null),
  ('pl','attention head','głowica uwagi',null),
  ('pl','transformer','transformator','architecture sense'),
  ('pl','embedding','osadzenie (embedding)',null),
  ('pl','token','token',null),
  ('pl','context window','okno kontekstu',null),
  ('pl','inference','wnioskowanie',null),
  ('pl','large language model','duży model językowy',null),
  ('pl','reinforcement learning','uczenie ze wzmocnieniem',null),
  ('pl','chain of thought','łańcuch myślenia',null),
  ('pl','few-shot','few-shot','leave untranslated'),
  ('pl','zero-shot','zero-shot','leave untranslated'),
  ('pl','retrieval-augmented generation','generacja wspomagana wyszukiwaniem (RAG)',null),
  ('pl','alignment','wyrównanie',null),
  ('pl','evaluation','ewaluacja',null),
  ('en','fine-tuning','fine-tuning',null),
  ('en','pre-training','pre-training',null),
  ('en','prompt engineering','prompt engineering',null),
  ('en','attention head','attention head',null),
  ('en','transformer','transformer',null),
  ('en','embedding','embedding',null),
  ('en','token','token',null),
  ('en','context window','context window',null),
  ('en','inference','inference',null),
  ('en','large language model','large language model',null),
  ('en','reinforcement learning','reinforcement learning',null),
  ('en','chain of thought','chain of thought',null),
  ('en','few-shot','few-shot',null),
  ('en','zero-shot','zero-shot',null),
  ('en','retrieval-augmented generation','retrieval-augmented generation',null),
  ('en','alignment','alignment',null),
  ('en','evaluation','evaluation',null)
on conflict (locale, term) do nothing;
