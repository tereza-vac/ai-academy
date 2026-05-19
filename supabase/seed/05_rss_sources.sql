-- Seed: RSS sources to poll. The radar-ingest edge function reads from this table.

insert into public.rss_sources (name, url, homepage_url, category) values
  ('OpenAI Blog',     'https://openai.com/blog/rss.xml',           'https://openai.com/blog',         'product'),
  ('Anthropic News',  'https://www.anthropic.com/rss/news.xml',     'https://www.anthropic.com/news',  'product'),
  ('arXiv cs.CL',     'https://export.arxiv.org/rss/cs.CL',         'https://arxiv.org/list/cs.CL/recent', 'research'),
  ('Hacker News (AI)','https://hnrss.org/newest?q=AI',              'https://news.ycombinator.com',    'news'),
  ('Simon Willison',  'https://simonwillison.net/atom/everything/', 'https://simonwillison.net',       'community')
on conflict (url) do nothing;
