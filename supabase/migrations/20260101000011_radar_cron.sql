-- Schedule radar-ingest hourly via pg_cron + pg_net.
--
-- Idempotent. Re-running this migration only replaces the cron job; it does
-- NOT touch your vault secrets, so set them once (see supabase/setup-cron-
-- secrets.sql for the one-time bootstrap snippet).
--
-- Flow:
--   pg_cron (minute 17 of every hour)
--     -> public.trigger_radar_ingest()
--       -> reads `supabase_project_url` + `supabase_service_role_key` from vault
--       -> net.http_post() to /functions/v1/radar-ingest
--       -> radar-ingest writes fresh radar_items rows with score/kind/tags

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_radar_ingest()
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
    raise notice 'trigger_radar_ingest: vault secrets supabase_project_url / supabase_service_role_key are not set';
    return null;
  end if;

  select net.http_post(
    url     := base_url || '/functions/v1/radar-ingest',
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

comment on function public.trigger_radar_ingest is
  'Fires an HTTP POST to the radar-ingest Edge Function. Reads project URL + service role key from Supabase Vault so the same code works across environments. Called by the radar-ingest-hourly cron job.';

-- cron.schedule(jobname, ...) is upsert-by-name, so this is safe to re-run.
-- Minute 17 instead of :00 to spread load away from the noisy top-of-hour.
select cron.schedule(
  'radar-ingest-hourly',
  '17 * * * *',
  $cron$ select public.trigger_radar_ingest(); $cron$
);
