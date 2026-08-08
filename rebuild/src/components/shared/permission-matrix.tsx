"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setRolePermissions } from "@/lib/actions/permissions";
import type { PermissionMatrix } from "@/lib/actions/permissions";

const MODULE_LABELS: Record<string, string> = {
  transaction: "Transaksi",
  ledger: "Buku Besar",
  "master-data": "Master Data",
  report: "Laporan",
  period: "Periode",
  user: "User & Role",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Buat",
  read: "Lihat",
  update: "Ubah",
  delete: "Hapus",
  approve: "Setujui",
  print: "Cetak",
  export: "Ekspor",
};

export function PermissionMatrixView({ data }: { data: PermissionMatrix }) {
  const router = useRouter();
  const [rolePermissions, updateRolePermissions] = useState<Record<string, string[]>>(
    data.rolePermissions,
  );
  const [busyRole, setBusyRole] = useState<string | null>(null);

  const superAdmin = data.roles.find((r) => r.name === "Super Admin");

  const modules = Array.from(
    new Set(data.permissions.map((p) => p.module)),
  );

  async function toggle(roleId: string, permissionId: string, checked: boolean) {
    const current = rolePermissions[roleId] ?? [];
    const next = checked
      ? [...current, permissionId]
      : current.filter((id) => id !== permissionId);

    const optimistic = {
      ...rolePermissions,
      [roleId]: next,
    };
    updateRolePermissions(optimistic);
    setBusyRole(roleId);

    const res = await setRolePermissions(roleId, next);
    setBusyRole(null);
    if (!res.ok) {
      updateRolePermissions((prev) => ({ ...prev, [roleId]: current }));
      toast.error(res.error);
      return;
    }
    toast.success("Permission diperbarui");
    router.refresh();
  }
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Permissions</h1>
        <p className="text-sm text-muted-foreground">
          Matriks permission per role — centang untuk memberi akses. Perubahan berlaku
          langsung.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-56">Permission</TableHead>
              {data.roles.map((role) => (
                <TableHead key={role.id} className="text-center capitalize">
                  {role.name}
                  {role.id === superAdmin?.id && (
                    <div className="text-xs font-normal text-muted-foreground">
                      (tetap)
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((module) => (
              <ModuleRows
                key={module}
                module={module}
                permissions={data.permissions.filter((p) => p.module === module)}
                roles={data.roles}
                rolePermissions={rolePermissions}
                superAdminRoleId={superAdmin?.id}
                busyRole={busyRole}
                onToggle={toggle}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ModuleRows({
  module,
  permissions,
  roles,
  rolePermissions,
  superAdminRoleId,
  busyRole,
  onToggle,
}: {
  module: string;
  permissions: PermissionMatrix["permissions"];
  roles: PermissionMatrix["roles"];
  rolePermissions: Record<string, string[]>;
  superAdminRoleId?: string;
  busyRole: string | null;
  onToggle: (roleId: string, permissionId: string, checked: boolean) => void;
}) {
  return (
    <>
      <TableRow className="bg-muted/40">
        <TableCell colSpan={roles.length + 1} className="py-1.5 font-medium capitalize">
          {MODULE_LABELS[module] ?? module}
        </TableCell>
      </TableRow>
      {permissions.map((perm) => (
        <TableRow key={perm.id}>
          <TableCell>
            <span className="capitalize">{ACTION_LABELS[perm.action] ?? perm.action}</span>
          </TableCell>
          {roles.map((role) => {
            const locked = role.id === superAdminRoleId;
            const checked = (rolePermissions[role.id] ?? []).includes(perm.id);
            return (
              <TableCell key={role.id} className="text-center">
                <Checkbox
                  checked={checked}
                  disabled={locked || busyRole === role.id}
                  onCheckedChange={(v) => onToggle(role.id, perm.id, Boolean(v))}
                  aria-label={`${perm.module}:${perm.action} — ${role.name}`}
                />
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </>
  );
}
