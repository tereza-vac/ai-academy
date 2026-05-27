-- Resource availability classifies how much of an external item we can
-- legally and technically render inside AI Academy. Drives the visibility
-- of the "Read in AI Academy" button on Radar / Library / Scholar cards.
--
--   metadata_only       Only title/abstract metadata. No internal reader.
--   excerpt_only        Title + a stored excerpt/abstract. No internal reader.
--   full_text_api       Full text imported via an official API
--                       (arXiv ar5iv, PubMed Central JATS, etc.). Reader OK.
--   full_text_scraped   Full text extracted from an allowlisted blog via
--                       Readability after robots.txt / noai checks. Reader OK.
--   full_text_unavailable
--                       Importer attempted but no usable content was
--                       returned (paywall, ND license, scrape blocked, …).
--
-- The default is `metadata_only` so existing rows stay safe — they show only
-- [Save] [Original ↗] until the import pipeline lands (PR-2).

do $$
begin
  create type public.resource_availability as enum (
    'metadata_only',
    'excerpt_only',
    'full_text_api',
    'full_text_scraped',
    'full_text_unavailable'
  );
exception when duplicate_object then
  null;
end$$;

alter table public.resources
  add column if not exists availability public.resource_availability
    not null default 'metadata_only';

alter table public.resources
  add column if not exists source_lang text;

create index if not exists idx_resources_availability
  on public.resources(availability);

comment on column public.resources.availability is
  'How much of this resource we can render in the internal reader. Set by the resource-import edge function.';
comment on column public.resources.source_lang is
  'ISO 639-1 of the imported source content (e.g. ''en''). Drives lazy-translation decisions in the reader.';
