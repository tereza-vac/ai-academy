-- Seed: 4 tracks and ~10 topics for the MVP learning map.
-- Idempotent: re-running upserts by slug.

insert into public.tracks (slug, title, description, color, position) values
  ('foundations', 'Foundations', 'Core ideas: tokens, embeddings, transformers and what an LLM actually does.', 'brand', 1),
  ('prompting',   'Prompting',   'Practical prompting patterns, system prompts and structured output.',           'premium', 2),
  ('building',    'Building with AI', 'Cursor, RAG, evals and shipping AI features.',                              'success', 3),
  ('agents',      'Agents & Workflows', 'Tools, multi-step reasoning and orchestration patterns.',                 'coral', 4)
on conflict (slug) do update
  set title = excluded.title,
      description = excluded.description,
      color = excluded.color,
      position = excluded.position;

with t as (
  select id, slug from public.tracks
)
insert into public.topics (track_id, slug, title, summary, body_md, difficulty, estimated_minutes, prerequisites, tags, position) values
  ((select id from t where slug='foundations'), 'how-llms-work',
   'How LLMs actually work', 'A short tour from tokens to next-token prediction.',
   E'## What is a token?\n\nLLMs see text as **tokens**, not characters. A token is roughly 4 characters of English.\n\n## Next-token prediction\n\nGiven a sequence of tokens, the model predicts the most likely next token. That single mechanic — repeated — produces everything you see in chat output.\n\n## Why this matters\n\nUnderstanding this explains:\n\n- why tokens (and tokenization) drive cost and latency,\n- why prompts and context windows have limits,\n- why temperature changes output diversity.',
   'beginner', 12, '{}', '{"basics","tokens","llm"}', 1),

  ((select id from t where slug='foundations'), 'embeddings-101',
   'Embeddings 101', 'Vectors that capture meaning. The basis of search and RAG.',
   E'Embeddings turn text into a vector of floats. Similar meaning → close in vector space.\n\n## When to use them\n\n- Semantic search\n- Clustering\n- Recommendations\n- Retrieval-Augmented Generation (RAG)',
   'beginner', 10, '{"how-llms-work"}', '{"embeddings","rag","vectors"}', 2),

  ((select id from t where slug='prompting'), 'system-prompts',
   'System prompts that hold up', 'Structure, role, constraints, examples and refusals.',
   E'A system prompt sets durable behaviour. Treat it like product copy: precise, testable, and small enough to fit in your head.\n\n## Skeleton\n\n```\nRole\nContext\nTask\nConstraints\nOutput format\n```',
   'beginner', 15, '{}', '{"prompting","system-prompt"}', 1),

  ((select id from t where slug='prompting'), 'structured-output',
   'Structured output (JSON, tools, schemas)', 'When you want machines to consume model output.',
   E'When the consumer is another program, prefer structured output:\n\n- JSON mode\n- Tool / function calling\n- Strict schemas (Zod, JSON Schema)',
   'intermediate', 18, '{"system-prompts"}', '{"json","tools","schemas"}', 2),

  ((select id from t where slug='building'), 'cursor-day-one',
   'Cursor on day one', 'Setup, .cursor/rules, models and the agent loop.',
   E'## Install\n\nDownload Cursor and sign in. Set your default model.\n\n## Project rules\n\nCreate `.cursor/rules/your-rule.md` to give the agent persistent guidance for this repo.',
   'beginner', 12, '{}', '{"cursor","ide","setup"}', 1),

  ((select id from t where slug='building'), 'rag-in-an-hour',
   'RAG in an hour', 'Chunking, embeddings, similarity search, re-ranking, prompting.',
   E'## The pipeline\n\n1. Chunk\n2. Embed\n3. Store\n4. Retrieve\n5. (Re-rank)\n6. Prompt with context',
   'intermediate', 35, '{"embeddings-101","system-prompts"}', '{"rag","pgvector","supabase"}', 2),

  ((select id from t where slug='building'), 'evals-that-matter',
   'Evals that matter', 'From spreadsheet-graded prompts to automated scoring.',
   E'Three kinds of evals you actually need:\n\n- **Reference-based** — gold answer comparison.\n- **Rubric-based** — a small LLM judge with a rubric.\n- **A/B in production** — measure user behaviour.',
   'intermediate', 25, '{"system-prompts"}', '{"evals","quality"}', 3),

  ((select id from t where slug='agents'), 'tools-and-function-calling',
   'Tools & function calling', 'Give a model verbs. Then bound what it can do.',
   E'Tools turn an LLM into something that can act. Define a JSON schema, the model fills it in, your code runs it.',
   'intermediate', 20, '{"structured-output"}', '{"agents","tools"}', 1),

  ((select id from t where slug='agents'), 'multi-step-agents',
   'Multi-step agents', 'Planning, memory, retries and when to give up.',
   E'A short overview of:\n\n- ReAct\n- Plan-and-execute\n- Reflection\n- Hand-offs',
   'advanced', 30, '{"tools-and-function-calling"}', '{"agents","planning"}', 2),

  ((select id from t where slug='agents'), 'agent-evals',
   'Evaluating agents', 'Trace, score, and improve multi-step systems.',
   E'Single-shot prompt evals don''t cover agents. You need trajectory evals.',
   'advanced', 25, '{"evals-that-matter","multi-step-agents"}', '{"agents","evals"}', 3)
on conflict (slug) do update
  set track_id = excluded.track_id,
      title = excluded.title,
      summary = excluded.summary,
      body_md = excluded.body_md,
      difficulty = excluded.difficulty,
      estimated_minutes = excluded.estimated_minutes,
      prerequisites = excluded.prerequisites,
      tags = excluded.tags,
      position = excluded.position;
