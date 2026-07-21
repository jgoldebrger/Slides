-- Allow async AI jobs to return structured results for client polling.
alter table public.ai_generations
  add column if not exists result jsonb;
