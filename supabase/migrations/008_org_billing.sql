-- Organization billing fields for Stripe subscription sync

alter table public.organizations
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_status text not null default 'none',
  add column if not exists plan_id text;

create index if not exists organizations_stripe_customer_id_idx
  on public.organizations (stripe_customer_id)
  where stripe_customer_id is not null;
