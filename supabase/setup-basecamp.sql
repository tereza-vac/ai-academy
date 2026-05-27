-- One-time bootstrap for the Basecamp integration.
--
-- Run this AFTER:
--   1. Applying migrations 20260101000017_basecamp_integration.sql and
--      20260101000018_basecamp_cron.sql.
--   2. Setting the Edge Function secrets (BASECAMP_CLIENT_ID, _SECRET,
--      _REDIRECT_URI, _USER_AGENT) via `supabase secrets set ...`.
--
-- Run ONCE per environment, in Supabase Studio -> SQL Editor.
--
-- What it does:
--   - Creates `vault_create_secret`, `vault_read_secret_by_name` and
--     `vault_delete_secret_by_name` helper RPCs in `public`. The edge
--     functions call these (they have `security definer` semantics so RLS
--     and the locked-down `vault` schema stay out of their way).
--
-- After this runs, point a browser at:
--   <project-url>/functions/v1/basecamp-auth?action=start
-- and complete the OAuth flow once. The first sync runs at the next cron
-- tick (minute :37 of every hour) — or fire it manually with
-- `select public.trigger_basecamp_sync();`

create extension if not exists supabase_vault;

-- ----------------------------------------------------------------------------
-- vault_create_secret(secret, name, description) -> void
-- ----------------------------------------------------------------------------
create or replace function public.vault_create_secret(
  p_secret      text,
  p_name        text,
  p_description text default null
)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  -- Restrict to service-role callers. RLS doesn't apply to security-definer
  -- functions, but we still want a safety net so a future regression where
  -- this RPC is exposed to authenticated users doesn't leak vault writes.
  if auth.role() <> 'service_role' then
    raise exception 'vault_create_secret: service_role required';
  end if;
  perform vault.create_secret(p_secret, p_name, p_description);
end;
$$;

revoke all on function public.vault_create_secret(text, text, text) from public;
revoke all on function public.vault_create_secret(text, text, text) from authenticated, anon;

-- ----------------------------------------------------------------------------
-- vault_read_secret_by_name(name) -> text  (returns the decrypted secret)
-- ----------------------------------------------------------------------------
create or replace function public.vault_read_secret_by_name(p_name text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'vault_read_secret_by_name: service_role required';
  end if;
  select decrypted_secret into v
    from vault.decrypted_secrets
   where name = p_name
   limit 1;
  return v;
end;
$$;

revoke all on function public.vault_read_secret_by_name(text) from public;
revoke all on function public.vault_read_secret_by_name(text) from authenticated, anon;

-- ----------------------------------------------------------------------------
-- vault_delete_secret_by_name(name) -> void
-- ----------------------------------------------------------------------------
create or replace function public.vault_delete_secret_by_name(p_name text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'vault_delete_secret_by_name: service_role required';
  end if;
  delete from vault.secrets where name = p_name;
end;
$$;

revoke all on function public.vault_delete_secret_by_name(text) from public;
revoke all on function public.vault_delete_secret_by_name(text) from authenticated, anon;

-- ----------------------------------------------------------------------------
-- Smoke test
-- ----------------------------------------------------------------------------
-- Confirm the helpers exist:
select proname from pg_proc
 where proname in (
   'vault_create_secret',
   'vault_read_secret_by_name',
   'vault_delete_secret_by_name'
 );

-- The cron job will appear after migration 18 is applied:
select jobid, schedule, jobname, active
  from cron.job
 where jobname = 'basecamp-sync-hourly';
