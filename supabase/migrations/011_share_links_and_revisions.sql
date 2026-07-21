-- Share links (token hashed at rest) + deck slide revision snapshots

create table if not exists public.deck_share_links (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  token_hash text not null unique,
  label text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists deck_share_links_deck_id_idx
  on public.deck_share_links (deck_id);

create index if not exists deck_share_links_token_hash_idx
  on public.deck_share_links (token_hash)
  where revoked_at is null;

alter table public.deck_share_links enable row level security;

create policy "Members can view deck share links"
  on public.deck_share_links
  for select using (public.is_org_member(org_id));

create policy "Editors can insert deck share links"
  on public.deck_share_links
  for insert with check (public.is_org_editor(org_id));

create policy "Editors can update deck share links"
  on public.deck_share_links
  for update using (public.is_org_editor(org_id));

create policy "Editors can delete deck share links"
  on public.deck_share_links
  for delete using (public.is_org_editor(org_id));

-- Full-deck slide snapshots for restore after refresh/regenerate
create table if not exists public.deck_revisions (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  revision integer not null,
  reason text not null check (reason in ('refresh', 'regenerate', 'manual')),
  slides_snapshot jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (deck_id, revision)
);

create index if not exists deck_revisions_deck_id_idx
  on public.deck_revisions (deck_id, revision desc);

alter table public.deck_revisions enable row level security;

create policy "Members can view deck revisions"
  on public.deck_revisions
  for select using (public.is_org_member(org_id));

create policy "Editors can insert deck revisions"
  on public.deck_revisions
  for insert with check (public.is_org_editor(org_id));

create policy "Editors can delete deck revisions"
  on public.deck_revisions
  for delete using (public.is_org_editor(org_id));
