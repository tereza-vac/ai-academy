-- Library: per-user saved items + personal notes.
-- A user can save any resource and attach a short note + tags.

create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  note text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, resource_id)
);

drop trigger if exists set_saved_items_updated_at on public.saved_items;
create trigger set_saved_items_updated_at
  before update on public.saved_items
  for each row execute function public.set_updated_at();

create index if not exists idx_saved_items_user_id on public.saved_items(user_id);
create index if not exists idx_saved_items_tags on public.saved_items using gin(tags);

-- Notes: free-form personal notes, optionally linked to a topic or a resource.
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  topic_id uuid references public.topics(id) on delete set null,
  resource_id uuid references public.resources(id) on delete set null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

create index if not exists idx_notes_user_id on public.notes(user_id);
create index if not exists idx_notes_topic_id on public.notes(topic_id);

alter table public.saved_items enable row level security;
alter table public.notes enable row level security;

drop policy if exists "saved_items_owner_all" on public.saved_items;
create policy "saved_items_owner_all" on public.saved_items
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes_owner_all" on public.notes;
create policy "notes_owner_all" on public.notes
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
