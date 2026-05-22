-- One-time bootstrap for the radar-ingest-hourly cron job.
--
-- Run AFTER migration 20260101000011_radar_cron.sql is applied.
-- Run ONCE per environment, in Supabase Studio -> SQL Editor.
--
-- Replace YOUR_SERVICE_ROLE_KEY with the service_role key from
-- Supabase Dashboard -> Project Settings -> API. Don't commit it.

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'supabase_project_url') then
    perform vault.create_secret(
      'https://iusyhjcckowaqlykbahe.supabase.co',
      'supabase_project_url'
    );
  end if;

  if not exists (select 1 from vault.secrets where name = 'supabase_service_role_key') then
    perform vault.create_secret(
      'YOUR_SERVICE_ROLE_KEY',
      'supabase_service_role_key'
    );
  end if;
end$$;

-- Verify both secrets are present:
select name, created_at from vault.secrets
 where name in ('supabase_project_url', 'supabase_service_role_key')
 order by name;

-- See the scheduled job:
select jobid, schedule, jobname, active from cron.job where jobname = 'radar-ingest-hourly';

-- Fire it once right now to confirm it works end-to-end:
select public.trigger_radar_ingest();
