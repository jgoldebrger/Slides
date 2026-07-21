-- Viewer role: read-only org members who can only watch presentations

do $$ begin
  alter type public.org_role add value 'viewer';
exception
  when duplicate_object then null;
end $$;

create or replace function public.is_org_editor(check_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where org_id = check_org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin', 'member')
  );
$$;

-- Projects
drop policy if exists "Members can insert projects" on public.projects;
drop policy if exists "Members can update projects" on public.projects;
drop policy if exists "Members can delete projects" on public.projects;

create policy "Editors can insert projects" on public.projects
  for insert with check (public.is_org_editor(org_id));
create policy "Editors can update projects" on public.projects
  for update using (public.is_org_editor(org_id));
create policy "Editors can delete projects" on public.projects
  for delete using (public.is_org_editor(org_id));

-- Project updates
drop policy if exists "Members can manage project updates" on public.project_updates;

create policy "Members can view project updates" on public.project_updates
  for select using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_org_member(p.org_id))
  );
create policy "Editors can insert project updates" on public.project_updates
  for insert with check (
    exists (select 1 from public.projects p where p.id = project_id and public.is_org_editor(p.org_id))
  );
create policy "Editors can update project updates" on public.project_updates
  for update using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_org_editor(p.org_id))
  );
create policy "Editors can delete project updates" on public.project_updates
  for delete using (
    exists (select 1 from public.projects p where p.id = project_id and public.is_org_editor(p.org_id))
  );

-- Decks
drop policy if exists "Members can manage decks" on public.decks;

create policy "Members can view decks" on public.decks
  for select using (public.is_org_member(org_id));
create policy "Editors can insert decks" on public.decks
  for insert with check (public.is_org_editor(org_id));
create policy "Editors can update decks" on public.decks
  for update using (public.is_org_editor(org_id));
create policy "Editors can delete decks" on public.decks
  for delete using (public.is_org_editor(org_id));

-- Slides
drop policy if exists "Members can manage slides" on public.slides;

create policy "Members can view slides" on public.slides
  for select using (
    exists (select 1 from public.decks d where d.id = deck_id and public.is_org_member(d.org_id))
  );
create policy "Editors can insert slides" on public.slides
  for insert with check (
    exists (select 1 from public.decks d where d.id = deck_id and public.is_org_editor(d.org_id))
  );
create policy "Editors can update slides" on public.slides
  for update using (
    exists (select 1 from public.decks d where d.id = deck_id and public.is_org_editor(d.org_id))
  );
create policy "Editors can delete slides" on public.slides
  for delete using (
    exists (select 1 from public.decks d where d.id = deck_id and public.is_org_editor(d.org_id))
  );

-- Slide assets
drop policy if exists "Members can manage slide assets" on public.slide_assets;

create policy "Members can view slide assets" on public.slide_assets
  for select using (
    exists (
      select 1 from public.slides s
      join public.decks d on d.id = s.deck_id
      where s.id = slide_id and public.is_org_member(d.org_id)
    )
  );
create policy "Editors can insert slide assets" on public.slide_assets
  for insert with check (
    exists (
      select 1 from public.slides s
      join public.decks d on d.id = s.deck_id
      where s.id = slide_id and public.is_org_editor(d.org_id)
    )
  );
create policy "Editors can update slide assets" on public.slide_assets
  for update using (
    exists (
      select 1 from public.slides s
      join public.decks d on d.id = s.deck_id
      where s.id = slide_id and public.is_org_editor(d.org_id)
    )
  );
create policy "Editors can delete slide assets" on public.slide_assets
  for delete using (
    exists (
      select 1 from public.slides s
      join public.decks d on d.id = s.deck_id
      where s.id = slide_id and public.is_org_editor(d.org_id)
    )
  );

-- Brand kits
drop policy if exists "Members can manage brand kits" on public.brand_kits;

create policy "Members can view brand kits" on public.brand_kits
  for select using (public.is_org_member(org_id));
create policy "Editors can insert brand kits" on public.brand_kits
  for insert with check (public.is_org_editor(org_id));
create policy "Editors can update brand kits" on public.brand_kits
  for update using (public.is_org_editor(org_id));
create policy "Editors can delete brand kits" on public.brand_kits
  for delete using (public.is_org_editor(org_id));

-- Exports
drop policy if exists "Members can manage exports" on public.exports;

create policy "Members can view exports" on public.exports
  for select using (public.is_org_member(org_id));
create policy "Editors can insert exports" on public.exports
  for insert with check (public.is_org_editor(org_id));
create policy "Editors can update exports" on public.exports
  for update using (public.is_org_editor(org_id));
create policy "Editors can delete exports" on public.exports
  for delete using (public.is_org_editor(org_id));

-- AI generations
drop policy if exists "Members can insert ai generations" on public.ai_generations;

create policy "Editors can insert ai generations" on public.ai_generations
  for insert with check (public.is_org_editor(org_id));

-- Storage: viewers can read, editors can write
drop policy if exists "Org members manage screenshots" on storage.objects;
drop policy if exists "Org members manage brand logos" on storage.objects;
drop policy if exists "Org members manage slide assets" on storage.objects;
drop policy if exists "Org members manage exports" on storage.objects;

create policy "Org members read screenshots" on storage.objects
  for select to authenticated
  using (bucket_id = 'screenshots' and public.is_org_member(public.storage_org_id(name)));

create policy "Org editors write screenshots" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'screenshots' and public.is_org_editor(public.storage_org_id(name)));

create policy "Org editors update screenshots" on storage.objects
  for update to authenticated
  using (bucket_id = 'screenshots' and public.is_org_editor(public.storage_org_id(name)));

create policy "Org editors delete screenshots" on storage.objects
  for delete to authenticated
  using (bucket_id = 'screenshots' and public.is_org_editor(public.storage_org_id(name)));

create policy "Org members read brand logos" on storage.objects
  for select to authenticated
  using (bucket_id = 'brand-logos' and public.is_org_member(public.storage_org_id(name)));

create policy "Org editors write brand logos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brand-logos' and public.is_org_editor(public.storage_org_id(name)));

create policy "Org editors update brand logos" on storage.objects
  for update to authenticated
  using (bucket_id = 'brand-logos' and public.is_org_editor(public.storage_org_id(name)));

create policy "Org editors delete brand logos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'brand-logos' and public.is_org_editor(public.storage_org_id(name)));

create policy "Org members read slide assets" on storage.objects
  for select to authenticated
  using (bucket_id = 'slide-assets' and public.is_org_member(public.storage_org_id(name)));

create policy "Org editors write slide assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'slide-assets' and public.is_org_editor(public.storage_org_id(name)));

create policy "Org editors update slide assets" on storage.objects
  for update to authenticated
  using (bucket_id = 'slide-assets' and public.is_org_editor(public.storage_org_id(name)));

create policy "Org editors delete slide assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'slide-assets' and public.is_org_editor(public.storage_org_id(name)));

create policy "Org members read exports bucket" on storage.objects
  for select to authenticated
  using (bucket_id = 'exports' and public.is_org_member(public.storage_org_id(name)));

create policy "Org editors write exports bucket" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exports' and public.is_org_editor(public.storage_org_id(name)));

create policy "Org editors update exports bucket" on storage.objects
  for update to authenticated
  using (bucket_id = 'exports' and public.is_org_editor(public.storage_org_id(name)));

create policy "Org editors delete exports bucket" on storage.objects
  for delete to authenticated
  using (bucket_id = 'exports' and public.is_org_editor(public.storage_org_id(name)));
