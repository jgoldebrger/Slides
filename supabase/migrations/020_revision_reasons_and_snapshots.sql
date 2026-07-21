-- Extend revision reasons for audience variants and translations
alter table public.deck_revisions
  drop constraint if exists deck_revisions_reason_check;

alter table public.deck_revisions
  add constraint deck_revisions_reason_check
  check (reason in ('refresh', 'regenerate', 'manual', 'audience_variant', 'translate'));

-- Store previous update snapshot for AI narrative diffs
alter table public.project_updates
  add column if not exists metadata jsonb not null default '{}'::jsonb;
