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
import { createSupplier, updateSupplier } from "@/lib/actions/suppliers";
import type { SupplierRow } from "@/lib/suppliers";

export interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit mode bila diisi, else create. */
  supplier?: SupplierRow | null;
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
}: SupplierFormDialogProps) {
  const router = useRouter();
  // State diinisialisasi dari props; dialog di-remount via `key` saat target
  // berganti (lihat SupplierManager) — hindari setState sinkron dalam effect.
  const [name, setName] = useState(supplier?.name ?? "");
  const [contactInfo, setContactInfo] = useState(supplier?.contactInfo ?? "");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const input = { name, contactInfo };
    const res = supplier
      ? await updateSupplier(supplier.id, input)
      : await createSupplier(input);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(supplier ? "Supplier diperbarui" : "Supplier dibuat");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{supplier ? "Edit Supplier" : "Tambah Supplier"}</DialogTitle>
          <DialogDescription>
            Nama supplier wajib diisi; kontak opsional.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="supplier-name">Nama</Label>
            <Input
              id="supplier-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="PT Maju Jaya"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="supplier-contact">Kontak</Label>
            <Input
              id="supplier-contact"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Telepon / email / alamat (opsional)"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : supplier ? "Simpan" : "Buat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
