"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireCanModifyData } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  divisionId: string | null;
  divisionName: string | null;
  roles: Array<{ id: string; name: string; level: string }>;
}

const PATH = "/settings/users";

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}

function guardErr(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("23505")) return "Data sudah ada";
  return msg;
}

export async function listUsers(): Promise<ActionResult<UserRow[]>> {
  try {
    await requirePermission("user", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("users")
        .select(
          "id, email, name, is_active, division_id, divisions(name), user_roles(roles(id, name, level))",
        )
        .order("email"),
    );
    if (error) return { ok: false, error: error.message };
    const rows = (data ?? []) as unknown as Array<{
      id: string;
      email: string;
      name: string | null;
      is_active: boolean;
      division_id: string | null;
      divisions: { name: string } | null;
      user_roles: Array<{
        roles: { id: string; name: string; level: string } | null;
      }> | null;
    }>;
    return {
      ok: true,
      data: rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        isActive: r.is_active,
        divisionId: r.division_id,
        divisionName: r.divisions?.name ?? null,
        roles: (r.user_roles ?? [])
          .map((ur) => ur.roles)
          .filter(
            (x): x is { id: string; name: string; level: string } => x !== null,
          ),
      })),
    };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

/** Ganti seluruh role milik user (list lengkap baru). */
export async function setUserRoles(
  userId: string,
  roleIds: string[],
): Promise<ActionResult> {
  try {
    await requirePermission("user", "update");
    await requireCanModifyData(userId); // data milik Super Admin tidak bisa diubah role lain
    const s = await db();
    const { error: delErr } = await s
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (delErr) return { ok: false, error: delErr.message };
    if (roleIds.length > 0) {
      const { error: insErr } = await s
        .from("user_roles")
        .insert(
          roleIds.map((roleId) => ({
            user_id: userId,
            role_id: roleId,
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

export async function setUserActive(
  userId: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    await requirePermission("user", "update");
    await requireCanModifyData(userId);
    const { error } = await db().then((s) =>
      s
        .from("users")
        .update({ is_active: isActive } as never)
        .eq("id", userId),
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
