-- Per-org rate limit counters for AI and export actions

create table if not exists public.rate_limit_counters (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  unique (org_id, action, window_start)
);

create index if not exists rate_limit_counters_org_action_idx
  on public.rate_limit_counters (org_id, action, window_start desc);

alter table public.rate_limit_counters enable row level security;

-- Only service role / admin client should touch rate limits
create policy "No direct user access to rate limits"
  on public.rate_limit_counters
  for all
  using (false);
