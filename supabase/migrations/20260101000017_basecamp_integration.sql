-- Basecamp integration (Phase 1)
--
-- Three tables:
--   basecamp_workspaces — single-row-per-account configuration: account id,
--                         OAuth refresh token (kept in vault, NOT here),
--                         last sync metadata.
--   basecamp_projects   — synced projects (Basecamp calls them "projects" or
--                         "buckets" depending on context — we store one row
--                         per project, including archived ones we still want
--                         to display).
--   basecamp_recordings — generic activity stream: messages, comments, todos,
--                         todo lists, schedule entries, documents, etc.
--                         Basecamp's data model unifies these under
--                         "recordings", so we mirror that here. Bodies are
--                         kept as HTML; the frontend sanitises on render.
--
-- All three are read-only for authenticated users; writes happen exclusively
-- through the basecamp-sync edge function (service role).

create table if not exists public.basecamp_workspaces (
  id uuid primary key default gen_random_uuid(),
  -- The numeric Basecamp account id (looks like 5234567 — visible in any URL
  -- like https://3.basecamp.com/<account_id>/...). Single-tenant for now —
  -- if we ever need multi-account, this column already gives us the seam.
  account_id text not null unique,
  account_name text,
  -- Vault secret name that holds the OAuth refresh token. The actual token
  -- never lands in this table; basecamp-sync reads it via Supabase Vault.
  vault_secret_name text not null default 'basecamp_refresh_token',
  -- AI-relevance keywords used to auto-flag projects. Kept in DB so admins
  -- can tune the filter without redeploying the edge function. Matched
  -- case-insensitively against project name + description.
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
  purpose text,            -- 'topic' | 'team' (Basecamp's own field)
  status text,             -- 'active' | 'archived' | 'trashed'
  url text not null,
  app_url text,            -- basecamp-app:// deep link, when available
  -- Computed at sync time (true when name/description matches ai_keywords).
  -- Kept as a stored column so the UI can filter/order without RPC.
  is_ai_relevant boolean not null default false,
  -- Optional manual override the editor can flip from the UI to force-show
  -- or force-hide a project regardless of the keyword filter.
  manual_visibility text,  -- null | 'show' | 'hide'
  last_active_at timestamptz,
  raw jsonb,               -- the full Basecamp payload, for future fields
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
  -- One of: 'message', 'comment', 'todo', 'todolist', 'schedule_entry',
  -- 'document', 'question_answer', 'cloud_file', 'upload', 'vault'.
  -- Stored as free text so future Basecamp additions don't require a
  -- schema migration; the frontend whitelists what it knows how to render.
  kind text not null,
  parent_recording_id uuid references public.basecamp_recordings(id) on delete cascade,
  title text,
  content_html text,         -- as returned by Basecamp ("rich content")
  excerpt text,              -- first ~280 chars stripped of HTML, computed at sync
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

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.basecamp_workspaces enable row level security;
alter table public.basecamp_projects   enable row level security;
alter table public.basecamp_recordings enable row level security;

-- Workspace metadata is admin-only (it includes vault secret name and the AI
-- keyword list — both should not be casually editable).
drop policy if exists "basecamp_workspaces_read_authenticated" on public.basecamp_workspaces;
create policy "basecamp_workspaces_read_authenticated" on public.basecamp_workspaces
  for select to authenticated using (true);

drop policy if exists "basecamp_workspaces_write_admins" on public.basecamp_workspaces;
create policy "basecamp_workspaces_write_admins" on public.basecamp_workspaces
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Anyone who can sign in to Academy can see the synced Basecamp content.
drop policy if exists "basecamp_projects_read_all" on public.basecamp_projects;
create policy "basecamp_projects_read_all" on public.basecamp_projects
  for select to authenticated using (true);

-- Editors/admins can flip the manual_visibility override.
drop policy if exists "basecamp_projects_update_editors" on public.basecamp_projects;
create policy "basecamp_projects_update_editors" on public.basecamp_projects
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('editor','admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('editor','admin')));

drop policy if exists "basecamp_recordings_read_all" on public.basecamp_recordings;
create policy "basecamp_recordings_read_all" on public.basecamp_recordings
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Helper RPC: bulk visibility flip from the UI
-- ---------------------------------------------------------------------------
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

comment on function public.set_basecamp_project_visibility is
  'Editor/admin-only override for whether a synced Basecamp project shows up in /team regardless of its AI-relevance score.';
