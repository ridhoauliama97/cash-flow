"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionFormDialog } from "@/components/shared/transaction-form-dialog";
import {
  TransactionsTable,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/components/shared/transactions-table";
import { deleteTransaction } from "@/lib/actions/transactions";
import type { TransactionRow } from "@/lib/actions/transactions";
import type { CostCenterRow } from "@/lib/cost-centers";
import type { TransactionStatus } from "@/types/ledger";

export function TransactionManager({
  rows,
  costCenters,
}: {
  rows: TransactionRow[];
  costCenters: CostCenterRow[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openMode, setOpenMode] = useState<"create">("create");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredRows = rows.filter(
    (r) =>
      (typeFilter === "" || r.type === typeFilter) &&
      (statusFilter === "" || r.status === statusFilter),
  );

  function openCreate() {
    setOpenMode("create");
    setDialogOpen(true);
  }

  async function handleDelete(row: TransactionRow) {
    if (!confirm(`Hapus transaksi "${row.description}"?`)) return;
    const res = await deleteTransaction(row.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Transaksi dihapus");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Transaksi Kas
          </h1>
          <p className="text-sm text-muted-foreground">
            Transaksi kas manual — pemasukan dan pengeluaran.
          </p>
        </div>
        <Button onClick={openCreate}>Tambah Transaksi</Button>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4">
        <div className="grid gap-2">
          <Label htmlFor="txn-filter-type">Tipe</Label>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v ?? "")}
          >
            <SelectTrigger className="w-44" id="txn-filter-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="">Semua</SelectItem>
                <SelectItem value="income">
                  {TRANSACTION_TYPE_LABELS.income}
                </SelectItem>
                <SelectItem value="expense">
                  {TRANSACTION_TYPE_LABELS.expense}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="txn-filter-status">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v ?? "")}
          >
            <SelectTrigger className="w-44" id="txn-filter-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="">Semua status</SelectItem>
                {(Object.keys(TRANSACTION_STATUS_LABELS) as TransactionStatus[]).map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {TRANSACTION_STATUS_LABELS[s]}
                    </SelectItem>
                  ),
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <TransactionsTable rows={filteredRows} onDelete={handleDelete} />

      <TransactionFormDialog
        key={openMode}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        costCenters={costCenters}
      />
    </div>
  );
}
