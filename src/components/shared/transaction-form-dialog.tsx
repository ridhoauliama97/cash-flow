"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTransactionAction,
  updateTransactionAction,
  type TransactionRow,
} from "@/lib/actions/transactions";
import type { CostCenterRow } from "@/lib/cost-centers";
import {
  convert,
  FALLBACK_RATES_PER_USD,
  ratesForHome,
} from "@/lib/currency-rates";
import { formatIDR, todayISO } from "@/lib/format";
import { CURRENCIES, type Currency } from "@/types/ledger";
import type { TransactionDraft } from "@/lib/services/transactions";

export interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCenters: CostCenterRow[];
  transaction?: TransactionRow | null;
}

const IDR_RATES = ratesForHome(FALLBACK_RATES_PER_USD, "IDR");

export function TransactionFormDialog({
  open,
  onOpenChange,
  costCenters,
  transaction,
}: TransactionFormDialogProps) {
  const router = useRouter();
  const editing = transaction ?? null;
  const [type, setType] = useState(editing?.type ?? "income");
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [description, setDescription] = useState(editing?.description ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [currency, setCurrency] = useState(editing?.currency ?? "IDR");
  const [costCenterId, setCostCenterId] = useState(editing?.costCenterId ?? "");
  const [busy, setBusy] = useState(false);

  const parsedAmount = Number(amount);
  const basePreview =
    Number.isFinite(parsedAmount) && parsedAmount > 0
      ? convert(parsedAmount, currency as Currency, "IDR", IDR_RATES)
      : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const draft: TransactionDraft = {
      type,
      date,
      description,
      amount: parsedAmount,
      currency,
      costCenterId: costCenterId === "" ? null : costCenterId,
    };
    const res = editing
      ? await updateTransactionAction({ ...draft, id: editing.id })
      : await createTransactionAction(draft);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(editing ? "Transaksi diperbarui" : "Transaksi dibuat");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Transaksi" : "Tambah Transaksi"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Perbarui detail transaksi kas manual."
              : "Transaksi kas manual — tersimpan sebagai draft sampai diposting."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="txn-type">Tipe</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                if (v !== null) setType(v);
              }}
            >
              <SelectTrigger className="w-full" id="txn-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="txn-date">Tanggal</Label>
            <Input
              id="txn-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="txn-description">Deskripsi</Label>
            <Input
              id="txn-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mis. Penjualan tunai"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="txn-amount">Jumlah</Label>
            <Input
              id="txn-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
            />
            <p className="text-xs text-muted-foreground">
              Nilai IDR (estimasi):{" "}
              {basePreview !== null ? formatIDR(basePreview) : "—"}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="txn-currency">Mata uang</Label>
            <Select
              value={currency}
              onValueChange={(v) => {
                if (v !== null) setCurrency(v);
              }}
            >
              <SelectTrigger className="w-full" id="txn-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="txn-cost-center">Cost center</Label>
            <Select
              value={costCenterId}
              onValueChange={(v) => setCostCenterId(v ?? "")}
            >
              <SelectTrigger className="w-full" id="txn-cost-center">
                <SelectValue placeholder="Tanpa cost center" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">Tanpa cost center</SelectItem>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.code} · {cc.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : editing ? "Simpan" : "Buat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
