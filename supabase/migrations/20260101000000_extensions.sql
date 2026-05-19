-- Required extensions for AI Academy
-- pgcrypto: UUID generation
-- vector:   pgvector for semantic search over resources/topics

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- Shared updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
