-- Cash Flow Dashboard schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- Profiles: one row per authenticated user
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'New User',
  company text not null default 'My Company',
  home_currency text not null default 'USD',
  opening_balance numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Transactions: revenue & expense records in original currency
create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  type text not null check (type in ('revenue', 'expense')),
  description text not null,
  amount numeric not null,
  currency text not null check (currency in ('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'IDR')),
  base_amount numeric not null,
  category text not null,
  product text,
  client text,
  region text,
  department text,
  project text,
  payment_method text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);

-- Invoices: accounts receivable
create table if not exists public.invoices (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  number text not null,
  client text not null,
  issue_date date not null,
  due_date date not null,
  amount numeric not null,
  currency text not null check (currency in ('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'IDR')),
  base_amount numeric not null,
  paid_amount numeric not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid')),
  project text,
  created_at timestamptz not null default now()
);

create index if not exists invoices_user_due_idx on public.invoices (user_id, due_date);

-- Budgets: monthly expense budgets per category
create table if not exists public.budgets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null, -- YYYY-MM
  category text not null,
  amount numeric not null,
  unique (user_id, month, category)
);

-- Report schedules: automated report delivery config
create table if not exists public.report_schedules (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  format text not null check (format in ('pdf', 'csv', 'both')),
  recipients text not null,
  enabled boolean not null default true,
  last_sent_at timestamptz,
  next_run_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Exchange rates cache (single global row per base)
create table if not exists public.exchange_rates (
  id text primary key default 'global',
  base text not null,
  rates jsonb not null,
  fetched_at timestamptz not null default now(),
  source text not null default 'live'
);

-- ============ Row Level Security ============
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.invoices enable row level security;
alter table public.budgets enable row level security;
alter table public.report_schedules enable row level security;
alter table public.exchange_rates enable row level security;

-- Users manage their own rows; rates are shared (read-only).
create policy "profiles: own" on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "transactions: own" on public.transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "invoices: own" on public.invoices for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budgets: own" on public.budgets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "report_schedules: own" on public.report_schedules for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "exchange_rates: read" on public.exchange_rates for select
  using (true);

-- Authenticated users may upsert rates (the app caches fetched rates here).
create policy "exchange_rates: write" on public.exchange_rates for all
  to authenticated
  using (true) with check (true);

-- Auto-create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, company)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'), 'My Company')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
