"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  dashboard: "Dashboard",
  analytics: "Analitik",
  transaction: "Transaksi",
  ledger: "Buku Besar",
  "master-data": "Master Data",
  report: "Laporan",
  import: "Import Data",
  schedule: "Schedules",
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

  async function persistRole(roleId: string, next: string[]) {
    updateRolePermissions((prev) => ({ ...prev, [roleId]: next }));
    setBusyRole(roleId);
    const res = await setRolePermissions(roleId, next);
    setBusyRole(null);
    if (!res.ok) {
      updateRolePermissions((prev) => ({
        ...prev,
        [roleId]: data.rolePermissions[roleId] ?? [],
      }));
      toast.error(res.error);
      return;
    }
    toast.success("Permission diperbarui");
    router.refresh();
  }

  async function toggle(roleId: string, permissionId: string, checked: boolean) {
    const current = rolePermissions[roleId] ?? [];
    const next = checked
      ? [...current, permissionId]
      : current.filter((id) => id !== permissionId);
    await persistRole(roleId, next);
  }

  async function toggleAllForRole(roleId: string, checked: boolean) {
    await persistRole(roleId, checked ? data.permissions.map((p) => p.id) : []);
  }

  function isRoleLocked(roleId: string) {
    return roleId === superAdmin?.id;
  }

  function roleState(roleId: string) {
    const granted = rolePermissions[roleId] ?? [];
    const allIds = data.permissions.map((p) => p.id);
    const checked = granted.filter((id) => allIds.includes(id));
    return {
      count: checked.length,
      total: allIds.length,
      all: checked.length === allIds.length,
      none: checked.length === 0,
    };
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Permissions</h1>
        <p className="text-sm text-muted-foreground">
          Matriks permission per role — centang untuk memberi akses. Perubahan berlaku
          langsung. Permission Super Admin terkunci.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="border-collapse">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-56 bg-card">
                <span className="sr-only">Permission</span>
              </TableHead>
              {data.roles.map((role) => {
                const locked = isRoleLocked(role.id);
                const busy = busyRole === role.id;
                const state = roleState(role.id);
                return (
                  <TableHead key={role.id} className="min-w-32 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="capitalize">{role.name}</span>
                      <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
                        {state.count}/{state.total}
                      </span>
                      {locked ? (
                        <span className="text-[11px] font-normal text-muted-foreground">
                          (tetap)
                        </span>
                      ) : (
                        <Checkbox
                          aria-label={`Pilih semua permission untuk ${role.name}`}
                          title={
                            state.all
                              ? `Hapus semua permission ${role.name}`
                              : `Beri semua permission ke ${role.name}`
                          }
                          checked={state.all}
                          disabled={busy}
                          onCheckedChange={(v) => toggleAllForRole(role.id, Boolean(v))}
                        />
                      )}
                      {busy && (
                        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((module) => {
              const modulePermissions = data.permissions.filter(
                (p) => p.module === module,
              );
              const grantedCount = modulePermissions.reduce(
                (acc, p) =>
                  acc +
                  data.roles.filter(
                    (r) =>
                      !isRoleLocked(r.id) &&
                      (rolePermissions[r.id] ?? []).includes(p.id),
                  ).length,
                0,
              );
              const maxCount = modulePermissions.length * data.roles.length;
              return (
                <ModuleRows
                  key={module}
                  module={module}
                  permissions={modulePermissions}
                  roles={data.roles}
                  rolePermissions={rolePermissions}
                  superAdminRoleId={superAdmin?.id}
                  busyRole={busyRole}
                  grantedCount={grantedCount}
                  maxCount={maxCount}
                  onToggle={toggle}
                />
              );
            })}
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
  grantedCount,
  maxCount,
  onToggle,
}: {
  module: string;
  permissions: PermissionMatrix["permissions"];
  roles: PermissionMatrix["roles"];
  rolePermissions: Record<string, string[]>;
  superAdminRoleId?: string;
  busyRole: string | null;
  grantedCount: number;
  maxCount: number;
  onToggle: (roleId: string, permissionId: string, checked: boolean) => void;
}) {
  return (
    <>
      <TableRow className="bg-muted/40">
        <TableCell className="sticky left-0 z-10 bg-muted/40 py-1.5 font-medium">
          {MODULE_LABELS[module] ?? module}
        </TableCell>
        <TableCell colSpan={roles.length} className="py-1.5 text-xs text-muted-foreground tabular-nums">
          {grantedCount}/{maxCount} tercentang
        </TableCell>
      </TableRow>
      {permissions.map((perm) => (
        <TableRow key={perm.id}>
          <TableCell className="sticky left-0 z-10 bg-card">
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
