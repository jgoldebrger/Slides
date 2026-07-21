-- Profile preferences for notifications and display

alter table public.profiles
  add column if not exists notify_export_ready boolean not null default true,
  add column if not exists notify_team_invites boolean not null default true;
