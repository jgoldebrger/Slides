-- Ensure slide-assets accepts deck player background audio (idempotent).

update storage.buckets
set
  file_size_limit = 15728640,
  allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/wave'
  ]
where id = 'slide-assets';
