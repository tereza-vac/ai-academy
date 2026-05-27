-- Schedule basecamp-sync via pg_cron + pg_net.
--
-- Same shape as 20260101000011_radar_cron.sql. Idempotent: re-running the
-- migration upserts the cron job, vault secrets are untouched.
--
-- Required vault secrets (set once, see supabase/setup-cron-secrets.sql):
--   - supabase_project_url
--   - supabase_service_role_key
--
-- The basecamp-sync function additionally requires its own secrets at runtime
-- (BASECAMP_CLIENT_ID, BASECAMP_CLIENT_SECRET, BASECAMP_USER_AGENT, plus the
-- per-workspace refresh token in vault). Those are read by the function from
-- environment / vault — not by this trigger.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_basecamp_sync()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, net, vault
as $$
declare
  base_url text;
  api_key  text;
  req_id   bigint;
begin
  select decrypted_secret into base_url
    from vault.decrypted_secrets
   where name = 'supabase_project_url'
   limit 1;

  select decrypted_secret into api_key
    from vault.decrypted_secrets
   where name = 'supabase_service_role_key'
   limit 1;

  if base_url is null or api_key is null then
    raise notice 'trigger_basecamp_sync: vault secrets not set';
    return null;
  end if;

  select net.http_post(
    url     := base_url || '/functions/v1/basecamp-sync',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'apikey',        api_key,
      'Authorization', 'Bearer ' || api_key
    ),
    body    := '{}'::jsonb
  ) into req_id;

  return req_id;
end;
$$;

comment on function public.trigger_basecamp_sync is
  'Fires basecamp-sync edge function. Reads project URL + service role key from Supabase Vault. Called by the basecamp-sync-hourly cron job.';

-- Stagger off radar-ingest (which runs at :17) to spread the load.
select cron.schedule(
  'basecamp-sync-hourly',
  '37 * * * *',
  $cron$ select public.trigger_basecamp_sync(); $cron$
);
