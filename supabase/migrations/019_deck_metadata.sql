-- Deck-level metadata for AI audience, share blurbs, and other non-slide settings.
alter table public.decks
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists decks_metadata_gin_idx on public.decks using gin (metadata);
