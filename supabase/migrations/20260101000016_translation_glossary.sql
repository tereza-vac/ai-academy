-- Editor-curated glossary used by the resource-translate edge function.
--
-- Each row pins how a single technical term must be translated into a target
-- locale. The translate function loads all rows for the active locale and
-- appends them to the model's system prompt so the same jargon stays
-- consistent across articles.
--
-- Read access is open to authenticated users (the reader page surfaces
-- glossary hints in PR-4). Writes are limited to editor/admin profiles so
-- ops can curate without giving everyone write rights.

create table if not exists public.translation_glossary (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('cs','en','sk','pl')),
  term text not null,                -- canonical source-language term, lower-case
  translation text not null,         -- preferred translation for `locale`
  notes text,                        -- optional editor note (e.g. "use only as noun")
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (locale, term)
);

create index if not exists idx_translation_glossary_locale
  on public.translation_glossary(locale);

drop trigger if exists set_translation_glossary_updated_at on public.translation_glossary;
create trigger set_translation_glossary_updated_at
  before update on public.translation_glossary
  for each row execute function public.set_updated_at();

alter table public.translation_glossary enable row level security;

drop policy if exists "translation_glossary_read_all" on public.translation_glossary;
create policy "translation_glossary_read_all" on public.translation_glossary
  for select to authenticated using (true);

drop policy if exists "translation_glossary_write_editors" on public.translation_glossary;
create policy "translation_glossary_write_editors" on public.translation_glossary
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor','admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor','admin')
    )
  );

comment on table public.translation_glossary is
  'Per-locale jargon translations injected into the resource-translate prompt to keep terminology consistent.';
