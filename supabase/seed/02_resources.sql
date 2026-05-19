-- Seed: a small starter set of resources for Radar and Library.

insert into public.resources (url, title, source_name, kind, summary, author, published_at, tags, enrichment_status) values
  ('https://openai.com/research/gpt-4',
   'GPT-4 technical report',
   'OpenAI', 'paper',
   'Technical report describing GPT-4''s capabilities and limitations.',
   'OpenAI', '2023-03-14T00:00:00Z',
   '{"llm","gpt-4","foundations"}', 'manual'),
  ('https://www.anthropic.com/news/claude-3-family',
   'Introducing the Claude 3 model family',
   'Anthropic', 'release',
   'Announcement of Claude 3 Haiku, Sonnet and Opus, with benchmarks and use-cases.',
   'Anthropic', '2024-03-04T00:00:00Z',
   '{"claude","anthropic","models"}', 'manual'),
  ('https://arxiv.org/abs/2210.03629',
   'ReAct: Synergizing Reasoning and Acting in Language Models',
   'arXiv', 'paper',
   'The original ReAct paper. Combines chain-of-thought reasoning with tool use.',
   'Yao et al.', '2022-10-06T00:00:00Z',
   '{"agents","react","tools"}', 'manual'),
  ('https://docs.cursor.com/agent',
   'Cursor Agent documentation',
   'Cursor', 'article',
   'How the Cursor agent works: tools, rules, modes and best practices.',
   'Cursor', '2025-01-15T00:00:00Z',
   '{"cursor","agents","docs"}', 'manual'),
  ('https://supabase.com/docs/guides/ai',
   'Supabase AI & Vectors',
   'Supabase', 'article',
   'Using pgvector with Supabase: storage, indexing and similarity search.',
   'Supabase', '2024-08-01T00:00:00Z',
   '{"pgvector","supabase","rag"}', 'manual'),
  ('https://hamel.dev/blog/posts/evals/',
   'Your AI product needs evals',
   'hamel.dev', 'article',
   'A pragmatic case for building evals before optimising prompts.',
   'Hamel Husain', '2024-03-21T00:00:00Z',
   '{"evals","quality","blog"}', 'manual')
on conflict (url) do nothing;

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
