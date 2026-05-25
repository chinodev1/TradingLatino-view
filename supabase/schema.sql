-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

create table if not exists subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null unique,   -- Clerk userId
  status       text not null default 'pending',  -- 'active' | 'expired' | 'pending'
  expires_at   timestamptz not null,
  payment_id   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists subscriptions_updated_at on subscriptions;
create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute procedure update_updated_at();

-- Index for fast lookups by user_id
create index if not exists subscriptions_user_id_idx on subscriptions (user_id);

-- RLS: only service role can write; anon can read their own row
alter table subscriptions enable row level security;

create policy "service role full access" on subscriptions
  for all using (auth.role() = 'service_role');

create policy "user reads own subscription" on subscriptions
  for select using (user_id = auth.jwt() ->> 'sub');
