-- Storage buckets for UpdateDeck (private, org-scoped paths)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'screenshots',
    'screenshots',
    false,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'brand-logos',
    'brand-logos',
    false,
    2097152,
    array['image/png', 'image/jpeg', 'image/svg+xml']
  ),
  (
    'slide-assets',
    'slide-assets',
    false,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'exports',
    'exports',
    false,
    52428800,
    array[
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/pdf'
    ]
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Helper: first path segment is org_id
create or replace function public.storage_org_id(object_path text)
returns uuid
language sql
immutable
as $$
  select nullif(split_part(object_path, '/', 1), '')::uuid;
$$;

-- screenshots: {org_id}/{project_id}/{file}
drop policy if exists "Org members manage screenshots" on storage.objects;
create policy "Org members manage screenshots"
on storage.objects for all
to authenticated
using (
  bucket_id = 'screenshots'
  and public.is_org_member(public.storage_org_id(name))
)
with check (
  bucket_id = 'screenshots'
  and public.is_org_member(public.storage_org_id(name))
);

-- brand-logos: {org_id}/logo.ext
drop policy if exists "Org members manage brand logos" on storage.objects;
create policy "Org members manage brand logos"
on storage.objects for all
to authenticated
using (
  bucket_id = 'brand-logos'
  and public.is_org_member(public.storage_org_id(name))
)
with check (
  bucket_id = 'brand-logos'
  and public.is_org_member(public.storage_org_id(name))
);

-- slide-assets: {org_id}/{deck_id}/{slide_id}/{file}
drop policy if exists "Org members manage slide assets" on storage.objects;
create policy "Org members manage slide assets"
on storage.objects for all
to authenticated
using (
  bucket_id = 'slide-assets'
  and public.is_org_member(public.storage_org_id(name))
)
with check (
  bucket_id = 'slide-assets'
  and public.is_org_member(public.storage_org_id(name))
);

-- exports: {org_id}/{deck_id}/{export_id}.pptx
drop policy if exists "Org members manage exports" on storage.objects;
create policy "Org members manage exports"
on storage.objects for all
to authenticated
using (
  bucket_id = 'exports'
  and public.is_org_member(public.storage_org_id(name))
)
with check (
  bucket_id = 'exports'
  and public.is_org_member(public.storage_org_id(name))
);
