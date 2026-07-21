-- UpdateDeck initial schema with RLS

create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Organizations
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.org_role as enum ('owner', 'admin', 'member');

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  goals jsonb not null default '[]'::jsonb,
  progress text,
  completed_work jsonb not null default '[]'::jsonb,
  current_tasks jsonb not null default '[]'::jsonb,
  milestones jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  blockers jsonb not null default '[]'::jsonb,
  next_steps jsonb not null default '[]'::jsonb,
  screenshots jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create type public.deck_status as enum (
  'draft', 'outline', 'approved', 'generating', 'ready'
);

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null,
  status public.deck_status not null default 'draft',
  outline jsonb,
  apply_branding boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.slides (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  "order" integer not null default 0,
  type text not null default 'content',
  layout text not null default 'bullets',
  title text not null default '',
  content jsonb not null default '{}'::jsonb,
  speaker_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.slide_assets (
  id uuid primary key default gen_random_uuid(),
  slide_id uuid not null references public.slides(id) on delete cascade,
  storage_path text not null,
  alt text,
  caption text,
  created_at timestamptz not null default now()
);

create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null default 'Default',
  logo_path text,
  primary_color text not null default '#171717',
  accent_color text not null default '#2563eb',
  font_style text not null default 'sans',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id)
);

create type public.export_status as enum ('pending', 'processing', 'completed', 'failed');

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  format text not null default 'pptx',
  status public.export_status not null default 'pending',
  storage_path text,
  error text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid references public.decks(id) on delete set null,
  org_id uuid not null references public.organizations(id) on delete cascade,
  prompt_hash text,
  model text,
  tokens integer,
  status text not null default 'pending',
  error text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Helper: check org membership
create or replace function public.is_org_member(check_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where org_id = check_org_id and user_id = auth.uid()
  );
$$;

-- Signup trigger: profile + personal org
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.organizations (name, slug)
  values (
    coalesce(new.raw_user_meta_data->>'display_name', 'My Workspace'),
    'org-' || substr(replace(new.id::text, '-', ''), 1, 12)
  )
  returning id into new_org_id;

  insert into public.organization_members (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_updates enable row level security;
alter table public.decks enable row level security;
alter table public.slides enable row level security;
alter table public.slide_assets enable row level security;
alter table public.brand_kits enable row level security;
alter table public.exports enable row level security;
alter table public.ai_generations enable row level security;

-- Profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Organizations
create policy "Members can view org" on public.organizations for select using (public.is_org_member(id));
create policy "Owners can update org" on public.organizations for update using (
  exists (select 1 from public.organization_members m where m.org_id = id and m.user_id = auth.uid() and m.role in ('owner', 'admin'))
);

-- Organization members
create policy "Members can view org members" on public.organization_members for select using (public.is_org_member(org_id));

-- Projects
create policy "Members can view projects" on public.projects for select using (public.is_org_member(org_id));
create policy "Members can insert projects" on public.projects for insert with check (public.is_org_member(org_id));
create policy "Members can update projects" on public.projects for update using (public.is_org_member(org_id));
create policy "Members can delete projects" on public.projects for delete using (public.is_org_member(org_id));

-- Project updates
create policy "Members can manage project updates" on public.project_updates for all using (
  exists (select 1 from public.projects p where p.id = project_id and public.is_org_member(p.org_id))
);

-- Decks
create policy "Members can manage decks" on public.decks for all using (public.is_org_member(org_id));

-- Slides
create policy "Members can manage slides" on public.slides for all using (
  exists (select 1 from public.decks d where d.id = deck_id and public.is_org_member(d.org_id))
);

-- Slide assets
create policy "Members can manage slide assets" on public.slide_assets for all using (
  exists (
    select 1 from public.slides s
    join public.decks d on d.id = s.deck_id
    where s.id = slide_id and public.is_org_member(d.org_id)
  )
);

-- Brand kits
create policy "Members can manage brand kits" on public.brand_kits for all using (public.is_org_member(org_id));

-- Exports
create policy "Members can manage exports" on public.exports for all using (public.is_org_member(org_id));

-- AI generations
create policy "Members can view ai generations" on public.ai_generations for select using (public.is_org_member(org_id));
create policy "Members can insert ai generations" on public.ai_generations for insert with check (public.is_org_member(org_id));

-- Storage buckets (run in Supabase dashboard or separate migration)
-- screenshots, brand-logos, slide-assets, exports - private, path: {org_id}/{entity_id}/{filename}
