"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  validateCostCenter,
  type CostCenterInput,
  type CostCenterRow,
  type DivisionRow,
} from "@/lib/cost-centers";
import { guardErr } from "@/lib/utils/guard-err";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const PATH = "/master/cost-centers";

interface DbRow {
  id: string;
  code: string;
  name: string;
  division_id: string;
}

function toRow(r: DbRow): CostCenterRow {
  return { id: r.id, code: r.code, name: r.name, divisionId: r.division_id };
}

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}


/** List semua divisi — untuk pilihan di form. */
export async function listDivisions(): Promise<ActionResult<DivisionRow[]>> {
  try {
    await requirePermission("master-data", "read");
    const { data, error } = await db().then((s) =>
      s.from("divisions").select("id, name").order("name"),
    );
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      data: (data ?? []).map((r) => ({ id: r.id, name: r.name })),
    };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

/** List semua cost center (flat). */
export async function listCostCenters(): Promise<
  ActionResult<CostCenterRow[]>
> {
  try {
    await requirePermission("master-data", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("cost_centers")
        .select("id, code, name, division_id")
        .order("code"),
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []).map(toRow) };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function createCostCenter(
  input: CostCenterInput,
): Promise<ActionResult> {
  try {
    await requirePermission("master-data", "create");
    const invalid = validateCostCenter(input);
    if (invalid) return { ok: false, error: invalid };

    const { data: existing } = await db().then((s) =>
      s.from("cost_centers").select("id").eq("code", input.code.trim()),
    );
    if (existing && existing.length > 0) {
      return { ok: false, error: "Kode cost center sudah dipakai" };
    }

    const { error } = await db().then((s) =>
      s.from("cost_centers").insert({        created_at: new Date().toISOString(),

        id: crypto.randomUUID(),
        code: input.code.trim(),
        name: input.name.trim(),
        division_id: input.divisionId.trim(),
      } as never),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function updateCostCenter(
  id: string,
  input: CostCenterInput,
): Promise<ActionResult> {
  try {
    await requirePermission("master-data", "update");
    const invalid = validateCostCenter(input);
    if (invalid) return { ok: false, error: invalid };

    const { error } = await db().then((s) =>
      s
        .from("cost_centers")
        .update({
          code: input.code.trim(),
          name: input.name.trim(),
          division_id: input.divisionId.trim(),
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

export async function deleteCostCenter(id: string): Promise<ActionResult> {
  try {
    await requirePermission("master-data", "delete");
    // Cek referensi di transaksi (kolom cost_center_id) sebelum hapus.
    const { count, error: countError } = await db().then((s) =>
      s
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("cost_center_id", id),
    );
    if (countError) return { ok: false, error: countError.message };
    if (count !== null && count > 0) {
      return {
        ok: false,
        error: "Cost center sudah dipakai di transaksi — tidak bisa dihapus",
      };
    }

    const { error } = await db().then((s) =>
      s.from("cost_centers").delete().eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
