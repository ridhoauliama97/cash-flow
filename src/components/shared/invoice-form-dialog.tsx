"use client";

import { useState } from "react";
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
import { createInvoice, updateInvoice } from "@/lib/actions/invoices";
import { todayISO } from "@/lib/format";
import type { InvoiceRow } from "@/lib/actions/invoices";
import type { CustomerRow } from "@/lib/customers";
import type { SupplierRow } from "@/lib/suppliers";

export interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceRow | null;
  customers: CustomerRow[];
  suppliers: SupplierRow[];
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  invoice,
  customers,
  suppliers,
}: InvoiceFormDialogProps) {
  const router = useRouter();
  const [type, setType] = useState(invoice?.type ?? "receivable");
  const [customerId, setCustomerId] = useState(invoice?.customerId ?? "");
  const [supplierId, setSupplierId] = useState(invoice?.supplierId ?? "");
  const [description, setDescription] = useState(invoice?.description ?? "");
  const [amount, setAmount] = useState(invoice?.amount?.toString() ?? "");
  const [currency, setCurrency] = useState(invoice?.currency ?? "IDR");
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate?.slice(0, 10) ?? todayISO(),
  );
  const [busy, setBusy] = useState(false);

  const isEdit = !!invoice;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const amountNum = Number(amount);
    const payload = {
      customerId: type === "receivable" ? customerId || null : null,
      supplierId: type === "payable" ? supplierId || null : null,
      description,
      amount: amountNum,
      currency,
      dueDate,
    };

    const res = isEdit
      ? await updateInvoice(invoice.id, payload)
      : await createInvoice({ type, ...payload });

    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(isEdit ? "Invoice diperbarui" : "Invoice dibuat");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Invoice" : "Tambah Invoice"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Edit detail invoice ${invoice.number}.`
              : "Buat invoice piutang atau hutang baru."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Tipe</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                if (v) setType(v);
              }}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="receivable">Piutang (Receivable)</SelectItem>
                  <SelectItem value="payable">Hutang (Payable)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Nomor Invoice</Label>
            <Input
              value={invoice?.number ?? "—"}
              disabled
              className="font-mono"
            />
          </div>

          {type === "receivable" && (
            <div className="grid gap-2">
              <Label>Customer</Label>
              <Select
                value={customerId}
                onValueChange={(v) => setCustomerId(v ?? "")}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "payable" && (
            <div className="grid gap-2">
              <Label>Supplier</Label>
              <Select
                value={supplierId}
                onValueChange={(v) => setSupplierId(v ?? "")}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="invoice-desc">Deskripsi</Label>
            <Input
              id="invoice-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi invoice"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invoice-amount">Jumlah</Label>
              <Input
                id="invoice-amount"
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Mata Uang</Label>
              <Select
                value={currency}
                onValueChange={(v) => {
                  if (v) setCurrency(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="IDR">IDR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="invoice-due">Jatuh Tempo</Label>
            <Input
              id="invoice-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
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
              {busy ? "Menyimpan…" : isEdit ? "Simpan" : "Buat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
