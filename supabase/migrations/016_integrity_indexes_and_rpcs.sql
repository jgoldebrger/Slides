-- Integrity constraints, core indexes, Stripe idempotency, transactional slide RPCs

-- ---------------------------------------------------------------------------
-- Core foreign-key / filter indexes
-- ---------------------------------------------------------------------------
create index if not exists projects_org_id_idx on public.projects (org_id);
create index if not exists project_updates_project_id_idx on public.project_updates (project_id);
create index if not exists decks_org_id_idx on public.decks (org_id);
create index if not exists decks_project_id_idx on public.decks (project_id);
create index if not exists decks_status_idx on public.decks (status);
create index if not exists slides_deck_id_idx on public.slides (deck_id);
create index if not exists slides_deck_id_order_idx on public.slides (deck_id, "order");
create index if not exists slide_assets_slide_id_idx on public.slide_assets (slide_id);
create index if not exists brand_kits_org_id_idx on public.brand_kits (org_id);
create index if not exists exports_deck_id_idx on public.exports (deck_id);
create index if not exists exports_org_id_idx on public.exports (org_id);
create index if not exists ai_generations_deck_id_idx on public.ai_generations (deck_id);
create index if not exists ai_generations_org_id_idx on public.ai_generations (org_id);
create index if not exists organization_members_user_id_idx on public.organization_members (user_id);
create index if not exists organization_members_org_id_idx on public.organization_members (org_id);

-- Deduplicate slide orders before unique constraint
with ranked as (
  select
    id,
    row_number() over (partition by deck_id order by "order", created_at, id) - 1 as new_order
  from public.slides
)
update public.slides s
set "order" = ranked.new_order
from ranked
where s.id = ranked.id
  and s."order" is distinct from ranked.new_order;

create unique index if not exists slides_deck_id_order_unique
  on public.slides (deck_id, "order");

-- ---------------------------------------------------------------------------
-- Cross-tenant deck/project consistency
-- ---------------------------------------------------------------------------
create or replace function public.enforce_deck_project_org()
returns trigger
language plpgsql
as $$
declare
  project_org uuid;
begin
  select org_id into project_org from public.projects where id = new.project_id;
  if project_org is null then
    raise exception 'Project not found';
  end if;
  if new.org_id is distinct from project_org then
    raise exception 'Deck org_id must match project org_id';
  end if;
  return new;
end;
$$;

drop trigger if exists decks_enforce_project_org on public.decks;
create trigger decks_enforce_project_org
  before insert or update of project_id, org_id
  on public.decks
  for each row
  execute function public.enforce_deck_project_org();

-- Repair any existing mismatches (prefer project org)
update public.decks d
set org_id = p.org_id
from public.projects p
where d.project_id = p.id
  and d.org_id is distinct from p.org_id;

-- ---------------------------------------------------------------------------
-- Stripe webhook idempotency + ordering
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  event_created bigint not null,
  org_id uuid references public.organizations(id) on delete set null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
-- Service role only; no policies for authenticated users

alter table public.organizations
  add column if not exists stripe_billing_event_created bigint;

-- ---------------------------------------------------------------------------
-- Export email idempotency marker
-- ---------------------------------------------------------------------------
alter table public.exports
  add column if not exists notified_at timestamptz;

-- ---------------------------------------------------------------------------
-- Claim deck job (atomic status CAS)
-- ---------------------------------------------------------------------------
create or replace function public.claim_deck_job(
  p_deck_id uuid,
  p_from_statuses text[],
  p_to_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id uuid;
begin
  update public.decks
  set
    status = p_to_status::public.deck_status,
    updated_at = now()
  where id = p_deck_id
    and status::text = any (p_from_statuses)
  returning id into updated_id;

  return updated_id is not null;
end;
$$;

revoke all on function public.claim_deck_job(uuid, text[], text) from public;
grant execute on function public.claim_deck_job(uuid, text[], text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Allocate next revision number atomically + prune
-- ---------------------------------------------------------------------------
create or replace function public.allocate_deck_revision(
  p_deck_id uuid,
  p_org_id uuid,
  p_user_id uuid,
  p_reason text,
  p_slides_snapshot jsonb,
  p_max_revisions integer default 20
)
returns public.deck_revisions
language plpgsql
security definer
set search_path = public
as $$
declare
  next_rev integer;
  inserted public.deck_revisions;
begin
  perform pg_advisory_xact_lock(hashtext(p_deck_id::text));

  select coalesce(max(revision), 0) + 1
  into next_rev
  from public.deck_revisions
  where deck_id = p_deck_id;

  insert into public.deck_revisions (
    deck_id, org_id, revision, reason, slides_snapshot, created_by
  )
  values (
    p_deck_id, p_org_id, next_rev, p_reason, p_slides_snapshot, p_user_id
  )
  returning * into inserted;

  delete from public.deck_revisions
  where id in (
    select id
    from public.deck_revisions
    where deck_id = p_deck_id
    order by revision desc
    offset greatest(p_max_revisions, 1)
  );

  return inserted;
end;
$$;

revoke all on function public.allocate_deck_revision(uuid, uuid, uuid, text, jsonb, integer) from public;
grant execute on function public.allocate_deck_revision(uuid, uuid, uuid, text, jsonb, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Replace all slides atomically (snapshot → delete → insert → status)
-- ---------------------------------------------------------------------------
create or replace function public.replace_deck_slides(
  p_deck_id uuid,
  p_org_id uuid,
  p_user_id uuid,
  p_reason text,
  p_slides jsonb,
  p_deck_status text default 'ready'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot jsonb;
begin
  if jsonb_typeof(p_slides) <> 'array' or jsonb_array_length(p_slides) = 0 then
    raise exception 'replace_deck_slides requires a non-empty slides array';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'order', s."order",
        'type', s.type,
        'layout', s.layout,
        'title', s.title,
        'content', s.content,
        'speaker_notes', s.speaker_notes,
        'metadata', s.metadata
      )
      order by s."order"
    ),
    '[]'::jsonb
  )
  into snapshot
  from public.slides s
  where s.deck_id = p_deck_id;

  if jsonb_array_length(snapshot) > 0 then
    perform public.allocate_deck_revision(
      p_deck_id, p_org_id, p_user_id, p_reason, snapshot, 20
    );
  end if;

  delete from public.slides where deck_id = p_deck_id;

  insert into public.slides (
    deck_id, "order", type, layout, title, content, speaker_notes, metadata
  )
  select
    p_deck_id,
    coalesce((slide->>'order')::integer, ord::integer - 1),
    coalesce(slide->>'type', 'content'),
    coalesce(slide->>'layout', 'bullets'),
    coalesce(slide->>'title', ''),
    coalesce(slide->'content', '{}'::jsonb),
    slide->>'speaker_notes',
    coalesce(slide->'metadata', '{}'::jsonb)
  from jsonb_array_elements(p_slides) with ordinality as t(slide, ord);

  update public.decks
  set
    status = p_deck_status::public.deck_status,
    updated_at = now()
  where id = p_deck_id;
end;
$$;

revoke all on function public.replace_deck_slides(uuid, uuid, uuid, text, jsonb, text) from public;
grant execute on function public.replace_deck_slides(uuid, uuid, uuid, text, jsonb, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Restore revision atomically
-- ---------------------------------------------------------------------------
create or replace function public.restore_deck_revision(
  p_deck_id uuid,
  p_revision_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rev public.deck_revisions;
  current_snapshot jsonb;
begin
  select * into rev
  from public.deck_revisions
  where id = p_revision_id
    and deck_id = p_deck_id;

  if rev.id is null then
    raise exception 'Revision not found';
  end if;

  if jsonb_typeof(rev.slides_snapshot) <> 'array'
     or jsonb_array_length(rev.slides_snapshot) = 0 then
    raise exception 'Revision has no slides to restore';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'order', s."order",
        'type', s.type,
        'layout', s.layout,
        'title', s.title,
        'content', s.content,
        'speaker_notes', s.speaker_notes,
        'metadata', s.metadata
      )
      order by s."order"
    ),
    '[]'::jsonb
  )
  into current_snapshot
  from public.slides s
  where s.deck_id = p_deck_id;

  if jsonb_array_length(current_snapshot) > 0 then
    perform public.allocate_deck_revision(
      p_deck_id, rev.org_id, p_user_id, 'manual', current_snapshot, 20
    );
  end if;

  delete from public.slides where deck_id = p_deck_id;

  insert into public.slides (
    deck_id, "order", type, layout, title, content, speaker_notes, metadata
  )
  select
    p_deck_id,
    coalesce((slide->>'order')::integer, ord::integer - 1),
    coalesce(slide->>'type', 'content'),
    coalesce(slide->>'layout', 'bullets'),
    coalesce(slide->>'title', ''),
    coalesce(slide->'content', '{}'::jsonb),
    slide->>'speaker_notes',
    coalesce(slide->'metadata', '{}'::jsonb)
  from jsonb_array_elements(rev.slides_snapshot) with ordinality as t(slide, ord);

  update public.decks
  set status = 'ready', updated_at = now()
  where id = p_deck_id;
end;
$$;

revoke all on function public.restore_deck_revision(uuid, uuid, uuid) from public;
grant execute on function public.restore_deck_revision(uuid, uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Batch apply slide content (refresh) in one transaction
-- ---------------------------------------------------------------------------
create or replace function public.apply_slide_content_batch(
  p_deck_id uuid,
  p_updates jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  updated integer;
begin
  if jsonb_typeof(p_updates) <> 'array' then
    raise exception 'apply_slide_content_batch expects a JSON array';
  end if;

  for item in select * from jsonb_array_elements(p_updates)
  loop
    update public.slides
    set
      title = coalesce(item->>'title', title),
      content = coalesce(item->'content', content),
      speaker_notes = coalesce(item->>'speaker_notes', speaker_notes),
      updated_at = now()
    where id = (item->>'id')::uuid
      and deck_id = p_deck_id;

    get diagnostics updated = row_count;
    if updated = 0 then
      raise exception 'Slide % not found on deck %', item->>'id', p_deck_id;
    end if;
  end loop;
end;
$$;

revoke all on function public.apply_slide_content_batch(uuid, jsonb) from public;
grant execute on function public.apply_slide_content_batch(uuid, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Batch set background path on all slides of a deck
-- ---------------------------------------------------------------------------
create or replace function public.apply_deck_background_batch(
  p_deck_id uuid,
  p_background_path text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if p_background_path is null or p_background_path = '' then
    update public.slides
    set
      content = (content - 'backgroundImagePath' - 'backgroundImageUrl'),
      updated_at = now()
    where deck_id = p_deck_id;
  else
    update public.slides
    set
      content = (content - 'backgroundImageUrl')
        || jsonb_build_object('backgroundImagePath', p_background_path),
      updated_at = now()
    where deck_id = p_deck_id;
  end if;

  get diagnostics updated_count = row_count;

  update public.decks
  set
    background_image_path = nullif(p_background_path, ''),
    updated_at = now()
  where id = p_deck_id;

  return updated_count;
end;
$$;

revoke all on function public.apply_deck_background_batch(uuid, text) from public;
grant execute on function public.apply_deck_background_batch(uuid, text) to authenticated, service_role;
