-- Viewer questions that the AI could not answer from deck content

create table if not exists public.deferred_questions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  share_link_id uuid not null references public.deck_share_links(id) on delete cascade,
  question text not null check (char_length(question) <= 500),
  viewer_email text,
  status text not null default 'pending'
    check (status in ('pending', 'answered', 'dismissed')),
  owner_answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists deferred_questions_deck_status_idx
  on public.deferred_questions (deck_id, status, created_at desc);

alter table public.deferred_questions enable row level security;

create policy "Members can view deferred questions"
  on public.deferred_questions
  for select using (public.is_org_member(org_id));

create policy "Editors can update deferred questions"
  on public.deferred_questions
  for update
  using (public.is_org_editor(org_id))
  with check (public.is_org_editor(org_id));
