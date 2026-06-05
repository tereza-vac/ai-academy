-- ===========================================================================
-- AI Academy - "Spektrum modelu" / Model spectrum one-shot bootstrap
-- ===========================================================================
-- Run ONCE in Supabase Studio -> SQL Editor on project iusyhjcckowaqlykbahe.
--
-- Fixes: "Could not find the table 'public.llm_models' in the schema cache".
--
-- Bundles (idempotent - safe to re-run):
--   1. migration 20260101000019_llm_models.sql  (table + indexes + RLS)
--   2. seed       08_llm_models.sql             (curated catalog rows)
--   3. migration 20260101000020_models_cron.sql (daily models-ingest cron)
--
-- After this runs: reload the app. Optionally deploy the models-ingest edge
-- function and POST to it to merge live OpenRouter / Hugging Face data.
--
-- NOTE: text is intentionally ASCII-only to avoid encoding corruption when the
-- script is copied between editors / operating systems.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1) Table, indexes, trigger, RLS  (migration 19)
-- ---------------------------------------------------------------------------
create table if not exists public.llm_models (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  provider text not null,
  family text,
  license_type text not null default 'unknown'
    check (license_type in ('commercial', 'open_source', 'research', 'unknown')),
  modalities text[] not null default '{}',
  context_window integer,
  parameter_count text,
  release_date date,
  summary text,
  description_md text,
  typical_use_cases text[] not null default '{}',
  strengths text[] not null default '{}',
  limitations text[] not null default '{}',
  tags text[] not null default '{}',
  homepage_url text,
  docs_url text,
  pricing_hint text,
  is_niche boolean not null default false,
  popularity_tier text not null default 'emerging'
    check (popularity_tier in ('mainstream', 'emerging', 'niche', 'legacy')),
  external_id text,
  source text not null default 'curated'
    check (source in ('curated', 'openrouter', 'huggingface')),
  preserve_curated boolean not null default false,
  raw jsonb,
  score numeric not null default 0,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_llm_models_provider on public.llm_models(provider);
create index if not exists idx_llm_models_license on public.llm_models(license_type);
create index if not exists idx_llm_models_score on public.llm_models(score desc);
create index if not exists idx_llm_models_popularity on public.llm_models(popularity_tier);

-- Reuses the shared public.set_updated_at() trigger function created by the
-- base migrations. If you are bootstrapping a brand-new project that does not
-- have it yet, create it first:
--
--   create or replace function public.set_updated_at()
--   returns trigger language plpgsql as $$
--   begin new.updated_at = now(); return new; end; $$;
--
drop trigger if exists set_llm_models_updated_at on public.llm_models;
create trigger set_llm_models_updated_at
  before update on public.llm_models
  for each row execute function public.set_updated_at();

alter table public.llm_models enable row level security;

drop policy if exists "llm_models_read_all" on public.llm_models;
create policy "llm_models_read_all" on public.llm_models
  for select to authenticated using (true);

-- Writes only via service role (edge function models-ingest).
drop policy if exists "llm_models_write_service" on public.llm_models;
create policy "llm_models_write_service" on public.llm_models
  for all to service_role using (true) with check (true);


-- ---------------------------------------------------------------------------
-- 2) Curated catalog rows  (seed 08)
-- ---------------------------------------------------------------------------
-- models-ingest updates pricing/context for matching slugs but preserves these
-- editorial fields (preserve_curated = true).

insert into public.llm_models (
  slug, name, provider, family, license_type, modalities,
  context_window, parameter_count, release_date, summary, description_md,
  typical_use_cases, strengths, limitations, tags,
  homepage_url, docs_url, pricing_hint, is_niche, popularity_tier,
  external_id, source, preserve_curated, score
) values
(
  'openai-gpt-4o', 'GPT-4o', 'OpenAI', 'GPT-4', 'commercial',
  array['text','image'], 128000, null, '2024-05-13',
  'Flagship multimodal model from OpenAI - fast, capable, widely deployed.',
  E'## Overview\n\nGPT-4o is OpenAI''s **omni** model: strong reasoning, vision, and tool use at lower latency than GPT-4 Turbo.\n\n## Typical use\n\n- Customer-facing assistants\n- Document + image understanding\n- Agent loops with function calling',
  array['Assistants','Vision QA','Agents','Code review'],
  array['Strong general reasoning','Multimodal','Mature ecosystem'],
  array['Closed weights','Usage-based cost at scale'],
  array['flagship','multimodal','api'],
  'https://openai.com/gpt-4o', 'https://platform.openai.com/docs/models/gpt-4o',
  'Paid API', false, 'mainstream', 'openai/gpt-4o', 'curated', true, 100
),
(
  'openai-gpt-4o-mini', 'GPT-4o mini', 'OpenAI', 'GPT-4', 'commercial',
  array['text','image'], 128000, null, '2024-07-18',
  'Cost-efficient GPT-4 class model for high-volume workloads.',
  E'## Overview\n\nGPT-4o mini trades a small quality gap for **much lower cost** - ideal for classification, routing, and chat at scale.',
  array['High-volume chat','Routing','Extraction','Moderation'],
  array['Low cost','Fast','Good instruction following'],
  array['Weaker on hardest reasoning vs full 4o'],
  array['efficient','api'],
  'https://openai.com', 'https://platform.openai.com/docs/models/gpt-4o-mini',
  'Paid API', false, 'mainstream', 'openai/gpt-4o-mini', 'curated', true, 95
),
(
  'anthropic-claude-sonnet-4', 'Claude Sonnet 4', 'Anthropic', 'Claude', 'commercial',
  array['text','image'], 200000, null, '2025-05-14',
  'Balanced Claude model - strong coding and analysis with a large context window.',
  E'## Overview\n\nSonnet sits between Haiku (speed) and Opus (depth). Popular for **coding agents** and long-document workflows.',
  array['Code generation','Long document analysis','Research assistants'],
  array['Excellent coding','200k context','Careful refusals'],
  array['Commercial only','Regional availability varies'],
  array['coding','long-context'],
  'https://www.anthropic.com/claude', 'https://docs.anthropic.com',
  'Paid API', false, 'mainstream', 'anthropic/claude-sonnet-4', 'curated', true, 98
),
(
  'anthropic-claude-opus-4', 'Claude Opus 4', 'Anthropic', 'Claude', 'commercial',
  array['text','image'], 200000, null, '2025-05-14',
  'Top-tier Claude for the hardest reasoning and agentic tasks.',
  E'## Overview\n\nOpus is Anthropic''s **most capable** tier - use when quality matters more than unit economics.',
  array['Complex agents','Deep research','Difficult codebases'],
  array['Highest Claude quality','Long context'],
  array['Highest cost in family'],
  array['flagship','reasoning'],
  'https://www.anthropic.com/claude', 'https://docs.anthropic.com',
  'Paid API', false, 'mainstream', 'anthropic/claude-opus-4', 'curated', true, 97
),
(
  'google-gemini-2-5-pro', 'Gemini 2.5 Pro', 'Google', 'Gemini', 'commercial',
  array['text','image','audio','video'], 1048576, null, '2025-03-25',
  'Google DeepMind multimodal flagship with very long context.',
  E'## Overview\n\nGemini 2.5 Pro targets **native multimodality** and million-token class context for enterprise search and media pipelines.',
  array['Multimodal search','Meeting transcription','Large corpus QA'],
  array['Huge context','Native audio/video','Google Cloud integration'],
  array['Ecosystem lock-in to GCP/AI Studio'],
  array['multimodal','long-context'],
  'https://deepmind.google/technologies/gemini/', 'https://ai.google.dev',
  'Paid API', false, 'mainstream', 'google/gemini-2.5-pro', 'curated', true, 96
),
(
  'meta-llama-3-3-70b', 'Llama 3.3 70B', 'Meta', 'Llama', 'open_source',
  array['text'], 128000, '70B', '2024-12-06',
  'Open-weight Llama release competitive with many closed models on benchmarks.',
  E'## Overview\n\nLlama 3.3 70B is **open weights** (custom license) - self-host, fine-tune, or run via hosted APIs.',
  array['On-prem assistants','Fine-tuning','Research'],
  array['Open weights','Strong open performance','Large community'],
  array['Self-host GPU cost','License restrictions for >700M MAU'],
  array['open-weights','self-host'],
  'https://llama.meta.com/', 'https://github.com/meta-llama',
  'Free weights / paid hosting', false, 'mainstream', 'meta-llama/Llama-3.3-70B-Instruct', 'curated', true, 90
),
(
  'mistral-mistral-large', 'Mistral Large', 'Mistral', 'Mistral', 'commercial',
  array['text'], 128000, null, '2024-02-26',
  'European flagship API model - strong multilingual and coding.',
  E'## Overview\n\nMistral Large is the **commercial API** tier from Mistral AI (Paris), popular in EU deployments.',
  array['Multilingual apps','EU data residency options','Coding'],
  array['Strong EU presence','Competitive pricing'],
  array['Closed API tier (distinct from open Mistral weights)'],
  array['multilingual','eu'],
  'https://mistral.ai/', 'https://docs.mistral.ai',
  'Paid API', false, 'mainstream', 'mistralai/mistral-large', 'curated', true, 85
),
(
  'mistral-mixtral-8x7b', 'Mixtral 8x7B', 'Mistral', 'Mixtral', 'open_source',
  array['text'], 32768, '8x7B MoE', '2023-12-11',
  'Sparse MoE open model - efficient inference for its quality class.',
  E'## Overview\n\nMixtral uses a **Mixture-of-Experts** architecture - only a subset of parameters activate per token.',
  array['Self-hosted chat','Cost-sensitive OSS deployments'],
  array['MoE efficiency','Apache 2.0 on early releases'],
  array['Smaller context than modern flagships'],
  array['moe','open-weights'],
  'https://mistral.ai/news/mixtral-of-experts/', 'https://huggingface.co/mistralai',
  'Free weights', false, 'emerging', 'mistralai/Mixtral-8x7B-Instruct-v0.1', 'curated', true, 75
),
(
  'alibaba-qwen2-5-72b', 'Qwen2.5 72B', 'Alibaba', 'Qwen', 'open_source',
  array['text'], 131072, '72B', '2024-09-19',
  'High-performing open model family from Alibaba Cloud - strong in math and code.',
  E'## Overview\n\nQwen2.5 is widely used in **Asia-Pacific** and among open-model fine-tuners.',
  array['Math/code benchmarks','Fine-tuning base','Regional language support'],
  array['Strong OSS benchmarks','Many size variants'],
  array['Less Western brand recognition'],
  array['open-weights','math'],
  'https://qwenlm.github.io/', 'https://huggingface.co/Qwen',
  'Free weights', false, 'emerging', 'Qwen/Qwen2.5-72B-Instruct', 'curated', true, 80
),
(
  'deepseek-deepseek-v3', 'DeepSeek V3', 'DeepSeek', 'DeepSeek', 'open_source',
  array['text'], 65536, '671B MoE', '2024-12-26',
  'MoE open model with exceptional price/performance on APIs and self-host.',
  E'## Overview\n\nDeepSeek V3 disrupted pricing expectations - strong reasoning at **fraction of frontier API cost**.',
  array['Cost-sensitive reasoning','Coding','Distillation source'],
  array['Excellent value','Open weights (check license)'],
  array['Geopolitical / compliance scrutiny in some orgs'],
  array['moe','value'],
  'https://www.deepseek.com/', 'https://huggingface.co/deepseek-ai',
  'API + weights', false, 'mainstream', 'deepseek/deepseek-chat', 'curated', true, 88
),
(
  'microsoft-phi-4', 'Phi-4', 'Microsoft', 'Phi', 'open_source',
  array['text'], 16384, '14B', '2024-12-12',
  'Small language model optimized for reasoning - runs on modest hardware.',
  E'## Overview\n\nPhi-4 proves **small models** can punch above their size on math and logic.',
  array['Edge deployment','On-device','STEM tutoring'],
  array['Tiny footprint','Strong small-model reasoning'],
  array['Not for open-ended creative writing at frontier quality'],
  array['slm','edge'],
  'https://azure.microsoft.com/en-us/products/phi', 'https://huggingface.co/microsoft',
  'Free weights', false, 'emerging', 'microsoft/phi-4', 'curated', true, 70
),
(
  'cohere-command-r-plus', 'Command R+', 'Cohere', 'Command', 'commercial',
  array['text'], 128000, null, '2024-04-04',
  'Enterprise RAG-focused model with strong retrieval and tool use.',
  E'## Overview\n\nCommand R+ is built for **grounded generation** - cite sources, connect to search connectors.',
  array['Enterprise RAG','Search augmentation','Tool calling'],
  array['RAG-first design','Multilingual retrieval'],
  array['Less general "chat personality" than consumer chatbots'],
  array['rag','enterprise'],
  'https://cohere.com/', 'https://docs.cohere.com',
  'Paid API', false, 'emerging', 'cohere/command-r-plus', 'curated', true, 72
),
(
  'xai-grok-2', 'Grok 2', 'xAI', 'Grok', 'commercial',
  array['text','image'], 131072, null, '2024-08-13',
  'xAI model integrated with X/Twitter data and real-time trends.',
  E'## Overview\n\nGrok emphasizes **real-time** knowledge and a distinct tone - niche for social/news use cases.',
  array['Social trend analysis','News summarization','X platform bots'],
  array['Real-time hooks','Distinct style'],
  array['Platform coupling','Enterprise maturity varies'],
  array['real-time','social'],
  'https://x.ai/', null,
  'Subscription / API', false, 'emerging', 'x-ai/grok-2', 'curated', true, 65
),
(
  'ai21-jamba-1-5-large', 'Jamba 1.5 Large', 'AI21 Labs', 'Jamba', 'commercial',
  array['text'], 256000, null, '2024-08-22',
  'Hybrid SSM-Transformer architecture for very long documents.',
  E'## Overview\n\nJamba combines **Mamba SSM** layers with attention for long-context efficiency.',
  array['Legal doc review','Book-length summarization'],
  array['256k context','Hybrid architecture research'],
  array['Smaller ecosystem than GPT/Claude'],
  array['long-context','hybrid-arch'],
  'https://www.ai21.com/', 'https://docs.ai21.com',
  'Paid API', true, 'niche', 'ai21/jamba-1.5-large', 'curated', true, 55
),
(
  'databricks-dbrx', 'DBRX', 'Databricks', 'DBRX', 'open_source',
  array['text'], 32768, '132B MoE', '2024-03-27',
  'Databricks MoE model - strong open benchmark scores at launch.',
  E'## Overview\n\nDBRX is a **training showcase** for Databricks Mosaic - less common in greenfield apps today.',
  array['Data platform demos','Research comparisons'],
  array['MoE quality at launch','Open weights'],
  array['Superseded mindshare by Llama/Qwen/DeepSeek'],
  array['moe','legacy-interest'],
  'https://www.databricks.com/blog/dbrx', null,
  'Hosted on Databricks', true, 'legacy', 'databricks/dbrx-instruct', 'curated', true, 40
),
(
  'stability-stable-diffusion-3', 'Stable Diffusion 3', 'Stability AI', 'SD', 'open_source',
  array['image'], null, null, '2024-02-22',
  'Open image generation model family - not an LLM but often grouped in "generative models".',
  E'## Overview\n\nIncluded for **multimodal literacy** - text-to-image, not chat completion.',
  array['Image generation','Design pipelines','Fine-tune styles'],
  array['Open image stack','Local GPU generation'],
  array['Not for text reasoning tasks'],
  array['image-gen','diffusion'],
  'https://stability.ai/', 'https://huggingface.co/stabilityai',
  'Free / commercial license tiers', true, 'niche', 'stabilityai/stable-diffusion-3-medium', 'curated', true, 50
),
(
  'local-ollama-template', 'Ollama (local runner)', 'Ollama', 'Runtime', 'open_source',
  array['text'], null, null, '2023-06-01',
  'Runtime to pull and run open models locally - not a single model but a deployment path.',
  E'## Overview\n\n**Ollama** wraps llama.cpp and model registries so developers can run OSS weights on laptops.',
  array['Local prototyping','Air-gapped demos','Privacy-sensitive POCs'],
  array['One-command local models','Huge catalog of pulls'],
  array['Not a hosted SLA - ops are on you'],
  array['local','devtools'],
  'https://ollama.com/', 'https://github.com/ollama/ollama',
  'Free software', false, 'emerging', null, 'curated', true, 78
)
on conflict (slug) do nothing;


-- ---------------------------------------------------------------------------
-- 3) Daily models-ingest cron  (migration 20)
-- ---------------------------------------------------------------------------
-- The model landscape changes slower than Radar, so refresh once a day.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_models_ingest()
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
    raise notice 'trigger_models_ingest: vault secrets not set';
    return null;
  end if;

  select net.http_post(
    url     := base_url || '/functions/v1/models-ingest',
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

comment on function public.trigger_models_ingest is
  'POST to models-ingest Edge Function. Daily refresh of the LLM catalog from OpenRouter + Hugging Face.';

-- 03:42 UTC daily - off-peak, distinct from radar (:17).
select cron.schedule(
  'models-ingest-daily',
  '42 3 * * *',
  $cron$ select public.trigger_models_ingest(); $cron$
);
