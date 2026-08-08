"use server";

import { revalidatePath } from "next/cache";
import {
  PermissionError,
  requireCanModifyData,
  requirePermission,
} from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { createTransaction } from "@/lib/services/transactions";
import type { TransactionDraft } from "@/lib/services/transactions";
import type {
  Currency,
  TransactionStatus,
  TransactionTypeFase1,
} from "@/types/ledger";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const PATH = "/transactions";

export interface TransactionRow {
  id: string;
  type: TransactionTypeFase1;
  date: string;
  description: string;
  amount: number;
  currency: Currency;
  baseAmount: number;
  costCenterId: string | null;
  costCenterName: string | null;
  status: TransactionStatus;
  createdBy: string;
  createdByName: string | null;
}

interface DbRow {
  id: string;
  type: string;
  date: string;
  description: string;
  amount: string | number;
  currency: string;
  base_amount: string | number;
  cost_center_id: string | null;
  status: string;
  created_by: string;
  cost_centers: Array<{ name: string }> | null;
  users: Array<{ name: string }> | null;
}

const toNumber = (v: string | number): number =>
  typeof v === "number" ? v : Number(v);

function toRow(r: DbRow): TransactionRow {
  return {
    id: r.id,
    type: r.type as TransactionTypeFase1,
    date: r.date,
    description: r.description,
    amount: toNumber(r.amount),
    currency: r.currency as Currency,
    baseAmount: toNumber(r.base_amount),
    costCenterId: r.cost_center_id,
    costCenterName: r.cost_centers?.[0]?.name ?? null,
    status: r.status as TransactionStatus,
    createdBy: r.created_by,
    createdByName: r.users?.[0]?.name ?? null,
  };
}

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}

function guardErr(e: unknown): string {
  if (e instanceof PermissionError) return e.message;
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("23505")) return "Data sudah ada";
  return msg;
}

/**
 * List transaksi kas (date desc) + nama cost center & pembuat untuk display.
 * Nested select memakai relasi FK (cost_centers, users) seperti resolveRoles;
 * baris yang di-filter RLS (mis. nama user lain untuk staff) jadi null.
 */
export async function listTransactions(): Promise<ActionResult<TransactionRow[]>> {
  try {
    await requirePermission("transaction", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("transactions")
        .select(
          "id, type, date, description, amount, currency, base_amount, cost_center_id, status, created_by, cost_centers(name), users(name)",
        )
        .order("date", { ascending: false }),
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []).map((r) => toRow(r as DbRow)) };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

/**
 * Wrapper "use server" agar dialog client bisa memanggil createTransaction
 * (service ada di file non-"use server" — tidak bisa dipanggil langsung
 * dari client). Service menangani guard permission + validasi + insert.
 */
export async function createTransactionAction(
  draft: TransactionDraft,
): Promise<ActionResult<{ id: string }>> {
  return createTransaction(draft);
}

/** Hapus transaksi: hanya status 'draft', plus super admin guard (service layer). */
export async function deleteTransaction(id: string): Promise<ActionResult> {
  try {
    await requirePermission("transaction", "delete");
    const { data, error } = await db().then((s) =>
      s.from("transactions").select("id, status, created_by").eq("id", id),
    );
    if (error) return { ok: false, error: error.message };
    const row = (data?.[0] ?? null) as {
      id: string;
      status: string;
      created_by: string;
    } | null;
    if (!row) return { ok: false, error: "Transaksi tidak ditemukan" };
    if (row.status !== "draft") {
      return { ok: false, error: "Hanya transaksi berstatus draft yang bisa dihapus" };
    }
    // Super admin protection: data milik Super Admin hanya bisa dihapus
    // oleh Super Admin (guard service layer, meniru trigger DB).
    await requireCanModifyData(row.created_by);
    const { error: delError } = await db().then((s) =>
      s.from("transactions").delete().eq("id", id),
    );
    if (delError) return { ok: false, error: guardErr(delError) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
