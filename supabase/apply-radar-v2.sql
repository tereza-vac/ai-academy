-- =============================================================================
-- One-shot Radar v2 / Canon / Scholar bundle.
--
-- Paste this entire file into Supabase Studio -> SQL Editor -> Run.
-- It is idempotent: all DDL uses IF NOT EXISTS / DO blocks, and all inserts
-- use ON CONFLICT ... DO UPDATE so you can re-run it any time.
--
-- After running, deploy the two Edge Functions (radar-ingest, papers-search)
-- and POST to /functions/v1/radar-ingest to populate radar_items.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) Schema: migration 20260101000010_radar_long_term.sql
-- -----------------------------------------------------------------------------

alter table public.rss_sources
  add column if not exists source_type text not null default 'rss',
  add column if not exists weight numeric not null default 1.0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'rss_sources_source_type_check'
  ) then
    alter table public.rss_sources
      add constraint rss_sources_source_type_check
      check (source_type in ('rss', 'arxiv', 'hf_daily_papers'));
  end if;
end$$;

comment on column public.rss_sources.source_type is
  'Ingest dispatcher: rss = generic RSS/Atom, arxiv = arXiv API (Atom + extra fields), hf_daily_papers = Hugging Face Daily Papers JSON.';
comment on column public.rss_sources.weight is
  'Editorial trust weight, multiplied into radar_items.score. Higher = more authoritative.';

alter table public.radar_items
  add column if not exists kind text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists hf_upvotes integer,
  add column if not exists external_id text,
  add column if not exists score numeric,
  add column if not exists content_lang text,
  add column if not exists embedding vector(1536);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'radar_items_kind_check'
  ) then
    alter table public.radar_items
      add constraint radar_items_kind_check
      check (kind is null or kind in (
        'article', 'paper', 'release', 'video', 'podcast', 'tool', 'tweet', 'community', 'other'
      ));
  end if;
end$$;

create index if not exists idx_radar_items_score on public.radar_items(score desc nulls last);
create index if not exists idx_radar_items_kind on public.radar_items(kind);
create index if not exists idx_radar_items_tags on public.radar_items using gin(tags);
create index if not exists idx_radar_items_external_id on public.radar_items(external_id);

comment on column public.radar_items.kind is
  'Inferred content type. Drives Radar tabs and Library filters.';
comment on column public.radar_items.score is
  'Deterministic global ranking score. Updated by radar-ingest on every upsert. Higher = rank first.';
comment on column public.radar_items.external_id is
  'Stable id from the upstream source (arXiv id, DOI, HF paper id). Used to dedupe across sources.';
comment on column public.radar_items.embedding is
  'Reserved for per-user pgvector ranking (Phase E). Backfill via ai-enrich embed action when enabled.';

alter table public.resources
  add column if not exists is_canonical boolean not null default false,
  add column if not exists canonical_category text,
  add column if not exists canonical_position integer,
  add column if not exists external_id text;

create index if not exists idx_resources_is_canonical
  on public.resources(canonical_category, canonical_position)
  where is_canonical = true;

create index if not exists idx_resources_external_id on public.resources(external_id)
  where external_id is not null;

comment on column public.resources.is_canonical is
  'True for foundational papers/articles. Surfaced via Library -> Canon tab.';
comment on column public.resources.canonical_category is
  'Editorial section: foundations, models, alignment, prompting, agents, rag, scaling, multimodal, reasoning.';
comment on column public.resources.canonical_position is
  'Display order within a canonical_category. NULL items render at the end.';
comment on column public.resources.external_id is
  'DOI, arXiv id, or HF paper id. Set when the resource was minted from a Scholar/Radar source.';


-- -----------------------------------------------------------------------------
-- 2) Seed: rss_sources (weighted, multi-type)
-- -----------------------------------------------------------------------------

insert into public.rss_sources (name, url, homepage_url, category, source_type, weight) values
  ('Hugging Face Daily Papers',
   'https://huggingface.co/api/daily_papers?limit=30',
   'https://huggingface.co/papers',
   'research', 'hf_daily_papers', 1.6),
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


-- -----------------------------------------------------------------------------
-- 3) Seed: canonical papers (Library -> Canon tab)
-- -----------------------------------------------------------------------------

insert into public.resources (
  url, title, title_key, source_name, kind, summary, summary_key,
  author, published_at, tags, enrichment_status,
  external_id, is_canonical, canonical_category, canonical_position
) values
  ('https://arxiv.org/abs/1706.03762',
   'Attention Is All You Need',
   'content.canon.attentionIsAllYouNeed.title',
   'arXiv', 'paper',
   'Původní článek představující architekturu Transformer. Základ moderních LLM.',
   'content.canon.attentionIsAllYouNeed.summary',
   'Vaswani et al.', '2017-06-12T00:00:00Z',
   '{"transformer","foundations","attention"}', 'manual',
   'arXiv:1706.03762', true, 'foundations', 1),
  ('https://arxiv.org/abs/2001.08361',
   'Škálovací zákony pro jazykové modely',
   'content.canon.scalingLaws.title',
   'arXiv', 'paper',
   'OpenAI scaling laws: jak roste výkon modelu s velikostí dat, parametrů a výpočtu.',
   'content.canon.scalingLaws.summary',
   'Kaplan et al.', '2020-01-23T00:00:00Z',
   '{"scaling","openai","foundations"}', 'manual',
   'arXiv:2001.08361', true, 'foundations', 2),
  ('https://arxiv.org/abs/2203.15556',
   'Chinchilla: výpočetně optimální trénink LLM',
   'content.canon.chinchilla.title',
   'arXiv', 'paper',
   'DeepMind ukazuje, že většina LLM byla podtrénovaná na datech vůči svému výpočtu.',
   'content.canon.chinchilla.summary',
   'Hoffmann et al.', '2022-03-29T00:00:00Z',
   '{"scaling","deepmind","training"}', 'manual',
   'arXiv:2203.15556', true, 'foundations', 3),
  ('https://arxiv.org/abs/1810.04805',
   'BERT: hluboké obousměrné transformery pro porozumění jazyku',
   'content.canon.bert.title',
   'arXiv', 'paper',
   'Encoder-only model, který popularizoval pre-training / fine-tuning paradigma.',
   'content.canon.bert.summary',
   'Devlin et al.', '2018-10-11T00:00:00Z',
   '{"bert","encoder","pretraining"}', 'manual',
   'arXiv:1810.04805', true, 'models', 1),
  ('https://arxiv.org/abs/2005.14165',
   'GPT-3: jazykové modely jsou few-shot learnery',
   'content.canon.gpt3.title',
   'arXiv', 'paper',
   'Článek, který ukázal, že škálování + in-context learning vede k emergentním schopnostem.',
   'content.canon.gpt3.summary',
   'Brown et al.', '2020-05-28T00:00:00Z',
   '{"gpt-3","openai","in-context-learning"}', 'manual',
   'arXiv:2005.14165', true, 'models', 2),
  ('https://arxiv.org/abs/2302.13971',
   'LLaMA: efektivní základní jazykové modely',
   'content.canon.llama.title',
   'arXiv', 'paper',
   'Meta uvolňuje silnou rodinu otevřených modelů a odstartuje open-source LLM ekosystém.',
   'content.canon.llama.summary',
   'Touvron et al.', '2023-02-27T00:00:00Z',
   '{"llama","meta","open-source"}', 'manual',
   'arXiv:2302.13971', true, 'models', 3),
  ('https://arxiv.org/abs/2401.04088',
   'Mixtral of Experts',
   'content.canon.mixtral.title',
   'arXiv', 'paper',
   'Mistral popisuje sparse mixture-of-experts model 8x7B s GPT-3.5 výkonem za zlomek nákladů.',
   'content.canon.mixtral.summary',
   'Jiang et al.', '2024-01-08T00:00:00Z',
   '{"mixtral","mistral","moe"}', 'manual',
   'arXiv:2401.04088', true, 'models', 4),
  ('https://arxiv.org/abs/2203.02155',
   'InstructGPT: trénink LLM podle lidských preferencí',
   'content.canon.instructgpt.title',
   'arXiv', 'paper',
   'Článek za ChatGPT: RLHF, který naučil GPT-3 plnit instrukce.',
   'content.canon.instructgpt.summary',
   'Ouyang et al.', '2022-03-04T00:00:00Z',
   '{"rlhf","alignment","openai"}', 'manual',
   'arXiv:2203.02155', true, 'alignment', 1),
  ('https://arxiv.org/abs/2212.08073',
   'Constitutional AI: bezpečnost přes AI feedback',
   'content.canon.constitutionalAi.title',
   'arXiv', 'paper',
   'Anthropic ukazuje RLAIF: AI hodnotí výstupy podle psaného souboru principů.',
   'content.canon.constitutionalAi.summary',
   'Bai et al.', '2022-12-15T00:00:00Z',
   '{"alignment","anthropic","rlaif"}', 'manual',
   'arXiv:2212.08073', true, 'alignment', 2),
  ('https://arxiv.org/abs/2305.18290',
   'DPO: přímá optimalizace preferencí',
   'content.canon.dpo.title',
   'arXiv', 'paper',
   'Trénink LLM podle preferenčních párů bez explicitního reward modelu — jednodušší než RLHF.',
   'content.canon.dpo.summary',
   'Rafailov et al.', '2023-05-29T00:00:00Z',
   '{"dpo","alignment","preference"}', 'manual',
   'arXiv:2305.18290', true, 'alignment', 3),
  ('https://arxiv.org/abs/2201.11903',
   'Chain-of-Thought Prompting',
   'content.canon.cot.title',
   'arXiv', 'paper',
   'Ukazuje, jak prompty s mezikroky úvah zlepšují vícekrokové uvažování LLM.',
   'content.canon.cot.summary',
   'Wei et al.', '2022-01-28T00:00:00Z',
   '{"prompting","reasoning","cot"}', 'manual',
   'arXiv:2201.11903', true, 'prompting', 1),
  ('https://arxiv.org/abs/2210.03629',
   'ReAct: propojení uvažování a jednání',
   'content.canon.react.title',
   'arXiv', 'paper',
   'Klasický agentní vzor: jazykový model střídá kroky uvažování a volání nástrojů.',
   'content.canon.react.summary',
   'Yao et al.', '2022-10-06T00:00:00Z',
   '{"agents","react","tools"}', 'manual',
   'arXiv:2210.03629', true, 'agents', 1),
  ('https://arxiv.org/abs/2302.04761',
   'Toolformer: jazykové modely se učí používat nástroje',
   'content.canon.toolformer.title',
   'arXiv', 'paper',
   'Meta ukazuje, jak LLM samostatně získá schopnost volat externí API.',
   'content.canon.toolformer.summary',
   'Schick et al.', '2023-02-09T00:00:00Z',
   '{"tools","agents","meta"}', 'manual',
   'arXiv:2302.04761', true, 'agents', 2),
  ('https://arxiv.org/abs/2005.11401',
   'Retrieval-Augmented Generation pro NLP',
   'content.canon.rag.title',
   'arXiv', 'paper',
   'Původní článek RAG: kombinace retrieve + generate pro úlohy nad znalostmi.',
   'content.canon.rag.summary',
   'Lewis et al.', '2020-05-22T00:00:00Z',
   '{"rag","retrieval","nlp"}', 'manual',
   'arXiv:2005.11401', true, 'rag', 1)
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
      external_id = excluded.external_id,
      is_canonical = excluded.is_canonical,
      canonical_category = excluded.canonical_category,
      canonical_position = excluded.canonical_position,
      enrichment_status = excluded.enrichment_status;


-- -----------------------------------------------------------------------------
-- 4) Schedule radar-ingest hourly via pg_cron + pg_net
--    (migration 20260101000011_radar_cron.sql)
--
-- After this runs, complete the one-time bootstrap with:
--   supabase/setup-cron-secrets.sql  (sets the two vault secrets)
-- -----------------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_radar_ingest()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, net, vault
as $$
declare
  base_url text;
  api_key  text;
  req_id   bigint;
begin
  select decrypted_secret into base_url
    from vault.decrypted_secrets
   where name = 'supabase_project_url'
   limit 1;

  select decrypted_secret into api_key
    from vault.decrypted_secrets
   where name = 'supabase_service_role_key'
   limit 1;

  if base_url is null or api_key is null then
    raise notice 'trigger_radar_ingest: vault secrets supabase_project_url / supabase_service_role_key are not set';
    return null;
  end if;

  select net.http_post(
    url     := base_url || '/functions/v1/radar-ingest',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'apikey',        api_key,
      'Authorization', 'Bearer ' || api_key
    ),
    body    := '{}'::jsonb
  ) into req_id;

  return req_id;
end;
$$;

comment on function public.trigger_radar_ingest is
  'Fires an HTTP POST to the radar-ingest Edge Function. Reads project URL + service role key from Supabase Vault. Called by the radar-ingest-hourly cron job.';

select cron.schedule(
  'radar-ingest-hourly',
  '17 * * * *',
  $cron$ select public.trigger_radar_ingest(); $cron$
);


-- -----------------------------------------------------------------------------
-- 5) Quick sanity check (returned in the SQL editor output)
-- -----------------------------------------------------------------------------
select 'rss_sources' as table, count(*) as rows from public.rss_sources
union all
select 'canon resources', count(*) from public.resources where is_canonical = true
union all
select 'radar_items', count(*) from public.radar_items
union all
select 'cron job (1 if scheduled)', count(*)::bigint from cron.job where jobname = 'radar-ingest-hourly';
