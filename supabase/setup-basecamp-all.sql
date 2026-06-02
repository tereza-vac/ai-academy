-- ===========================================================================
-- AI Academy — Basecamp integration one-shot bootstrap
-- ===========================================================================
-- Run ONCE in Supabase Studio -> SQL Editor on project iusyhjcckowaqlykbahe.
--
-- Bundles (idempotent — safe to re-run):
--   1. migration 20260101000017_basecamp_integration.sql  (tables + RLS + RPC)
--   2. setup-basecamp.sql                                  (vault helper RPCs)
--   3. migration 20260101000018_basecamp_cron.sql          (hourly sync cron)
--
-- After this runs, open in a browser (signed in to the Basecamp account whose
-- projects you want to surface):
--   https://iusyhjcckowaqlykbahe.supabase.co/functions/v1/basecamp-auth?action=start
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1) Tables, indexes, RLS, visibility RPC  (migration 17)
-- ---------------------------------------------------------------------------
create table if not exists public.basecamp_workspaces (
  id uuid primary key default gen_random_uuid(),
  account_id text not null unique,
  account_name text,
  vault_secret_name text not null default 'basecamp_refresh_token',
  ai_keywords text[] not null default array[
    'ai','a.i.','umělá inteligence','umela inteligence','umělé inteligence',
    'ml','machine learning','strojové učení','strojove uceni',
    'llm','gpt','copilot','claude','prompt','rag','agent',
    'ai gramotnost','generativní','generative','chatbot'
  ]::text[],
  last_full_sync_at timestamptz,
  last_full_sync_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_basecamp_workspaces_updated_at on public.basecamp_workspaces;
create trigger set_basecamp_workspaces_updated_at
  before update on public.basecamp_workspaces
  for each row execute function public.set_updated_at();

create table if not exists public.basecamp_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.basecamp_workspaces(id) on delete cascade,
  basecamp_id bigint not null,
  name text not null,
  description text,
  purpose text,
  status text,
  url text not null,
  app_url text,
  is_ai_relevant boolean not null default false,
  manual_visibility text,
  last_active_at timestamptz,
  raw jsonb,
  ingested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, basecamp_id)
);

drop trigger if exists set_basecamp_projects_updated_at on public.basecamp_projects;
create trigger set_basecamp_projects_updated_at
  before update on public.basecamp_projects
  for each row execute function public.set_updated_at();

create index if not exists idx_basecamp_projects_active
  on public.basecamp_projects(last_active_at desc nulls last);
create index if not exists idx_basecamp_projects_ai
  on public.basecamp_projects(is_ai_relevant)
  where is_ai_relevant;

create table if not exists public.basecamp_recordings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.basecamp_projects(id) on delete cascade,
  basecamp_id bigint not null,
  kind text not null,
  parent_recording_id uuid references public.basecamp_recordings(id) on delete cascade,
  title text,
  content_html text,
  excerpt text,
  author_id bigint,
  author_name text,
  author_avatar_url text,
  url text,
  posted_at timestamptz,
  edited_at timestamptz,
  raw jsonb,
  ingested_at timestamptz not null default now(),
  unique (project_id, kind, basecamp_id)
);

create index if not exists idx_basecamp_recordings_project
  on public.basecamp_recordings(project_id, posted_at desc nulls last);
create index if not exists idx_basecamp_recordings_kind
  on public.basecamp_recordings(kind);
create index if not exists idx_basecamp_recordings_recent
  on public.basecamp_recordings(posted_at desc nulls last);

alter table public.basecamp_workspaces enable row level security;
alter table public.basecamp_projects   enable row level security;
alter table public.basecamp_recordings enable row level security;

drop policy if exists "basecamp_workspaces_read_authenticated" on public.basecamp_workspaces;
create policy "basecamp_workspaces_read_authenticated" on public.basecamp_workspaces
  for select to authenticated using (true);

drop policy if exists "basecamp_workspaces_write_admins" on public.basecamp_workspaces;
create policy "basecamp_workspaces_write_admins" on public.basecamp_workspaces
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "basecamp_projects_read_all" on public.basecamp_projects;
create policy "basecamp_projects_read_all" on public.basecamp_projects
  for select to authenticated using (true);

drop policy if exists "basecamp_projects_update_editors" on public.basecamp_projects;
create policy "basecamp_projects_update_editors" on public.basecamp_projects
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('editor','admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('editor','admin')));

drop policy if exists "basecamp_recordings_read_all" on public.basecamp_recordings;
create policy "basecamp_recordings_read_all" on public.basecamp_recordings
  for select to authenticated using (true);

create or replace function public.set_basecamp_project_visibility(
  p_project_id uuid,
  p_visibility text
)
returns public.basecamp_projects
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.basecamp_projects;
begin
  if p_visibility is not null and p_visibility not in ('show','hide') then
    raise exception 'visibility must be null, ''show'' or ''hide''';
  end if;
  if not exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.role in ('editor','admin')
  ) then
    raise exception 'insufficient privileges';
  end if;

  update public.basecamp_projects
     set manual_visibility = p_visibility
   where id = p_project_id
   returning * into result;

  if result.id is null then
    raise exception 'project not found';
  end if;
  return result;
end;
$$;


-- ---------------------------------------------------------------------------
-- 2) Vault helper RPCs  (setup-basecamp.sql)
-- ---------------------------------------------------------------------------
create extension if not exists supabase_vault;

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
  if auth.role() <> 'service_role' then
    raise exception 'vault_create_secret: service_role required';
  end if;
  perform vault.create_secret(p_secret, p_name, p_description);
end;
$$;

revoke all on function public.vault_create_secret(text, text, text) from public;
revoke all on function public.vault_create_secret(text, text, text) from authenticated, anon;

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


-- ---------------------------------------------------------------------------
-- 3) Hourly sync cron  (migration 18) — cron.schedule upserts by name
-- ---------------------------------------------------------------------------
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

select cron.schedule(
  'basecamp-sync-hourly',
  '37 * * * *',
  $cron$ select public.trigger_basecamp_sync(); $cron$
);


-- ---------------------------------------------------------------------------
-- Smoke checks
-- ---------------------------------------------------------------------------
select 'tables' as check, count(*) as n
  from information_schema.tables
 where table_schema = 'public'
   and table_name in ('basecamp_workspaces','basecamp_projects','basecamp_recordings');

select 'vault_helpers' as check, count(*) as n
  from pg_proc
 where proname in ('vault_create_secret','vault_read_secret_by_name','vault_delete_secret_by_name');

select jobid, schedule, jobname, active
  from cron.job
 where jobname = 'basecamp-sync-hourly';
