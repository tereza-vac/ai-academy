-- Learning map: tracks > topics
-- Tracks group topics into high-level themes ("Foundations", "Prompting", "Agents", ...).
-- Topics have a deterministic slug and an embedding for semantic search.

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  color text,                     -- tailwind hue token, e.g. 'brand' | 'premium' | 'success'
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_tracks_updated_at on public.tracks;
create trigger set_tracks_updated_at
  before update on public.tracks
  for each row execute function public.set_updated_at();

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.tracks(id) on delete set null,
  slug text not null unique,
  title text not null,
  summary text,
  body_md text,                   -- markdown body for the topic detail page
  difficulty text not null default 'beginner' check (difficulty in ('beginner','intermediate','advanced')),
  estimated_minutes integer not null default 15,
  prerequisites text[] not null default '{}',
  tags text[] not null default '{}',
  embedding vector(1536),         -- OpenAI text-embedding-3-small dimension
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_topics_updated_at on public.topics;
create trigger set_topics_updated_at
  before update on public.topics
  for each row execute function public.set_updated_at();

create index if not exists idx_topics_track_id on public.topics(track_id);
create index if not exists idx_topics_slug on public.topics(slug);
create index if not exists idx_topics_tags on public.topics using gin(tags);

-- Approximate-nearest-neighbour index for similarity search; usable once embeddings exist.
create index if not exists idx_topics_embedding
  on public.topics using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- RLS: published topics are readable by everyone authenticated
alter table public.tracks enable row level security;
alter table public.topics enable row level security;

drop policy if exists "tracks_read_all" on public.tracks;
create policy "tracks_read_all" on public.tracks
  for select to authenticated using (true);

drop policy if exists "topics_read_published" on public.topics;
create policy "topics_read_published" on public.topics
  for select to authenticated using (is_published);
