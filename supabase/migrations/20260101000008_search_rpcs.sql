-- Semantic search RPCs over topics and resources.
-- These are usable as soon as embeddings are populated (see ai-enrich edge function).

create or replace function public.match_topics(
  query_embedding vector(1536),
  match_count integer default 10,
  min_similarity float default 0.0
)
returns table (
  id uuid,
  slug text,
  title text,
  summary text,
  similarity float
)
language sql stable
as $$
  select
    t.id,
    t.slug,
    t.title,
    t.summary,
    1 - (t.embedding <=> query_embedding) as similarity
  from public.topics t
  where t.embedding is not null
    and 1 - (t.embedding <=> query_embedding) >= min_similarity
  order by t.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

create or replace function public.match_resources(
  query_embedding vector(1536),
  match_count integer default 10,
  min_similarity float default 0.0
)
returns table (
  id uuid,
  url text,
  title text,
  summary text,
  similarity float
)
language sql stable
as $$
  select
    r.id,
    r.url,
    r.title,
    r.summary,
    1 - (r.embedding <=> query_embedding) as similarity
  from public.resources r
  where r.embedding is not null
    and 1 - (r.embedding <=> query_embedding) >= min_similarity
  order by r.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;
