-- Accounts payable: vendor bills the business owes, mirroring invoices (AR).
-- Bills support the same lifecycle (unpaid / partial / paid) and aging so the
-- AR/AP tracker can show both sides of the ledger.

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  number text not null,
  vendor text not null,
  issue_date date not null,
  due_date date not null,
  amount numeric not null,
  currency text not null check (currency in ('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'IDR')),
  base_amount numeric not null,
  paid_amount numeric not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid')),
  category text not null default 'Other',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists bills_user_due_idx on public.bills (user_id, due_date);

alter table public.bills enable row level security;

create policy "bills: own" on public.bills for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
