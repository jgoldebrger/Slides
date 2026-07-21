-- Auth rate limits (email/identity keyed; no org FK) + atomic bump helpers

create table if not exists public.auth_rate_limit_counters (
  id uuid primary key default gen_random_uuid(),
  identity_key text not null,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  unique (identity_key, action, window_start)
);

alter table public.auth_rate_limit_counters enable row level security;

drop policy if exists "No direct user access to auth rate limits" on public.auth_rate_limit_counters;
create policy "No direct user access to auth rate limits"
  on public.auth_rate_limit_counters
  for all
  using (false);

-- Atomic org rate-limit bump; returns { allowed, remaining, retry_after_ms }
create or replace function public.bump_rate_limit(
  p_org_id uuid,
  p_action text,
  p_window_start timestamptz,
  p_limit integer,
  p_window_ms integer default 3600000
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.rate_limit_counters%rowtype;
begin
  insert into public.rate_limit_counters (org_id, action, window_start, count)
  values (p_org_id, p_action, p_window_start, 1)
  on conflict (org_id, action, window_start)
  do update set count = public.rate_limit_counters.count + 1
  returning * into rec;

  if rec.count > p_limit then
    -- roll back the excess bump
    update public.rate_limit_counters
      set count = p_limit
      where id = rec.id and count > p_limit;
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after_ms', p_window_ms
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'remaining', greatest(p_limit - rec.count, 0)
  );
end;
$$;

create or replace function public.bump_auth_rate_limit(
  p_identity_key text,
  p_action text,
  p_window_start timestamptz,
  p_limit integer,
  p_window_ms integer default 3600000
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.auth_rate_limit_counters%rowtype;
begin
  insert into public.auth_rate_limit_counters (identity_key, action, window_start, count)
  values (p_identity_key, p_action, p_window_start, 1)
  on conflict (identity_key, action, window_start)
  do update set count = public.auth_rate_limit_counters.count + 1
  returning * into rec;

  if rec.count > p_limit then
    update public.auth_rate_limit_counters
      set count = p_limit
      where id = rec.id and count > p_limit;
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after_ms', p_window_ms
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'remaining', greatest(p_limit - rec.count, 0)
  );
end;
$$;

revoke all on function public.bump_rate_limit from public, anon, authenticated;
revoke all on function public.bump_auth_rate_limit from public, anon, authenticated;
grant execute on function public.bump_rate_limit to service_role;
grant execute on function public.bump_auth_rate_limit to service_role;
