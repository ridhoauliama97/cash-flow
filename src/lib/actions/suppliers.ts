"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  validateSupplier,
  type SupplierInput,
  type SupplierRow,
} from "@/lib/suppliers";
import { guardErr } from "@/lib/utils/guard-err";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const PATH = "/master/suppliers";

interface DbRow {
  id: string;
  name: string;
  contact_info: string | null;
}

function toRow(r: DbRow): SupplierRow {
  return { id: r.id, name: r.name, contactInfo: r.contact_info };
}

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}


/** List semua supplier. */
export async function listSuppliers(): Promise<ActionResult<SupplierRow[]>> {
  try {
    await requirePermission("master-data", "read");
    const { data, error } = await db().then((s) =>
      s.from("suppliers").select("id, name, contact_info"),
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []).map(toRow) };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function createSupplier(
  input: SupplierInput,
): Promise<ActionResult> {
  try {
    await requirePermission("master-data", "create");
    const invalid = validateSupplier(input);
    if (invalid) return { ok: false, error: invalid };

    const { error } = await db().then((s) =>
      s.from("suppliers").insert({
        name: input.name.trim(),
        contact_info: input.contactInfo.trim() || null,
      } as never),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function updateSupplier(
  id: string,
  input: SupplierInput,
): Promise<ActionResult> {
  try {
    await requirePermission("master-data", "update");
    const invalid = validateSupplier(input);
    if (invalid) return { ok: false, error: invalid };

    const { error } = await db().then((s) =>
      s
        .from("suppliers")
        .update({
          name: input.name.trim(),
          contact_info: input.contactInfo.trim() || null,
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

export async function deleteSupplier(id: string): Promise<ActionResult> {
  try {
    await requirePermission("master-data", "delete");
    // Catatan: tabel transactions TIDAK punya kolom supplier_id — tidak ada
    // cek "supplier sudah dipakai" yang mungkin dilakukan; error FK (jika
    // muncul di masa depan) diserahkan sebagai pesan error apa adanya.
    const { error } = await db().then((s) =>
      s.from("suppliers").delete().eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
