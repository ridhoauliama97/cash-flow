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
import { TransactionsTable } from "@/components/shared/transactions-table";
import { deleteTransaction } from "@/lib/actions/transactions";
import { submitForApproval } from "@/lib/actions/approvals";
import { postJournalAction } from "@/lib/actions/ledger";
import type { TransactionRow } from "@/lib/actions/transactions";
import type { CostCenterRow } from "@/lib/cost-centers";

export function TransactionManager({
  rows,
  costCenters,
}: {
  rows: TransactionRow[];
  costCenters: CostCenterRow[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredRows = rows.filter(
    (r) =>
      (typeFilter === "" || r.type === typeFilter) &&
      (statusFilter === "" || r.status === statusFilter),
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: TransactionRow) {
    setEditing(row);
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

  async function handleSubmit(row: TransactionRow) {
    if (!confirm(`Ajukan transaksi "${row.description}" untuk persetujuan?`))
      return;
    const res = await submitForApproval(row.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Transaksi diajukan");
    router.refresh();
  }

  async function handlePost(row: TransactionRow) {
    if (!confirm(`Posting jurnal untuk transaksi "${row.description}"?`))
      return;
    const res = await postJournalAction(row.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Jurnal diposting");
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
            <SelectTrigger className="h-8 w-40" aria-label="Filter tipe">
              <SelectValue placeholder="Semua tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="">Semua</SelectItem>
                <SelectItem value="Income">Pemasukan</SelectItem>
                <SelectItem value="Expense">Pengeluaran</SelectItem>
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
            <SelectTrigger className="h-8 w-40" aria-label="Filter status">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="">Semua</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending">Menunggu</SelectItem>
                <SelectItem value="Approved">Disetujui</SelectItem>
                <SelectItem value="Rejected">Ditolak</SelectItem>
                <SelectItem value="Posted">Diposting</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <TransactionsTable
        rows={filteredRows}
        onDelete={handleDelete}
        onEdit={openEdit}
        onSubmit={handleSubmit}
        onPost={handlePost}
      />

      <TransactionFormDialog
        key={editing ? `edit-${editing.id}` : "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        costCenters={costCenters}
        transaction={editing}
      />
    </div>
  );
}
