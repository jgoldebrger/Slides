-- AI platform: org settings, activity timeline, generation metadata

alter table public.organizations
  add column if not exists settings jsonb not null default '{}'::jsonb;

create table if not exists public.ai_activity (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete set null,
  slide_id uuid references public.slides(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  feature_id text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_activity_org_created_idx
  on public.ai_activity (org_id, created_at desc);

create index if not exists ai_activity_deck_created_idx
  on public.ai_activity (deck_id, created_at desc)
  where deck_id is not null;

alter table public.ai_activity enable row level security;

create policy "Members can view org ai activity"
  on public.ai_activity for select
  using (public.is_org_member(org_id));

create policy "Members can insert org ai activity"
  on public.ai_activity for insert
  with check (public.is_org_member(org_id));

alter table public.ai_generations
  add column if not exists confidence jsonb,
  add column if not exists citations jsonb;
