"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { guardErr } from "@/lib/utils/guard-err";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface PendingApprovalRow {
  id: string;
  type: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  baseAmount: number;
  status: string;
  createdByName: string | null;
  costCenterName: string | null;
  createdAt: string;
}

interface DbRow {
  id: string;
  type: string;
  date: string;
  description: string;
  amount: string | number;
  currency: string;
  base_amount: string | number;
  status: string;
  created_by: string;
  users: { name: string | null } | null;
  cost_centers: { name: string } | null;
  created_at: string;
}

const PATH = "/approvals";

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}

const toNumber = (v: string | number): number =>
  typeof v === "number" ? v : Number(v);

function toRow(r: DbRow): PendingApprovalRow {
  return {
    id: r.id,
    type: r.type,
    date: r.date,
    description: r.description,
    amount: toNumber(r.amount),
    currency: r.currency,
    baseAmount: toNumber(r.base_amount),
    status: r.status,
    createdByName: r.users?.name ?? null,
    costCenterName: r.cost_centers?.name ?? null,
    createdAt: r.created_at,
  };
}

export async function listPendingApprovals(): Promise<
  ActionResult<PendingApprovalRow[]>
> {
  try {
    await requirePermission("transaction", "approve");
    const { data, error } = await db().then((s) =>
      s
        .from("transactions")
        .select(
          "id, type, date, description, amount, currency, base_amount, status, created_by, users!transactions_created_by_fkey(name), cost_centers(name), created_at",
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    );
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      data: ((data ?? []) as unknown as DbRow[]).map(toRow),
    };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function submitForApproval(id: string): Promise<ActionResult> {
  try {
    await requirePermission("transaction", "update");
    const { data, error } = await db().then((s) =>
      s.from("transactions").select("status, created_by").eq("id", id).single(),
    );
    if (error) return { ok: false, error: error.message };
    const row = data as { status: string; created_by: string } | null;
    if (!row) return { ok: false, error: "Transaksi tidak ditemukan" };
    if (row.status !== "draft") {
      return { ok: false, error: "Hanya transaksi draft yang bisa diajukan" };
    }
    const { error: updError } = await db().then((s) =>
      s
        .from("transactions")
        .update({ status: "pending" } as never)
        .eq("id", id),
    );
    if (updError) return { ok: false, error: updError.message };
    revalidatePath("/transactions");
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function approveTransaction(
  id: string,
  note?: string,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("transaction", "approve");

    const { data, error } = await db().then((s) =>
      s.from("transactions").select("status, created_by").eq("id", id).single(),
    );
    if (error) return { ok: false, error: error.message };
    const row = data as { status: string; created_by: string } | null;
    if (!row) return { ok: false, error: "Transaksi tidak ditemukan" };
    if (row.status !== "pending") {
      return {
        ok: false,
        error: "Hanya transaksi pending yang bisa disetujui",
      };
    }

    const { error: insError } = await db().then((s) =>
      s.from("approvals").insert({
        created_at: new Date().toISOString(),

        id: crypto.randomUUID(),
        transaction_id: id,
        approver_id: user.id,
        level: 1,
        status: "approved",
        note: note ?? null,
        approved_at: new Date().toISOString(),
      } as never),
    );
    if (insError) return { ok: false, error: insError.message };

    const { error: updError } = await db().then((s) =>
      s
        .from("transactions")
        .update({ status: "approved" } as never)
        .eq("id", id),
    );
    if (updError) return { ok: false, error: updError.message };

    revalidatePath("/transactions");
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function rejectTransaction(
  id: string,
  note?: string,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("transaction", "approve");

    const { data, error } = await db().then((s) =>
      s.from("transactions").select("status").eq("id", id).single(),
    );
    if (error) return { ok: false, error: error.message };
    const row = data as { status: string } | null;
    if (!row) return { ok: false, error: "Transaksi tidak ditemukan" };
    if (row.status !== "pending") {
      return { ok: false, error: "Hanya transaksi pending yang bisa ditolak" };
    }

    const { error: insError } = await db().then((s) =>
      s.from("approvals").insert({
        created_at: new Date().toISOString(),

        id: crypto.randomUUID(),
        transaction_id: id,
        approver_id: user.id,
        level: 1,
        status: "rejected",
        note: note ?? null,
        approved_at: new Date().toISOString(),
      } as never),
    );
    if (insError) return { ok: false, error: insError.message };

    const { error: updError } = await db().then((s) =>
      s
        .from("transactions")
        .update({ status: "rejected" } as never)
        .eq("id", id),
    );
    if (updError) return { ok: false, error: updError.message };

    revalidatePath("/transactions");
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
