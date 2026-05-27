-- Seed terminology that the model otherwise mangles or anglicizes.
-- Add new rows freely; the unique (locale, term) constraint dedups re-runs.
--
-- The English (en) glossary doubles as the "canonical phrase" reference for
-- other locales. Editors should keep all four locale rows in sync when they
-- pin a new term.

insert into public.translation_glossary (locale, term, translation, notes) values
  -- Czech
  ('cs', 'fine-tuning', 'doladění', 'noun'),
  ('cs', 'pre-training', 'předtrénování', null),
  ('cs', 'prompt engineering', 'prompt engineering', 'leave untranslated'),
  ('cs', 'attention head', 'attention hlava', null),
  ('cs', 'transformer', 'transformer', 'leave untranslated'),
  ('cs', 'embedding', 'embedding', 'leave untranslated'),
  ('cs', 'token', 'token', null),
  ('cs', 'context window', 'kontextové okno', null),
  ('cs', 'inference', 'inference', null),
  ('cs', 'large language model', 'velký jazykový model', null),
  ('cs', 'reinforcement learning', 'zpětnovazební učení', null),
  ('cs', 'chain of thought', 'řetězec úvah', null),
  ('cs', 'few-shot', 'few-shot', 'leave untranslated'),
  ('cs', 'zero-shot', 'zero-shot', 'leave untranslated'),
  ('cs', 'retrieval-augmented generation', 'generování s vyhledáváním (RAG)', null),
  ('cs', 'alignment', 'zarovnání', null),
  ('cs', 'evaluation', 'evaluace', null),

  -- Slovak (mostly mirrors cs with regional spelling)
  ('sk', 'fine-tuning', 'doladenie', 'noun'),
  ('sk', 'pre-training', 'predtrénovanie', null),
  ('sk', 'prompt engineering', 'prompt engineering', 'leave untranslated'),
  ('sk', 'attention head', 'attention hlava', null),
  ('sk', 'transformer', 'transformer', 'leave untranslated'),
  ('sk', 'embedding', 'embedding', 'leave untranslated'),
  ('sk', 'token', 'token', null),
  ('sk', 'context window', 'kontextové okno', null),
  ('sk', 'inference', 'inferencia', null),
  ('sk', 'large language model', 'veľký jazykový model', null),
  ('sk', 'reinforcement learning', 'spätnoväzbové učenie', null),
  ('sk', 'chain of thought', 'reťazec úvah', null),
  ('sk', 'few-shot', 'few-shot', 'leave untranslated'),
  ('sk', 'zero-shot', 'zero-shot', 'leave untranslated'),
  ('sk', 'retrieval-augmented generation', 'generovanie s vyhľadávaním (RAG)', null),
  ('sk', 'alignment', 'zarovnanie', null),
  ('sk', 'evaluation', 'evaluácia', null),

  -- Polish
  ('pl', 'fine-tuning', 'dostrajanie', 'noun'),
  ('pl', 'pre-training', 'pretrenowanie', null),
  ('pl', 'prompt engineering', 'inżynieria promptów', null),
  ('pl', 'attention head', 'głowica uwagi', null),
  ('pl', 'transformer', 'transformator', 'architecture sense'),
  ('pl', 'embedding', 'osadzenie (embedding)', null),
  ('pl', 'token', 'token', null),
  ('pl', 'context window', 'okno kontekstu', null),
  ('pl', 'inference', 'wnioskowanie', null),
  ('pl', 'large language model', 'duży model językowy', null),
  ('pl', 'reinforcement learning', 'uczenie ze wzmocnieniem', null),
  ('pl', 'chain of thought', 'łańcuch myślenia', null),
  ('pl', 'few-shot', 'few-shot', 'leave untranslated'),
  ('pl', 'zero-shot', 'zero-shot', 'leave untranslated'),
  ('pl', 'retrieval-augmented generation', 'generacja wspomagana wyszukiwaniem (RAG)', null),
  ('pl', 'alignment', 'wyrównanie', null),
  ('pl', 'evaluation', 'ewaluacja', null),

  -- English (canonical reference; identity translations so the translator
  -- has a phrase to anchor on when the source language is not English).
  ('en', 'fine-tuning', 'fine-tuning', null),
  ('en', 'pre-training', 'pre-training', null),
  ('en', 'prompt engineering', 'prompt engineering', null),
  ('en', 'attention head', 'attention head', null),
  ('en', 'transformer', 'transformer', null),
  ('en', 'embedding', 'embedding', null),
  ('en', 'token', 'token', null),
  ('en', 'context window', 'context window', null),
  ('en', 'inference', 'inference', null),
  ('en', 'large language model', 'large language model', null),
  ('en', 'reinforcement learning', 'reinforcement learning', null),
  ('en', 'chain of thought', 'chain of thought', null),
  ('en', 'few-shot', 'few-shot', null),
  ('en', 'zero-shot', 'zero-shot', null),
  ('en', 'retrieval-augmented generation', 'retrieval-augmented generation', null),
  ('en', 'alignment', 'alignment', null),
  ('en', 'evaluation', 'evaluation', null)
on conflict (locale, term) do nothing;
