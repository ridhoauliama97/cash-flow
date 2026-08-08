"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { isRoleLevel, SUPER_ADMIN_ROLE_NAME } from "@/types/rbac";
import { guardErr } from "@/lib/utils/guard-err";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface RoleRow {
  id: string;
  name: string;
  level: string;
  divisionId: string | null;
  divisionName: string | null;
  permissionCount: number;
  userCount: number;
}

export interface RoleInput {
  name: string;
  level: string;
  divisionId: string | null;
}

export interface DivisionRow {
  id: string;
  name: string;
}

const PATH = "/settings/roles";

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}


export async function listRoles(): Promise<ActionResult<RoleRow[]>> {
  try {
    await requirePermission("user", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("roles")
        .select(
          "id, name, level, division_id, divisions(name), role_permissions(permission_id), user_roles(user_id)",
        )
        .order("name"),
    );
    if (error) return { ok: false, error: error.message };
    const rows = (data ?? []) as unknown as Array<{
      id: string;
      name: string;
      level: string;
      division_id: string | null;
      divisions: { name: string } | null;
      role_permissions: Array<{ permission_id: string }> | null;
      user_roles: Array<{ user_id: string }> | null;
    }>;
    return {
      ok: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        level: r.level,
        divisionId: r.division_id,
        divisionName: r.divisions?.name ?? null,
        permissionCount: (r.role_permissions ?? []).length,
        userCount: (r.user_roles ?? []).length,
      })),
    };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function listDivisions(): Promise<ActionResult<DivisionRow[]>> {
  try {
    await requirePermission("user", "read");
    const { data, error } = await db().then((s) =>
      s.from("divisions").select("id, name").order("name"),
    );
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      data: (data ?? []).map((r) => ({
        id: r.id as string,
        name: r.name as string,
      })),
    };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

function validateRole(input: RoleInput): string | null {
  const name = input.name.trim();
  if (!name) return "Nama role wajib diisi";
  if (name.length > 50) return "Nama role maksimal 50 karakter";
  if (!isRoleLevel(input.level)) return "Level role tidak valid";
  return null;
}

export async function createRole(input: RoleInput): Promise<ActionResult> {
  try {
    await requirePermission("user", "create");
    const invalid = validateRole(input);
    if (invalid) return { ok: false, error: invalid };

    const { error } = await db().then((s) =>
      s.from("roles").insert({
        id: crypto.randomUUID(),
        name: input.name.trim(),
        level: input.level,
        division_id: input.divisionId,
      } as never),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function updateRole(
  id: string,
  input: RoleInput,
): Promise<ActionResult> {
  try {
    await requirePermission("user", "update");
    const invalid = validateRole(input);
    if (invalid) return { ok: false, error: invalid };

    const { data: rows } = await db().then((s) =>
      s.from("roles").select("id, name"),
    );
    const target = (rows ?? []).find((r) => r.id === id);
    if (!target) return { ok: false, error: "Role tidak ditemukan" };
    if (target.name === SUPER_ADMIN_ROLE_NAME) {
      return { ok: false, error: "Role Super Admin tidak bisa diubah" };
    }
    if (input.name.trim() === SUPER_ADMIN_ROLE_NAME) {
      return { ok: false, error: "Nama role Super Admin dilindungi" };
    }

    const { error } = await db().then((s) =>
      s
        .from("roles")
        .update({
          name: input.name.trim(),
          level: input.level,
          division_id: input.divisionId,
        } as never)
        .eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function deleteRole(id: string): Promise<ActionResult> {
  try {
    await requirePermission("user", "delete");
    const { data: rows } = await db().then((s) =>
      s.from("roles").select("id, name"),
    );
    const target = (rows ?? []).find((r) => r.id === id);
    if (!target) return { ok: false, error: "Role tidak ditemukan" };
    if (target.name === SUPER_ADMIN_ROLE_NAME) {
      return { ok: false, error: "Role Super Admin tidak bisa dihapus" };
    }

    const { data: members } = await db().then((s) =>
      s.from("user_roles").select("user_id").eq("role_id", id),
    );
    if (members && members.length > 0) {
      return {
        ok: false,
        error: "Role masih dipakai oleh user — lepas dulu role-nya",
      };
    }

    const { error } = await db().then((s) =>
      s.from("roles").delete().eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
