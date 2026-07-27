-- AI workspace: prompt library, feedback, agents, connectors

create table if not exists public.ai_prompt_library (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  body text not null,
  tags text[] not null default '{}',
  scope text not null default 'personal' check (scope in ('personal', 'org')),
  version int not null default 1,
  parent_id uuid references public.ai_prompt_library(id) on delete set null,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_prompt_library_org_idx
  on public.ai_prompt_library (org_id, updated_at desc);

alter table public.ai_prompt_library enable row level security;

create policy "Members can view org prompts"
  on public.ai_prompt_library for select
  using (public.is_org_member(org_id));

create policy "Members can insert org prompts"
  on public.ai_prompt_library for insert
  with check (public.is_org_member(org_id));

create policy "Members can update own or org prompts"
  on public.ai_prompt_library for update
  using (public.is_org_member(org_id));

create policy "Members can delete own or org prompts"
  on public.ai_prompt_library for delete
  using (public.is_org_member(org_id));

create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  deck_id uuid references public.decks(id) on delete set null,
  slide_id uuid references public.slides(id) on delete set null,
  generation_id uuid references public.ai_generations(id) on delete set null,
  feature_id text,
  rating smallint not null check (rating in (-1, 1)),
  correction text,
  created_at timestamptz not null default now()
);

create index if not exists ai_feedback_org_created_idx
  on public.ai_feedback (org_id, created_at desc);

alter table public.ai_feedback enable row level security;

create policy "Members can view org ai feedback"
  on public.ai_feedback for select
  using (public.is_org_member(org_id));

create policy "Members can insert org ai feedback"
  on public.ai_feedback for insert
  with check (public.is_org_member(org_id));

create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  agent_type text not null check (agent_type in ('friday', 'refresh', 'approval', 'risk_watch', 'brand_drift')),
  name text not null,
  enabled boolean not null default true,
  schedule_cron text,
  config jsonb not null default '{}'::jsonb,
  budget_runs_per_week int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, agent_type)
);

alter table public.ai_agents enable row level security;

create policy "Admins can manage ai agents"
  on public.ai_agents for all
  using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = ai_agents.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy "Members can view ai agents"
  on public.ai_agents for select
  using (public.is_org_member(org_id));

create table if not exists public.ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'awaiting_approval')),
  steps jsonb not null default '[]'::jsonb,
  summary text,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists ai_agent_runs_agent_idx
  on public.ai_agent_runs (agent_id, started_at desc);

alter table public.ai_agent_runs enable row level security;

create policy "Members can view agent runs"
  on public.ai_agent_runs for select
  using (public.is_org_member(org_id));

create policy "Admins can insert agent runs"
  on public.ai_agent_runs for insert
  with check (
    exists (
      select 1 from public.organization_members m
      where m.org_id = ai_agent_runs.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy "Admins can update agent runs"
  on public.ai_agent_runs for update
  using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = ai_agent_runs.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create table if not exists public.ai_connectors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  connector_type text not null check (connector_type in ('slack', 'jira', 'linear', 'email', 'github', 'notion')),
  name text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, connector_type)
);

alter table public.ai_connectors enable row level security;

create policy "Admins can manage connectors"
  on public.ai_connectors for all
  using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = ai_connectors.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy "Members can view connectors"
  on public.ai_connectors for select
  using (public.is_org_member(org_id));
