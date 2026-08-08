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
import { RoleFormDialog } from "@/components/shared/role-form-dialog";
import { deleteRole } from "@/lib/actions/roles";
import { SUPER_ADMIN_ROLE_NAME } from "@/types/rbac";
import type { RoleRow, DivisionRow } from "@/lib/actions/roles";

export function RolesManager({
  rows,
  divisions,
}: {
  rows: RoleRow[];
  divisions: DivisionRow[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);

  const isProtected = (r: RoleRow) => r.name === SUPER_ADMIN_ROLE_NAME;

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(role: RoleRow) {
    setEditing(role);
    setDialogOpen(true);
  }

  async function handleDelete(role: RoleRow) {
    if (!confirm(`Hapus role "${role.name}"?`)) return;
    const res = await deleteRole(role.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Role dihapus");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Definisikan role, level, dan divisi — basis pemberian permission.
          </p>
        </div>
        <Button onClick={openCreate}>Tambah Role</Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Divisi</TableHead>
              <TableHead className="text-right">Permissions</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="w-32 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Belum ada role.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {role.level}
                    </Badge>
                  </TableCell>
                  <TableCell>{role.divisionName ?? "—"}</TableCell>
                  <TableCell className="text-right">{role.permissionCount}</TableCell>
                  <TableCell className="text-right">{role.userCount}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isProtected(role)}
                        onClick={() => openEdit(role)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={isProtected(role)}
                        onClick={() => handleDelete(role)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RoleFormDialog
        key={editing ? `edit-${editing.id}` : "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        role={editing}
        divisions={divisions}
      />
    </div>
  );
}
