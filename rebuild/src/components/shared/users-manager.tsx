"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { UserFormDialog } from "@/components/shared/user-form-dialog";
import { setUserActive } from "@/lib/actions/users";
import type { UserRow } from "@/lib/actions/users";
import type { RoleRow } from "@/lib/actions/roles";

export function UsersManager({
  rows,
  roles,
  superAdminIds,
}: {
  rows: UserRow[];
  roles: RoleRow[];
  superAdminIds: string[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isSuperAdmin = (u: UserRow) => superAdminIds.includes(u.id);

  function openEdit(user: UserRow) {
    setEditing(user);
    setDialogOpen(true);
  }

  async function handleToggleActive(user: UserRow, next: boolean) {
    setBusyId(user.id);
    const res = await setUserActive(user.id, next);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(next ? "User diaktifkan" : "User dinonaktifkan");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Kelola role dan status user. Data milik Super Admin tidak bisa diubah.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Divisi</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-28 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Belum ada user.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{user.email}</TableCell>
                  <TableCell>{user.divisionName ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 && (
                        <span className="text-xs text-muted-foreground">tanpa role</span>
                      )}
                      {user.roles.map((r) => (
                        <Badge key={r.id} variant="secondary" className="capitalize">
                          {r.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.isActive}
                      disabled={busyId === user.id || isSuperAdmin(user)}
                      onCheckedChange={(v) => handleToggleActive(user, v)}
                      aria-label={`Status aktif ${user.name ?? user.email}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isSuperAdmin(user)}
                        onClick={() => openEdit(user)}
                      >
                        Edit Role
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UserFormDialog
        key={editing ? `edit-${editing.id}` : "closed"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editing}
        roles={roles}
      />
    </div>
  );
}
