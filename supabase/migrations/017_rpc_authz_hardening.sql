-- Harden SECURITY DEFINER deck RPCs: require org editor when called as authenticated user.
-- Service-role callers (Inngest jobs) have auth.uid() null and bypass the membership check.

create or replace function public.require_deck_editor(p_deck_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id
  from public.decks
  where id = p_deck_id;

  if v_org_id is null then
    raise exception 'Deck not found';
  end if;

  if auth.uid() is not null and not public.is_org_editor(v_org_id) then
    raise exception 'Forbidden';
  end if;

  return v_org_id;
end;
$$;

revoke all on function public.require_deck_editor(uuid) from public;
grant execute on function public.require_deck_editor(uuid) to authenticated, service_role;

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
  perform public.require_deck_editor(p_deck_id);

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
  v_deck_org uuid;
begin
  v_deck_org := public.require_deck_editor(p_deck_id);

  if p_org_id is distinct from v_deck_org then
    raise exception 'org_id mismatch';
  end if;

  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Forbidden';
  end if;

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
  v_deck_org uuid;
begin
  v_deck_org := public.require_deck_editor(p_deck_id);

  if p_org_id is distinct from v_deck_org then
    raise exception 'org_id mismatch';
  end if;

  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Forbidden';
  end if;

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
  perform public.require_deck_editor(p_deck_id);

  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Forbidden';
  end if;

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
  perform public.require_deck_editor(p_deck_id);

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
  perform public.require_deck_editor(p_deck_id);

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
