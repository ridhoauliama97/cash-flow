"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, PermissionError } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  validateCustomer,
  type CustomerInput,
  type CustomerRow,
} from "@/lib/customers";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const PATH = "/master/customers";

interface DbRow {
  id: string;
  name: string;
  contact_info: string | null;
}

function toRow(r: DbRow): CustomerRow {
  return { id: r.id, name: r.name, contactInfo: r.contact_info };
}

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}

function guardErr(e: unknown): string {
  if (e instanceof PermissionError) return e.message;
  return e instanceof Error ? e.message : String(e);
}

/** List semua customer. */
export async function listCustomers(): Promise<ActionResult<CustomerRow[]>> {
  try {
    await requirePermission("master-data", "read");
    const { data, error } = await db().then((s) =>
      s.from("customers").select("id, name, contact_info"),
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []).map(toRow) };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function createCustomer(input: CustomerInput): Promise<ActionResult> {
  try {
    await requirePermission("master-data", "create");
    const invalid = validateCustomer(input);
    if (invalid) return { ok: false, error: invalid };

    const { error } = await db().then((s) =>
      s.from("customers").insert({
        name: input.name.trim(),
        contact_info: input.contactInfo?.trim() || null,
      } as never),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function updateCustomer(
  id: string,
  input: CustomerInput,
): Promise<ActionResult> {
  try {
    await requirePermission("master-data", "update");
    const invalid = validateCustomer(input);
    if (invalid) return { ok: false, error: invalid };

    const { error } = await db().then((s) =>
      s
        .from("customers")
        .update({
          name: input.name.trim(),
          contact_info: input.contactInfo?.trim() || null,
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

export async function deleteCustomer(id: string): Promise<ActionResult> {
  try {
    await requirePermission("master-data", "delete");
    // Catatan: tabel transactions TIDAK punya kolom customer_id — tidak ada
    // cek "customer sudah dipakai" yang mungkin dilakukan; error FK (jika
    // muncul di masa depan) diserahkan sebagai pesan error apa adanya.
    const { error } = await db().then((s) =>
      s.from("customers").delete().eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
