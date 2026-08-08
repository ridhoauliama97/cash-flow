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
import { createRole, updateRole } from "@/lib/actions/roles";
import type { RoleRow, DivisionRow } from "@/lib/actions/roles";
import { ROLE_LEVELS } from "@/types/rbac";

export interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleRow | null;
  divisions: DivisionRow[];
}

export function RoleFormDialog({ open, onOpenChange, role, divisions }: RoleFormDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(role?.name ?? "");
  const [level, setLevel] = useState<string>(role?.level ?? ROLE_LEVELS[0]);
  const [divisionId, setDivisionId] = useState<string>(role?.divisionId ?? "");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const input = {
      name,
      level,
      divisionId: divisionId === "" ? null : divisionId,
    };
    const res = role ? await updateRole(role.id, input) : await createRole(input);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(role ? "Role diperbarui" : "Role dibuat");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{role ? "Edit Role" : "Tambah Role"}</DialogTitle>
          <DialogDescription>
            Nama role, level akses, dan divisi penanggung jawab (opsional).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="role-name">Nama role</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Staff Kasir"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role-level">Level</Label>
            <Select value={level} onValueChange={(v) => v !== null && setLevel(v)}>
              <SelectTrigger className="w-full" id="role-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ROLE_LEVELS.map((l) => (
                    <SelectItem key={l} value={l} className="capitalize">
                      {l}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role-division">Divisi</Label>
            <Select
              value={divisionId}
              onValueChange={(v) => setDivisionId(v ?? "")}
            >
              <SelectTrigger className="w-full" id="role-division">
                <SelectValue placeholder="— semua divisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">— semua divisi</SelectItem>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : role ? "Simpan" : "Buat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
