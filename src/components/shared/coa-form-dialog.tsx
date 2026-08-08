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
import { createCoa, updateCoa } from "@/lib/actions/coa";
import type { CoaRow } from "@/lib/coa";
import { ACCOUNT_TYPES } from "@/types/master-data";

export interface CoaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit mode bila diisi, else create. */
  account?: CoaRow | null;
  /** Semua akun (flat) — untuk pilihan parent. */
  rows: CoaRow[];
  /** Parent default saat create (tombol "+ Sub-akun"). */
  defaultParentId?: string | null;
}

export function CoaFormDialog({
  open,
  onOpenChange,
  account,
  rows,
  defaultParentId = null,
}: CoaFormDialogProps) {
  const router = useRouter();
  // State diinisialisasi dari props; dialog di-remount via `key` saat target
  // berganti (lihat CoaManager) — hindari setState sinkron dalam effect.
  const [code, setCode] = useState(account?.code ?? "");
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<string>(account?.type ?? ACCOUNT_TYPES[0]);
  const [parentId, setParentId] = useState<string>(
    account ? (account.parentId ?? "") : (defaultParentId ?? ""),
  );
  const [busy, setBusy] = useState(false);

  const parentOptions = rows.filter((r) => r.id !== account?.id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const input = {
      code,
      name,
      type,
      parentId: parentId === "" ? null : parentId,
    };
    const res = account
      ? await updateCoa(account.id, input)
      : await createCoa(input);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(account ? "Akun diperbarui" : "Akun dibuat");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Edit Akun" : "Tambah Akun"}</DialogTitle>
          <DialogDescription>
            Kode dan nama akun; pilih parent untuk struktur hierarki.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="coa-code">Kode akun</Label>
            <Input
              id="coa-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="1-1000"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="coa-name">Nama akun</Label>
            <Input
              id="coa-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kas"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="coa-type">Tipe</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                if (v !== null) setType(v);
              }}
            >
              <SelectTrigger className="w-full" id="coa-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="coa-parent">Parent</Label>
            <Select
              value={parentId}
              onValueChange={(v) => setParentId(v ?? "")}
            >
              <SelectTrigger className="w-full" id="coa-parent">
                <SelectValue placeholder="— (akun root)" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">— (akun root)</SelectItem>
                  {parentOptions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.code} · {r.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : account ? "Simpan" : "Buat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
