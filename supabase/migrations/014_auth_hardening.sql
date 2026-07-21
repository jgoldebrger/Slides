-- Auth hardening: stop trusting signup metadata for org/role; store email on profiles;
-- pending org invites with hashed tokens (no plaintext passwords).

-- 1) profiles.email for team listing without Auth Admin listUsers
alter table public.profiles
  add column if not exists email text;

create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email is not null;

-- 2) Org invites (accept via /invite/[token])
create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.org_role not null default 'viewer',
  token_hash text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists org_invites_org_id_idx on public.org_invites (org_id);
create index if not exists org_invites_email_idx on public.org_invites (lower(email));

alter table public.org_invites enable row level security;

drop policy if exists "Admins can view org invites" on public.org_invites;
create policy "Admins can view org invites" on public.org_invites
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = org_invites.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

drop policy if exists "Admins can insert org invites" on public.org_invites;
create policy "Admins can insert org invites" on public.org_invites
  for insert with check (
    exists (
      select 1 from public.organization_members m
      where m.org_id = org_invites.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

drop policy if exists "Admins can update org invites" on public.org_invites;
create policy "Admins can update org invites" on public.org_invites
  for update using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = org_invites.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- 3) Harden handle_new_user: never trust client invite_org_id / invite_role
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_org uuid;
  new_org_id uuid;
  display text;
begin
  display := coalesce(
    new.raw_user_meta_data->>'display_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, display_name, email)
  values (new.id, display, new.email)
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name);

  -- Optional single-tenant onboarding: join default org as viewer only
  select default_org_id into default_org from public.app_settings where id = 1;

  if default_org is not null then
    insert into public.organization_members (org_id, user_id, role)
    values (default_org, new.id, 'viewer')
    on conflict (org_id, user_id) do nothing;
    return new;
  end if;

  -- Multi-tenant default: personal workspace as owner
  insert into public.organizations (name, slug)
  values (
    display || '''s Workspace',
    'org-' || substr(replace(new.id::text, '-', ''), 1, 12)
  )
  returning id into new_org_id;

  insert into public.organization_members (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

-- Backfill emails for existing profiles
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is null
  and u.email is not null;

-- 4) Tighten app_settings read: authenticated users only (not anon)
drop policy if exists "Members can view app settings" on public.app_settings;
drop policy if exists "Authenticated can view app settings" on public.app_settings;
create policy "Authenticated can view app settings" on public.app_settings
  for select using (auth.uid() is not null);

-- Auth rate limit counters reuse rate_limit_counters with action text; no schema change needed.
