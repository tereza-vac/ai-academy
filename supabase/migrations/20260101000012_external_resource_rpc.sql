-- =============================================================================
-- public.upsert_external_resource(...)
--
-- SECURITY DEFINER RPC that lets any authenticated user idempotently mint a
-- `resources` row from an external item (Radar pick, Scholar hit, manual
-- entry) without granting them blanket INSERT/UPDATE on the table.
--
-- Why we need this:
--   The base `resources_write_editors` RLS policy (see 20260101000003_resources)
--   restricts writes to profiles with role 'editor' / 'admin'. That is correct
--   for curated / canonical content, but it also blocks regular users from
--   saving a Radar item or a Scholar search hit to their library — the save
--   flow has to first upsert a `resources` row by URL.
--
-- What this function enforces (so SECURITY DEFINER is safe):
--   - auth.uid() must not be NULL (must be a logged-in user)
--   - URL must look like http(s)://…
--   - title must be non-empty
--   - kind is clamped to the allowed CHECK set
--   - `is_canonical`, `canonical_*`, `topic_ids`, `embedding` cannot be set
--     via this RPC, so users can never promote themselves into the curated
--     catalogue
--   - on conflict (url) we only OVERWRITE fields when the incoming value is
--     non-null, so an existing curated row keeps its richer metadata
-- =============================================================================

create or replace function public.upsert_external_resource(
  p_url text,
  p_title text,
  p_source_name text default null,
  p_kind text default 'article',
  p_summary text default null,
  p_author text default null,
  p_published_at timestamptz default null,
  p_tags text[] default '{}',
  p_external_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text := coalesce(p_kind, 'article');
  v_id   uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_url is null or length(trim(p_url)) < 8 or p_url !~* '^https?://' then
    raise exception 'invalid url' using errcode = '22023';
  end if;

  if p_title is null or length(trim(p_title)) < 1 then
    raise exception 'title required' using errcode = '22023';
  end if;

  if v_kind not in ('article','paper','video','podcast','tool','release','tweet','other') then
    v_kind := 'article';
  end if;

  insert into public.resources (
    url, title, source_name, kind, summary, author, published_at, tags,
    external_id, enrichment_status
  ) values (
    p_url, p_title, p_source_name, v_kind, p_summary, p_author, p_published_at,
    coalesce(p_tags, '{}'::text[]), p_external_id, 'pending'
  )
  on conflict (url) do update set
    title         = excluded.title,
    source_name   = coalesce(excluded.source_name, public.resources.source_name),
    kind          = excluded.kind,
    summary       = coalesce(excluded.summary,     public.resources.summary),
    author        = coalesce(excluded.author,      public.resources.author),
    published_at  = coalesce(excluded.published_at, public.resources.published_at),
    tags          = case
                      when array_length(excluded.tags, 1) > 0 then excluded.tags
                      else public.resources.tags
                    end,
    external_id   = coalesce(excluded.external_id, public.resources.external_id),
    updated_at    = now()
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.upsert_external_resource is
  'Authenticated users mint/refresh an external resource (Radar/Scholar save flows) without bypassing the curated-catalogue RLS on public.resources.';

revoke all on function public.upsert_external_resource(
  text, text, text, text, text, text, timestamptz, text[], text
) from public;

-- Postgres's default `GRANT EXECUTE ... TO PUBLIC` on CREATE FUNCTION leaves
-- `anon` (a member of PUBLIC) with EXECUTE on supabase-managed projects, even
-- after `REVOKE ... FROM public`. Explicit revoke makes the intent unambiguous.
revoke all on function public.upsert_external_resource(
  text, text, text, text, text, text, timestamptz, text[], text
) from anon;

grant execute on function public.upsert_external_resource(
  text, text, text, text, text, text, timestamptz, text[], text
) to authenticated;
