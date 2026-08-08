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
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import type { CustomerRow } from "@/lib/customers";

export interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit mode bila diisi, else create. */
  customer?: CustomerRow | null;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: CustomerFormDialogProps) {
  const router = useRouter();
  // State diinisialisasi dari props; dialog di-remount via `key` saat target
  // berganti (lihat CustomerManager) — hindari setState sinkron dalam effect.
  const [name, setName] = useState(customer?.name ?? "");
  const [contactInfo, setContactInfo] = useState(customer?.contactInfo ?? "");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const input = {
      name,
      contactInfo: contactInfo === "" ? null : contactInfo,
    };
    const res = customer
      ? await updateCustomer(customer.id, input)
      : await createCustomer(input);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(customer ? "Customer diperbarui" : "Customer dibuat");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {customer ? "Edit Customer" : "Tambah Customer"}
          </DialogTitle>
          <DialogDescription>
            Nama customer wajib diisi; kontak opsional.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="customer-name">Nama</Label>
            <Input
              id="customer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="PT Maju Jaya"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-contact">Kontak</Label>
            <Input
              id="customer-contact"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Email / telepon / alamat"
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
              {busy ? "Menyimpan…" : customer ? "Simpan" : "Buat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
