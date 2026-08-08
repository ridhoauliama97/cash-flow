-- CreateTable
CREATE TABLE "accounting"."accounting_periods" (
    "id" UUID NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "closed_by" UUID,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."transactions" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "base_amount" DECIMAL(65,30) NOT NULL,
    "rate_snapshot" DECIMAL(65,30) NOT NULL,
    "cost_center_id" UUID,
    "created_by" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "accounting_period_id" UUID,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."journal_entries" (
    "id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "debit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "credit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."approvals" (
    "id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "approved_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounting_periods_status_idx" ON "accounting"."accounting_periods"("status");

-- CreateIndex
CREATE INDEX "transactions_date_status_idx" ON "accounting"."transactions"("date", "status");

-- CreateIndex
CREATE INDEX "transactions_accounting_period_id_idx" ON "accounting"."transactions"("accounting_period_id");

-- CreateIndex
CREATE INDEX "transactions_created_by_idx" ON "accounting"."transactions"("created_by");

-- CreateIndex
CREATE INDEX "transactions_cost_center_id_idx" ON "accounting"."transactions"("cost_center_id");

-- CreateIndex
CREATE INDEX "transactions_currency_idx" ON "accounting"."transactions"("currency");

-- CreateIndex
CREATE INDEX "journal_entries_account_id_idx" ON "accounting"."journal_entries"("account_id");

-- CreateIndex
CREATE INDEX "journal_entries_transaction_id_idx" ON "accounting"."journal_entries"("transaction_id");

-- CreateIndex
CREATE INDEX "approvals_transaction_id_idx" ON "accounting"."approvals"("transaction_id");

-- CreateIndex
CREATE INDEX "approvals_approver_id_idx" ON "accounting"."approvals"("approver_id");

-- AddForeignKey
ALTER TABLE "accounting"."transactions" ADD CONSTRAINT "transactions_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "accounting"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."transactions" ADD CONSTRAINT "transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "accounting"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."transactions" ADD CONSTRAINT "transactions_accounting_period_id_fkey" FOREIGN KEY ("accounting_period_id") REFERENCES "accounting"."accounting_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "accounting"."transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."approvals" ADD CONSTRAINT "approvals_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "accounting"."transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."approvals" ADD CONSTRAINT "approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "accounting"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================================
-- Check constraints (Prisma 7 tidak mendukung @@check di schema).
-- ============================================================================

alter table accounting.transactions add constraint txn_type_valid
  check (type in ('income', 'expense'));
alter table accounting.transactions add constraint txn_status_valid
  check (status in ('draft', 'pending', 'approved', 'rejected'));
alter table accounting.transactions add constraint txn_source_valid
  check (source = 'manual');
alter table accounting.transactions add constraint txn_currency_valid
  check (currency in ('IDR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'SGD'));
alter table accounting.journal_entries add constraint journal_amount_non_negative
  check (debit >= 0 and credit >= 0);
alter table accounting.accounting_periods add constraint period_status_valid
  check (status in ('open', 'closed'));
alter table accounting.approvals add constraint approval_level_valid
  check (level in (1, 2));
alter table accounting.approvals add constraint approval_status_valid
  check (status in ('approved', 'rejected'));

-- ============================================================================
-- RLS: transaksi — staff mengelola transaksinya sendiri (created_by),
-- admin/kepala baca semua. Periode & approval tulis dibatasi.
-- ============================================================================

alter table accounting.transactions enable row level security;
alter table accounting.journal_entries enable row level security;
alter table accounting.accounting_periods enable row level security;
alter table accounting.approvals enable row level security;

create policy "transactions: select own or admin" on accounting.transactions
  for select using (auth.uid() = created_by or accounting.is_admin());
create policy "transactions: insert own" on accounting.transactions
  for insert with check (auth.uid() = created_by);
create policy "transactions: update own" on accounting.transactions
  for update using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "transactions: admin delete" on accounting.transactions
  for delete using (accounting.is_admin());

create policy "journal_entries: select own txn" on accounting.journal_entries
  for select using (
    exists (select 1 from accounting.transactions t where t.id = transaction_id and t.created_by = auth.uid())
    or accounting.is_admin()
  );
create policy "journal_entries: insert" on accounting.journal_entries
  for insert with check (
    exists (select 1 from accounting.transactions t where t.id = transaction_id and t.created_by = auth.uid())
  );
create policy "journal_entries: admin update" on accounting.journal_entries
  for update using (accounting.is_admin()) with check (accounting.is_admin());
create policy "journal_entries: admin delete" on accounting.journal_entries
  for delete using (accounting.is_admin());

create policy "accounting_periods: select authenticated" on accounting.accounting_periods
  for select to authenticated using (true);
create policy "accounting_periods: admin write" on accounting.accounting_periods
  for all using (accounting.is_admin()) with check (accounting.is_admin());

create policy "approvals: select authenticated" on accounting.approvals
  for select to authenticated using (true);
create policy "approvals: admin write" on accounting.approvals
  for all using (accounting.is_admin()) with check (accounting.is_admin());
