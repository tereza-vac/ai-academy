-- Build Lab: curated Cursor prompts, chatbot playbooks, templates and checklists.
-- Lightweight schema — content is stored as markdown for the MVP.

create table if not exists public.build_lab_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  kind text not null default 'prompt'
    check (kind in ('prompt','playbook','template','checklist')),
  body_md text not null default '',
  tags text[] not null default '{}',
  topic_ids uuid[] not null default '{}',
  author text,
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_build_lab_items_updated_at on public.build_lab_items;
create trigger set_build_lab_items_updated_at
  before update on public.build_lab_items
  for each row execute function public.set_updated_at();

create index if not exists idx_build_lab_items_kind on public.build_lab_items(kind);
create index if not exists idx_build_lab_items_tags on public.build_lab_items using gin(tags);

alter table public.build_lab_items enable row level security;

drop policy if exists "build_lab_items_read_published" on public.build_lab_items;
create policy "build_lab_items_read_published" on public.build_lab_items
  for select to authenticated using (is_published);
