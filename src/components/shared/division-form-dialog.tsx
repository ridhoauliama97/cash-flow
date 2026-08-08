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
import { createDivision, updateDivision } from "@/lib/actions/divisions";
import type { DivisionRow } from "@/lib/actions/divisions";

export interface DivisionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  division: DivisionRow | null;
}

export function DivisionFormDialog({
  open,
  onOpenChange,
  division,
}: DivisionFormDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(division?.name ?? "");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = division
      ? await updateDivision(division.id, name)
      : await createDivision(name);
    if (!res.ok) {
      setBusy(false);
      toast.error(res.error);
      return;
    }
    setBusy(false);
    toast.success(division ? "Divisi diperbarui" : "Divisi ditambahkan");
    setName("");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{division ? "Edit Divisi" : "Tambah Divisi"}</DialogTitle>
          <DialogDescription>
            {division
              ? "Perbarui nama divisi."
              : "Masukkan nama divisi baru."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="division-name">Nama</Label>
            <Input
              id="division-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama divisi"
              autoFocus
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
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
