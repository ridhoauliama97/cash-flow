-- CreateTable
CREATE TABLE "accounting"."invoices" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customer_id" UUID,
    "supplier_id" UUID,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."forecasts" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."import_batches" (
    "id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "success_rows" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "error_log" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."schedules" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "day_of_month" INTEGER,
    "day_of_week" INTEGER,
    "time_of_day" TEXT NOT NULL DEFAULT '08:00',
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "format" TEXT NOT NULL DEFAULT 'pdf',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_sent_at" TIMESTAMP(3),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "accounting"."invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_type_status_idx" ON "accounting"."invoices"("type", "status");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "accounting"."invoices"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_supplier_id_idx" ON "accounting"."invoices"("supplier_id");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "accounting"."invoices"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "forecasts_year_month_category_key" ON "accounting"."forecasts"("year", "month", "category");

-- CreateIndex
CREATE INDEX "forecasts_year_month_idx" ON "accounting"."forecasts"("year", "month");

-- CreateIndex
CREATE INDEX "import_batches_created_by_idx" ON "accounting"."import_batches"("created_by");

-- CreateIndex
CREATE INDEX "import_batches_status_idx" ON "accounting"."import_batches"("status");

-- CreateIndex
CREATE INDEX "schedules_created_by_idx" ON "accounting"."schedules"("created_by");

-- AddForeignKey
ALTER TABLE "accounting"."invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "accounting"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."invoices" ADD CONSTRAINT "invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "accounting"."suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."invoices" ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "accounting"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."forecasts" ADD CONSTRAINT "forecasts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "accounting"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."import_batches" ADD CONSTRAINT "import_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "accounting"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."schedules" ADD CONSTRAINT "schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "accounting"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey

-- AddForeignKey
