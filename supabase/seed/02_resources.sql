-- Seed: a small starter set of resources for Radar and Library.
-- User-facing title/summary use translation keys; base columns keep Czech
-- fallback text.

insert into public.resources (
  url, title, title_key, source_name, kind, summary, summary_key,
  author, published_at, tags, enrichment_status
) values
  ('https://openai.com/research/gpt-4',
   'Technická zpráva GPT-4',
   'content.resources.gpt4.title',
   'OpenAI', 'paper',
   'Technická zpráva popisující schopnosti a limity GPT-4.',
   'content.resources.gpt4.summary',
   'OpenAI', '2023-03-14T00:00:00Z',
   '{"llm","gpt-4","foundations"}', 'manual'),
  ('https://www.anthropic.com/news/claude-3-family',
   'Představení rodiny modelů Claude 3',
   'content.resources.claude3.title',
   'Anthropic', 'release',
   'Oznámení Claude 3 Haiku, Sonnet a Opus s benchmarky a příklady použití.',
   'content.resources.claude3.summary',
   'Anthropic', '2024-03-04T00:00:00Z',
   '{"claude","anthropic","models"}', 'manual'),
  ('https://arxiv.org/abs/2210.03629',
   'ReAct: propojení uvažování a jednání v jazykových modelech',
   'content.resources.react.title',
   'arXiv', 'paper',
   'Původní článek ReAct. Kombinuje řetězení úvah s používáním nástrojů.',
   'content.resources.react.summary',
   'Yao et al.', '2022-10-06T00:00:00Z',
   '{"agents","react","tools"}', 'manual'),
  ('https://docs.cursor.com/agent',
   'Dokumentace Cursor Agent',
   'content.resources.cursorAgent.title',
   'Cursor', 'article',
   'Jak funguje Cursor agent: nástroje, pravidla, režimy a doporučené postupy.',
   'content.resources.cursorAgent.summary',
   'Cursor', '2025-01-15T00:00:00Z',
   '{"cursor","agents","docs"}', 'manual'),
  ('https://supabase.com/docs/guides/ai',
   'Supabase AI a vektory',
   'content.resources.supabaseAi.title',
   'Supabase', 'article',
   'Používání pgvector se Supabase: ukládání, indexování a podobnostní vyhledávání.',
   'content.resources.supabaseAi.summary',
   'Supabase', '2024-08-01T00:00:00Z',
   '{"pgvector","supabase","rag"}', 'manual'),
  ('https://hamel.dev/blog/posts/evals/',
   'Váš AI produkt potřebuje evaluace',
   'content.resources.evals.title',
   'hamel.dev', 'article',
   'Pragmatický argument pro budování evaluací před optimalizací promptů.',
   'content.resources.evals.summary',
   'Hamel Husain', '2024-03-21T00:00:00Z',
   '{"evals","quality","blog"}', 'manual')
on conflict (url) do update
  set title = excluded.title,
      title_key = excluded.title_key,
      summary = excluded.summary,
      summary_key = excluded.summary_key,
      source_name = excluded.source_name,
      kind = excluded.kind,
      author = excluded.author,
      published_at = excluded.published_at,
      tags = excluded.tags,
      enrichment_status = excluded.enrichment_status;

-- Link resources to topics by slug
with r as (select id, url from public.resources),
     t as (select id, slug from public.topics)
update public.resources
   set topic_ids = sub.topic_ids
  from (
    select
      (select id from r where url = 'https://openai.com/research/gpt-4') as resource_id,
      array[(select id from t where slug='how-llms-work')] as topic_ids
    union all select
      (select id from r where url = 'https://arxiv.org/abs/2210.03629'),
      array[(select id from t where slug='tools-and-function-calling'), (select id from t where slug='multi-step-agents')]
    union all select
      (select id from r where url = 'https://docs.cursor.com/agent'),
      array[(select id from t where slug='cursor-day-one')]
    union all select
      (select id from r where url = 'https://supabase.com/docs/guides/ai'),
      array[(select id from t where slug='rag-in-an-hour'), (select id from t where slug='embeddings-101')]
    union all select
      (select id from r where url = 'https://hamel.dev/blog/posts/evals/'),
      array[(select id from t where slug='evals-that-matter')]
  ) as sub
 where public.resources.id = sub.resource_id;
