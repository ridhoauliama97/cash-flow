"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { detectCoaCycle, validateCoa, type CoaInput, type CoaRow } from "@/lib/coa";
import { guardErr } from "@/lib/utils/guard-err";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const PATH = "/master/chart-of-accounts";

interface DbRow {
  id: string;
  code: string;
  name: string;
  type: string;
  parent_id: string | null;
}

function toRow(r: DbRow): CoaRow {
  return { id: r.id, code: r.code, name: r.name, type: r.type, parentId: r.parent_id };
}

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}


/** List semua akun (flat) — page membangun tree via buildCoaTree. */
export async function listCoa(): Promise<ActionResult<CoaRow[]>> {
  try {
    await requirePermission("master-data", "read");
    const { data, error } = await db().then((s) =>
      s.from("chart_of_accounts").select("id, code, name, type, parent_id"),
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []).map(toRow) };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function createCoa(input: CoaInput): Promise<ActionResult> {
  try {
    const invalid = validateCoa(input);
    if (invalid) return { ok: false, error: invalid };
    const { data: existing } = await db().then((s) =>
      s.from("chart_of_accounts").select("id").eq("code", input.code.trim()),
    );
    if (existing && existing.length > 0) return { ok: false, error: "Kode akun sudah dipakai" };

    const { error } = await db().then((s) =>
      s.from("chart_of_accounts").insert({
        code: input.code.trim(),
        name: input.name.trim(),
        type: input.type,
        parent_id: input.parentId,
      } as never),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function updateCoa(
  id: string,
  input: CoaInput,
): Promise<ActionResult> {
  try {
    await requirePermission("master-data", "update");
    const invalid = validateCoa(input);
    if (invalid) return { ok: false, error: invalid };

    const { data: rows } = await db().then((s) =>
      s.from("chart_of_accounts").select("id, parent_id"),
    );
    const flat = (rows ?? []).map((r) => ({
      id: r.id as string,
      parentId: r.parent_id as string | null,
    }));
    if (detectCoaCycle(flat, id, input.parentId)) {
      return { ok: false, error: "Parent tidak valid: membentuk siklus" };
    }

    const { error } = await db().then((s) =>
      s.from("chart_of_accounts").update({
        code: input.code.trim(),
        name: input.name.trim(),
        type: input.type,
        parent_id: input.parentId,
      } as never).eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function deleteCoa(id: string): Promise<ActionResult> {
  try {
    await requirePermission("master-data", "delete");
    const { data: children } = await db().then((s) =>
      s.from("chart_of_accounts").select("id").eq("parent_id", id),
    );
    if (children && children.length > 0) {
      return { ok: false, error: "Akun ini memiliki sub-akun — hapus sub-akun terlebih dahulu" };
    }
    const { error } = await db().then((s) => s.from("chart_of_accounts").delete().eq("id", id));
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("journal_entries") || msg.includes("foreign key")) {
        return { ok: false, error: "Akun sudah dipakai di jurnal — tidak bisa dihapus" };
      }
      return { ok: false, error: guardErr(error) };
    }
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
