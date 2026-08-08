"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { setUserRoles } from "@/lib/actions/users";
import type { UserRow } from "@/lib/actions/users";
import type { RoleRow } from "@/lib/actions/roles";

export interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow | null;
  roles: RoleRow[];
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  roles,
}: UserFormDialogProps) {
  const router = useRouter();
  const [roleIds, setRoleIds] = useState<string[]>(
    user?.roles.map((r) => r.id) ?? [],
  );
  const [busy, setBusy] = useState(false);

  function toggleRole(roleId: string) {
    setRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const res = await setUserRoles(user.id, roleIds);
    if (!res.ok) {
      setBusy(false);
      toast.error(res.error);
      return;
    }
    setBusy(false);
    toast.success("Role user diperbarui");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>
            {user?.name ?? user?.email} — pilih role yang dimiliki user.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Role</Label>
            <div className="grid gap-2">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm"
                >
                  <Checkbox
                    checked={roleIds.includes(role.id)}
                    onCheckedChange={() => toggleRole(role.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium capitalize">{role.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {role.level} · {role.divisionName ?? "semua divisi"}
                    </div>
                  </div>
                </label>
              ))}
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
            <Button type="submit" disabled={busy || !user}>
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
