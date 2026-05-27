-- =============================================================================
-- SECURITY DEFINER RPCs for the resource-import and resource-translate
-- edge functions. Clients can only READ from the content tables (via RLS);
-- all writes flow through these functions, called by the service role.
--
-- Hardening pattern matches 20260101000012_external_resource_rpc.sql:
--   - revoke all from public + anon
--   - grant execute to service_role only (not authenticated; the edge
--     function uses the service role key to call these)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- public.upsert_resource_content(p_resource_id, p_meta, p_blocks)
--
-- Single transaction:
--   1. Upsert resource_contents row (the manifest).
--   2. Diff the incoming blocks against existing block_uids:
--        - new uid           -> insert
--        - same uid, same hash -> leave (preserves translations)
--        - same uid, new hash  -> update payload + text_hash + position
--        - missing uid       -> delete (cascades translations)
--   3. Update resources.availability and resources.source_lang.
--
-- p_meta shape (jsonb):
--   {
--     source_url, source_lang, license, importer, importer_version,
--     word_count, has_equations, has_tables, raw_meta,
--     availability  -- one of the public.resource_availability enum values
--   }
--
-- p_blocks shape (jsonb array): each element
--   { block_uid, position, type, payload, text_hash }
--
-- Returns counts for ops/debug.
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

  -- 1. Manifest upsert
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

  -- 2. Block diff
  --    Stage incoming rows so we can compute set differences cleanly.
  create temp table _incoming on commit drop as
  select
    (b->>'block_uid')::text                            as block_uid,
    (b->>'position')::int                              as position,
    (b->>'type')::text                                 as type,
    coalesce(b->'payload', '{}'::jsonb)                as payload,
    nullif(b->>'text_hash','')                         as text_hash
  from jsonb_array_elements(p_blocks) b;

  -- Delete blocks that disappeared from the incoming set.
  with d as (
    delete from public.resource_content_blocks b
    where b.resource_id = p_resource_id
      and not exists (
        select 1 from _incoming i where i.block_uid = b.block_uid
      )
    returning 1
  )
  select count(*) into v_deleted from d;

  -- Insert new uids.
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

  -- Update existing uids whose hash or position changed.
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

  -- Invalidate translations whose source_text_hash no longer matches.
  -- We delete rather than mark-stale so the freshness check in the reader
  -- can stay a simple inner join.
  delete from public.resource_content_translations t
  using public.resource_content_blocks b
  where t.block_id = b.id
    and b.resource_id = p_resource_id
    and t.source_text_hash is distinct from b.text_hash;

  -- 3. Push availability + source_lang onto the parent resource.
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


-- ---------------------------------------------------------------------------
-- public.upsert_resource_translations(p_resource_id, p_locale, p_translations)
--
-- Bulk upserts translated payloads for one resource + one locale.
-- p_translations shape (jsonb array): each element
--   { block_uid, payload, translator, source_text_hash }
--
-- The function resolves block_uid -> block_id internally so callers don't need
-- to fetch ids first.
-- ---------------------------------------------------------------------------
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
    -- Only persist translations whose source_text_hash still matches the
    -- current block. Stale translations get silently skipped — the caller
    -- can compute v_skipped from the returned counts.
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


-- ---------------------------------------------------------------------------
-- public.log_resource_import(p_resource_id, p_importer, p_status, p_message, p_duration_ms)
--
-- Cheap ops insert into resource_imports_log. Callable from the edge function
-- without needing INSERT grants on the table.
-- ---------------------------------------------------------------------------
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
