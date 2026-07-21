-- Signup defaults and team management support

create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  default_org_id uuid references public.organizations(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

-- Existing installs: use the first owner workspace for new signups
update public.app_settings
set default_org_id = (
  select m.org_id
  from public.organization_members m
  where m.role = 'owner'
  order by m.created_at asc
  limit 1
)
where id = 1
  and default_org_id is null;

alter table public.app_settings enable row level security;

create policy "Members can view app settings" on public.app_settings
  for select using (true);

create policy "Owners can insert app settings" on public.app_settings
  for insert with check (
    exists (
      select 1 from public.organization_members m
      where m.user_id = auth.uid() and m.role = 'owner'
    )
  );

create policy "Owners can update app settings" on public.app_settings
  for update using (
    exists (
      select 1 from public.organization_members m
      where m.user_id = auth.uid() and m.role = 'owner'
    )
  );

-- Signup: join default org as viewer, or invited org/role from metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_org uuid;
  meta_org text;
  meta_role text;
  new_org_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );

  meta_org := new.raw_user_meta_data->>'invite_org_id';
  meta_role := new.raw_user_meta_data->>'invite_role';

  if meta_org is not null and meta_org <> '' then
    insert into public.organization_members (org_id, user_id, role)
    values (
      meta_org::uuid,
      new.id,
      coalesce(nullif(meta_role, ''), 'viewer')::public.org_role
    );
    return new;
  end if;

  select default_org_id into default_org from public.app_settings where id = 1;

  if default_org is not null then
    insert into public.organization_members (org_id, user_id, role)
    values (default_org, new.id, 'viewer');
    return new;
  end if;

  insert into public.organizations (name, slug)
  values (
    coalesce(new.raw_user_meta_data->>'display_name', 'My Workspace'),
    'org-' || substr(replace(new.id::text, '-', ''), 1, 12)
  )
  returning id into new_org_id;

  insert into public.organization_members (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  insert into public.app_settings (id, default_org_id)
  values (1, new_org_id)
  on conflict (id) do update
    set default_org_id = coalesce(public.app_settings.default_org_id, excluded.default_org_id);

  return new;
end;
$$;

-- Team management policies
create policy "Admins can update org members" on public.organization_members
  for update using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = organization_members.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy "Admins can delete org members" on public.organization_members
  for delete using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = organization_members.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
    and organization_members.user_id <> auth.uid()
  );

create policy "Admins can insert org members" on public.organization_members
  for insert with check (
    exists (
      select 1 from public.organization_members m
      where m.org_id = organization_members.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- Allow org members to view teammate profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (
    auth.uid() = id
    or exists (
      select 1
      from public.organization_members me
      join public.organization_members them on them.org_id = me.org_id
      where me.user_id = auth.uid() and them.user_id = profiles.id
    )
  );
