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
import { createDepartment, updateDepartment } from "@/lib/actions/departments";
import type { DepartmentRow } from "@/lib/actions/departments";
import type { DivisionRow } from "@/lib/actions/divisions";

export interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: DepartmentRow | null;
  divisions: DivisionRow[];
}

export function DepartmentFormDialog({
  open,
  onOpenChange,
  department,
  divisions,
}: DepartmentFormDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(department?.name ?? "");
  const [divisionId, setDivisionId] = useState<string>(
    department?.divisionId ?? "",
  );
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = department
      ? await updateDepartment(department.id, {
          name,
          divisionId: divisionId || null,
        })
      : await createDepartment({ name, divisionId: divisionId || null });
    if (!res.ok) {
      setBusy(false);
      toast.error(res.error);
      return;
    }
    setBusy(false);
    toast.success(
      department ? "Departemen diperbarui" : "Departemen ditambahkan",
    );
    setName("");
    setDivisionId("");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {department ? "Edit Departemen" : "Tambah Departemen"}
          </DialogTitle>
          <DialogDescription>
            {department
              ? "Perbarui informasi departemen."
              : "Masukkan informasi departemen baru."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="department-name">Nama</Label>
            <Input
              id="department-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama departemen"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label>Divisi</Label>
            <Select
              value={divisionId}
              onValueChange={(v) => setDivisionId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih divisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">— Tanpa divisi</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
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
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
