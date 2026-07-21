-- Org AI writing tone for outline / slide fill / rewrite prompts.
alter table public.brand_kits
  add column if not exists ai_tone text not null default 'executive';

alter table public.brand_kits
  drop constraint if exists brand_kits_ai_tone_check;

alter table public.brand_kits
  add constraint brand_kits_ai_tone_check
  check (
    ai_tone in (
      'executive',
      'concise',
      'collaborative',
      'formal',
      'optimistic'
    )
  );

comment on column public.brand_kits.ai_tone is
  'Writing voice for AI-generated deck copy (org default).';
