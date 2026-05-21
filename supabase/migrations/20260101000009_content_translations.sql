-- Content localization uses translation keys, not JSONB blobs and not
-- per-entity translation tables.
--
-- This mirrors the Priprava/Reo pattern:
--   - database/domain rows store stable keys (Reo.KeyX in Priprava, *_key here)
--   - dictionaries own the localized strings
--   - runtime code resolves the key for the active locale
--
-- The current human-readable columns stay in place as Czech/base fallbacks and
-- for easier inspection in Supabase Studio.

alter table public.tracks
  add column if not exists title_key text,
  add column if not exists description_key text;

alter table public.topics
  add column if not exists title_key text,
  add column if not exists summary_key text,
  add column if not exists body_key text;

alter table public.resources
  add column if not exists title_key text,
  add column if not exists summary_key text;

alter table public.quizzes
  add column if not exists title_key text,
  add column if not exists description_key text;

alter table public.build_lab_items
  add column if not exists title_key text,
  add column if not exists summary_key text,
  add column if not exists body_key text;

create index if not exists idx_tracks_title_key on public.tracks(title_key);
create index if not exists idx_topics_title_key on public.topics(title_key);
create index if not exists idx_resources_title_key on public.resources(title_key);
create index if not exists idx_quizzes_title_key on public.quizzes(title_key);
create index if not exists idx_build_lab_items_title_key on public.build_lab_items(title_key);

comment on column public.tracks.title_key is
  'Translation key resolved through src/i18n/*/content. Mirrors Priprava Reo key pattern.';
comment on column public.tracks.description_key is
  'Translation key resolved through src/i18n/*/content. Mirrors Priprava Reo key pattern.';
comment on column public.topics.title_key is
  'Translation key resolved through src/i18n/*/content. Mirrors Priprava Reo key pattern.';
comment on column public.topics.summary_key is
  'Translation key resolved through src/i18n/*/content. Mirrors Priprava Reo key pattern.';
comment on column public.topics.body_key is
  'Translation key resolved through src/i18n/*/content. Mirrors Priprava Reo key pattern.';
comment on column public.resources.title_key is
  'Translation key resolved through src/i18n/*/content. Mirrors Priprava Reo key pattern.';
comment on column public.resources.summary_key is
  'Translation key resolved through src/i18n/*/content. Mirrors Priprava Reo key pattern.';
comment on column public.quizzes.title_key is
  'Translation key resolved through src/i18n/*/content. Question-level keys live inside questions jsonb as promptKey/optionsKey/answerKey/explanationKey.';
comment on column public.quizzes.description_key is
  'Translation key resolved through src/i18n/*/content. Mirrors Priprava Reo key pattern.';
comment on column public.build_lab_items.title_key is
  'Translation key resolved through src/i18n/*/content. Mirrors Priprava Reo key pattern.';
comment on column public.build_lab_items.summary_key is
  'Translation key resolved through src/i18n/*/content. Mirrors Priprava Reo key pattern.';
comment on column public.build_lab_items.body_key is
  'Translation key resolved through src/i18n/*/content. Mirrors Priprava Reo key pattern.';