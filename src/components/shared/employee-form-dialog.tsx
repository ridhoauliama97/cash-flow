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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createEmployee,
  updateEmployee,
  type EmployeeRow,
} from "@/lib/actions/employees";
import type { DivisionRow } from "@/lib/actions/divisions";
import type { DepartmentRow } from "@/lib/actions/departments";

export interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeRow | null;
  divisions: DivisionRow[];
  departments: DepartmentRow[];
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  divisions,
  departments,
}: EmployeeFormDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(employee?.name ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [divisionId, setDivisionId] = useState(employee?.divisionId ?? "");
  const [departmentId, setDepartmentId] = useState(
    employee?.departmentId ?? "",
  );
  const [position, setPosition] = useState(employee?.position ?? "");
  const [hireDate, setHireDate] = useState(
    employee?.hireDate?.slice(0, 10) ?? "",
  );
  const [isActive, setIsActive] = useState(employee?.isActive ?? true);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const input = {
      name,
      email: email || null,
      userId: employee?.userId ?? null,
      divisionId: divisionId || null,
      departmentId: departmentId || null,
      position: position || null,
      hireDate: hireDate || null,
      isActive,
    };
    const res = employee
      ? await updateEmployee(employee.id, input)
      : await createEmployee(input);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(employee ? "Karyawan diperbarui" : "Karyawan ditambahkan");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {employee ? "Edit Karyawan" : "Tambah Karyawan"}
          </DialogTitle>
          <DialogDescription>
            {employee
              ? "Perbarui informasi karyawan."
              : "Masukkan informasi karyawan baru."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="emp-name">Nama</Label>
            <Input
              id="emp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap"
              autoFocus
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="emp-email">Email</Label>
            <Input
              id="emp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@perusahaan.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            <div className="grid gap-2">
              <Label>Departemen</Label>
              <Select
                value={departmentId}
                onValueChange={(v) => setDepartmentId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih departemen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="">— Tanpa departemen</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="emp-position">Posisi</Label>
              <Input
                id="emp-position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Staff Akuntansi"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-hire-date">Tanggal Masuk</Label>
              <Input
                id="emp-hire-date"
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="emp-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="emp-active" className="cursor-pointer">
              Aktif
            </Label>
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
