"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { SUPER_ADMIN_ROLE_NAME } from "@/types/rbac";
import { guardErr } from "@/lib/utils/guard-err";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface PermissionRow {
  id: string;
  module: string;
  action: string;
}

export interface PermissionMatrix {
  permissions: PermissionRow[];
  roles: Array<{ id: string; name: string; level: string }>;
  rolePermissions: Record<string, string[]>;
}

const PATH = "/settings/permissions";

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}


export async function getPermissionMatrix(): Promise<
  ActionResult<PermissionMatrix>
> {
  try {
    await requirePermission("user", "read");
    const s = await db();
    const [
      { data: perms, error: permErr },
      { data: roles, error: roleErr },
      { data: rps, error: rpErr },
    ] = await Promise.all([
      s
        .from("permissions")
        .select("id, module, action")
        .order("module")
        .order("action"),
      s.from("roles").select("id, name, level").order("name"),
      s.from("role_permissions").select("role_id, permission_id"),
    ]);
    if (permErr) return { ok: false, error: permErr.message };
    if (roleErr) return { ok: false, error: roleErr.message };
    if (rpErr) return { ok: false, error: rpErr.message };

    const rolePermissions: Record<string, string[]> = {};
    for (const rp of rps ?? []) {
      const roleId = rp.role_id as string;
      (rolePermissions[roleId] ??= []).push(rp.permission_id as string);
    }
    return {
      ok: true,
      data: {
        permissions: (perms ?? []).map((p) => ({
          id: p.id as string,
          module: p.module as string,
          action: p.action as string,
        })),
        roles: (roles ?? []).map((r) => ({
          id: r.id as string,
          name: r.name as string,
          level: r.level as string,
        })),
        rolePermissions,
      },
    };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

/** Ganti seluruh permission milik role (list lengkap baru). */
export async function setRolePermissions(
  roleId: string,
  permissionIds: string[],
): Promise<ActionResult> {
  try {
    await requirePermission("user", "update");
    const s = await db();
    const { data: rows } = await s
      .from("roles")
      .select("name")
      .eq("id", roleId);
    const role = (rows ?? [])[0];
    if (!role) return { ok: false, error: "Role tidak ditemukan" };
    if (role.name === SUPER_ADMIN_ROLE_NAME) {
      return {
        ok: false,
        error: "Permission Super Admin tidak bisa diubah dari UI",
      };
    }

    const { error: delErr } = await s
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId);
    if (delErr) return { ok: false, error: delErr.message };
    if (permissionIds.length > 0) {
      const { error: insErr } = await s
        .from("role_permissions")
        .insert(
          permissionIds.map((permissionId) => ({
            role_id: roleId,
            permission_id: permissionId,
          })) as never,
        );
      if (insErr) return { ok: false, error: guardErr(insErr) };
    }
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
