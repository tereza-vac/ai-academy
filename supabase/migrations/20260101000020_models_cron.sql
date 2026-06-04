-- Schedule models-ingest daily (model landscape changes slower than Radar).

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_models_ingest()
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
    raise notice 'trigger_models_ingest: vault secrets not set';
    return null;
  end if;

  select net.http_post(
    url     := base_url || '/functions/v1/models-ingest',
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

comment on function public.trigger_models_ingest is
  'POST to models-ingest Edge Function. Daily refresh of the LLM catalog from OpenRouter + Hugging Face.';

-- 03:42 UTC daily — off-peak, distinct from radar (:17).
select cron.schedule(
  'models-ingest-daily',
  '42 3 * * *',
  $cron$ select public.trigger_models_ingest(); $cron$
);
