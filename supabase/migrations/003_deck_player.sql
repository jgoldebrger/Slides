-- Deck player: optional background audio and image for presentation mode

alter table public.decks
  add column if not exists background_audio_path text,
  add column if not exists background_image_path text;

-- Allow audio uploads in slide-assets (deck backgrounds)
update storage.buckets
set allowed_mime_types = array[
  'image/png',
  'image/jpeg',
  'image/webp',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav'
]
where id = 'slide-assets';
