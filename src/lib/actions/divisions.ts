"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface DivisionRow {
  id: string;
  name: string;
  employeeCount: number;
}

const PATH = "/settings/divisions";

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}

function guardErr(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("23505")) return "Nama divisi sudah dipakai";
  return msg;
}

export async function listDivisions(): Promise<ActionResult<DivisionRow[]>> {
  try {
    await requirePermission("user", "read");
    const { data, error } = await db().then((s) =>
      s.from("divisions").select("id, name, users(user_id)").order("name"),
    );
    if (error) return { ok: false, error: error.message };
    const rows = (data ?? []) as unknown as Array<{
      id: string;
      name: string;
      users: Array<{ user_id: string }> | null;
    }>;
    return {
      ok: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        employeeCount: (r.users ?? []).length,
      })),
    };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function createDivision(name: string): Promise<ActionResult> {
  try {
    await requirePermission("user", "create");
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Nama divisi wajib diisi" };
    if (trimmed.length > 100)
      return { ok: false, error: "Nama divisi maksimal 100 karakter" };

    const { error } = await db().then((s) =>
      s.from("divisions").insert({ name: trimmed } as never),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function updateDivision(
  id: string,
  name: string,
): Promise<ActionResult> {
  try {
    await requirePermission("user", "update");
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Nama divisi wajib diisi" };
    if (trimmed.length > 100)
      return { ok: false, error: "Nama divisi maksimal 100 karakter" };

    const { error } = await db().then((s) =>
      s
        .from("divisions")
        .update({ name: trimmed } as never)
        .eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function deleteDivision(id: string): Promise<ActionResult> {
  try {
    await requirePermission("user", "delete");

    const { data: members } = await db().then((s) =>
      s.from("users").select("id").eq("division_id", id),
    );
    if (members && members.length > 0) {
      return {
        ok: false,
        error: "Divisi masih dipakai oleh user — lepas dulu user dari divisi",
      };
    }

    const { error } = await db().then((s) =>
      s.from("divisions").delete().eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
