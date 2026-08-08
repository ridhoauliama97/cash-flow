"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { guardErr } from "@/lib/utils/guard-err";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  currency: string;
  isActive: boolean;
}

export interface ProductInput {
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  currency: string;
  isActive: boolean;
}

const PATH = "/master/products";

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}

function toRow(r: DbRow): ProductRow {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    sku: r.sku,
    price: Number(r.price),
    currency: r.currency,
    isActive: r.is_active,
  };
}

interface DbRow {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  currency: string;
  is_active: boolean;
}

function validateProduct(input: ProductInput): string | null {
  if (!input.name.trim()) return "Nama produk wajib diisi";
  if (input.name.trim().length > 200)
    return "Nama produk maksimal 200 karakter";
  if (input.price < 0) return "Harga tidak boleh negatif";
  if (!input.currency.trim()) return "Mata uang wajib diisi";
  return null;
}

export async function listProducts(): Promise<ActionResult<ProductRow[]>> {
  try {
    await requirePermission("master-data", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("products")
        .select("id, name, description, sku, price, currency, is_active")
        .order("name"),
    );
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      data: (data ?? []).map((r) => toRow(r as unknown as DbRow)),
    };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function createProduct(
  input: ProductInput,
): Promise<ActionResult> {
  try {
    await requirePermission("master-data", "create");
    const invalid = validateProduct(input);
    if (invalid) return { ok: false, error: invalid };

    const { error } = await db().then((s) =>
      s.from("products").insert({
        created_at: new Date().toISOString(),

        id: crypto.randomUUID(),
        name: input.name.trim(),
        description: input.description?.trim() || null,
        sku: input.sku?.trim() || null,
        price: input.price,
        currency: input.currency.trim(),
        is_active: input.isActive,
        updated_at: new Date().toISOString(),
      } as never),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<ActionResult> {
  try {
    await requirePermission("master-data", "update");
    const invalid = validateProduct(input);
    if (invalid) return { ok: false, error: invalid };

    const { error } = await db().then((s) =>
      s
        .from("products")
        .update({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          sku: input.sku?.trim() || null,
          price: input.price,
          currency: input.currency.trim(),
          is_active: input.isActive,
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

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    await requirePermission("master-data", "delete");
    const { error } = await db().then((s) =>
      s.from("products").delete().eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
