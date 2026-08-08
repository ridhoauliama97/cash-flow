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
import { Textarea } from "@/components/ui/textarea";
import { createCompany, updateCompany } from "@/lib/actions/companies";
import type { CompanyRow, CompanyInput } from "@/lib/actions/companies";

export interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanyRow | null;
}

export function CompanyFormDialog({
  open,
  onOpenChange,
  company,
}: CompanyFormDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(company?.name ?? "");
  const [address, setAddress] = useState(company?.address ?? "");
  const [phone, setPhone] = useState(company?.phone ?? "");
  const [email, setEmail] = useState(company?.email ?? "");
  const [website, setWebsite] = useState(company?.website ?? "");
  const [taxNumber, setTaxNumber] = useState(company?.taxNumber ?? "");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const input: CompanyInput = {
      name: name.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      website: website.trim() || null,
      taxNumber: taxNumber.trim() || null,
      logo: company?.logo ?? null,
    };
    const res = company
      ? await updateCompany(company.id, input)
      : await createCompany(input);
    if (!res.ok) {
      setBusy(false);
      toast.error(res.error);
      return;
    }
    setBusy(false);
    toast.success(
      company ? "Perusahaan diperbarui" : "Perusahaan ditambahkan",
    );
    setName("");
    setAddress("");
    setPhone("");
    setEmail("");
    setWebsite("");
    setTaxNumber("");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {company ? "Edit Perusahaan" : "Tambah Perusahaan"}
          </DialogTitle>
          <DialogDescription>
            {company
              ? "Perbarui informasi perusahaan."
              : "Masukkan informasi perusahaan baru."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="company-name">Nama *</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama perusahaan"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company-address">Alamat</Label>
            <Textarea
              id="company-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Alamat perusahaan"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="company-phone">Telepon</Label>
              <Input
                id="company-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nomor telepon"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-email">Email</Label>
              <Input
                id="company-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email perusahaan"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="company-website">Website</Label>
              <Input
                id="company-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-tax">NPWP</Label>
              <Input
                id="company-tax"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="Nomor NPWP"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
