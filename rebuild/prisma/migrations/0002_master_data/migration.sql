-- CreateTable
CREATE TABLE "accounting"."chart_of_accounts" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."customers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."suppliers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."cost_centers" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "division_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chart_of_accounts_parent_id_idx" ON "accounting"."chart_of_accounts"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_code_key" ON "accounting"."chart_of_accounts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_code_key" ON "accounting"."cost_centers"("code");

-- AddForeignKey
ALTER TABLE "accounting"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cost_centers" ADD CONSTRAINT "cost_centers_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "accounting"."divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================================
-- RLS: master data — baca authenticated, tulis admin.
-- ============================================================================

alter table accounting.chart_of_accounts enable row level security;
alter table accounting.customers enable row level security;
alter table accounting.suppliers enable row level security;
alter table accounting.cost_centers enable row level security;

create policy "chart_of_accounts: select authenticated" on accounting.chart_of_accounts
  for select to authenticated using (true);
create policy "chart_of_accounts: admin write" on accounting.chart_of_accounts
  for all using (accounting.is_admin()) with check (accounting.is_admin());

create policy "customers: select authenticated" on accounting.customers
  for select to authenticated using (true);
create policy "customers: admin write" on accounting.customers
  for all using (accounting.is_admin()) with check (accounting.is_admin());

create policy "suppliers: select authenticated" on accounting.suppliers
  for select to authenticated using (true);
create policy "suppliers: admin write" on accounting.suppliers
  for all using (accounting.is_admin()) with check (accounting.is_admin());

create policy "cost_centers: select authenticated" on accounting.cost_centers
  for select to authenticated using (true);
create policy "cost_centers: admin write" on accounting.cost_centers
  for all using (accounting.is_admin()) with check (accounting.is_admin());
