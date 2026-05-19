-- Practice: quizzes (with embedded question payload) + per-user attempts.
-- Questions are stored as jsonb so the same flow handles MCQ + flashcard variants
-- without proliferating tables for the MVP.

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  topic_id uuid references public.topics(id) on delete set null,
  difficulty text not null default 'beginner' check (difficulty in ('beginner','intermediate','advanced')),
  -- questions: [{ id, kind: 'mcq' | 'flashcard', prompt, options?, answerIndex?, answer?, explanation? }]
  questions jsonb not null default '[]'::jsonb,
  estimated_minutes integer not null default 5,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_quizzes_updated_at on public.quizzes;
create trigger set_quizzes_updated_at
  before update on public.quizzes
  for each row execute function public.set_updated_at();

create index if not exists idx_quizzes_topic_id on public.quizzes(topic_id);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  -- answers: [{ questionId, answerIndex?, answer?, correct }]
  answers jsonb not null default '[]'::jsonb,
  score integer not null default 0,            -- 0..total
  total integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_quiz_attempts_user_id on public.quiz_attempts(user_id);
create index if not exists idx_quiz_attempts_quiz_id on public.quiz_attempts(quiz_id);

alter table public.quizzes enable row level security;
alter table public.quiz_attempts enable row level security;

drop policy if exists "quizzes_read_published" on public.quizzes;
create policy "quizzes_read_published" on public.quizzes
  for select to authenticated using (is_published);

drop policy if exists "quiz_attempts_owner_all" on public.quiz_attempts;
create policy "quiz_attempts_owner_all" on public.quiz_attempts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
