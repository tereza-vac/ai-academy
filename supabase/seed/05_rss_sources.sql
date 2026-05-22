
-- Seed: RSS / API sources to poll. The radar-ingest edge function dispatches
-- on `source_type` (rss | arxiv | hf_daily_papers) and uses `weight` as the
-- editorial trust multiplier inside the ranking score on `radar_items`.
--
-- Weights are intentionally coarse (0.6 - 1.6). Tune them, don't try to make
-- them precise — recency decay dominates.

insert into public.rss_sources (name, url, homepage_url, category, source_type, weight) values
  -- Hugging Face Daily Papers: a hand-curated, upvoted set of the day's best papers.
  -- The URL is the public JSON API; the radar-ingest function knows to JSON-decode it.
  ('Hugging Face Daily Papers',
   'https://huggingface.co/api/daily_papers?limit=30',
   'https://huggingface.co/papers',
   'research', 'hf_daily_papers', 1.6),

  -- arXiv categories most relevant to AI Academy. The URL is the public Atom
  -- API; the ingest dispatcher extracts arXiv ids into radar_items.external_id.
  ('arXiv cs.CL (NLP)',
   'https://export.arxiv.org/api/query?search_query=cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=30',
   'https://arxiv.org/list/cs.CL/recent',
   'research', 'arxiv', 1.2),
  ('arXiv cs.LG (Machine Learning)',
   'https://export.arxiv.org/api/query?search_query=cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=30',
   'https://arxiv.org/list/cs.LG/recent',
   'research', 'arxiv', 1.1),
  ('arXiv cs.AI (Artificial Intelligence)',
   'https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=30',
   'https://arxiv.org/list/cs.AI/recent',
   'research', 'arxiv', 1.0),

  -- AI lab blogs / release feeds (RSS / Atom).
  ('OpenAI Blog',
   'https://openai.com/blog/rss.xml',
   'https://openai.com/blog',
   'product', 'rss', 1.4),
  ('Anthropic News',
   'https://www.anthropic.com/rss/news.xml',
   'https://www.anthropic.com/news',
   'product', 'rss', 1.4),
  ('Google DeepMind Blog',
   'https://deepmind.google/discover/blog/rss.xml',
   'https://deepmind.google/discover/blog',
   'product', 'rss', 1.4),
  ('Google Research Blog',
   'https://research.google/blog/rss/',
   'https://research.google/blog',
   'research', 'rss', 1.2),
  ('Meta AI Research',
   'https://ai.meta.com/blog/rss/',
   'https://ai.meta.com/blog',
   'product', 'rss', 1.2),
  ('Mistral AI News',
   'https://mistral.ai/news/feed.xml',
   'https://mistral.ai/news',
   'product', 'rss', 1.1),

  -- Independent voices + community.
  ('Simon Willison',
   'https://simonwillison.net/atom/everything/',
   'https://simonwillison.net',
   'community', 'rss', 1.1),
  ('Hacker News (AI)',
   'https://hnrss.org/newest?q=AI&points=50',
   'https://news.ycombinator.com',
   'community', 'rss', 0.7),
  ('Latent Space (Swyx)',
   'https://www.latent.space/feed',
   'https://www.latent.space',
   'community', 'rss', 1.0)
on conflict (url) do update
  set name = excluded.name,
      homepage_url = excluded.homepage_url,
      category = excluded.category,
      source_type = excluded.source_type,
      weight = excluded.weight,
      is_active = true;
