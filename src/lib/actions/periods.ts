"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { guardErr } from "@/lib/utils/guard-err";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface PeriodRow {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  closedBy: string | null;
  closedAt: string | null;
  createdAt: string;
}

interface DbRow {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
}

const PATH = "/settings/periods";

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}


function toRow(r: DbRow): PeriodRow {
  return {
    id: r.id,
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
    closedBy: r.closed_by,
    closedAt: r.closed_at,
    createdAt: r.created_at,
  };
}

export async function listPeriods(): Promise<ActionResult<PeriodRow[]>> {
  try {
    await requirePermission("period", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("accounting_periods")
        .select(
          "id, start_date, end_date, status, closed_by, closed_at, created_at",
        )
        .order("start_date", { ascending: false }),
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

export async function createPeriod(input: {
  startDate: string;
  endDate: string;
}): Promise<ActionResult<PeriodRow>> {
  try {
    await requirePermission("period", "create");
    if (new Date(input.endDate) <= new Date(input.startDate)) {
      return { ok: false, error: "Tanggal akhir harus setelah tanggal mulai" };
    }
    const { data, error } = await db().then((s) =>
      s
        .from("accounting_periods")
        .insert({
          start_date: input.startDate,
          end_date: input.endDate,
          status: "open",
        } as never)
        .select(
          "id, start_date, end_date, status, closed_by, closed_at, created_at",
        )
        .single(),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true, data: toRow(data as unknown as DbRow) };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function updatePeriod(
  id: string,
  input: { startDate: string; endDate: string },
): Promise<ActionResult> {
  try {
    await requirePermission("period", "update");
    if (new Date(input.endDate) <= new Date(input.startDate)) {
      return { ok: false, error: "Tanggal akhir harus setelah tanggal mulai" };
    }
    const { error } = await db().then((s) =>
      s
        .from("accounting_periods")
        .update({
          start_date: input.startDate,
          end_date: input.endDate,
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

export async function deletePeriod(id: string): Promise<ActionResult> {
  try {
    await requirePermission("period", "delete");
    const { data: ownerData } = await db().then((s) =>
      s.from("accounting_periods").select("status").eq("id", id).single(),
    );
    const row = ownerData as { status: string } | null;
    if (!row) return { ok: false, error: "Periode tidak ditemukan" };
    if (row.status !== "open") {
      return { ok: false, error: "Hanya periode open yang bisa dihapus" };
    }
    const { error } = await db().then((s) =>
      s.from("accounting_periods").delete().eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function closePeriod(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("period", "approve");
    const { error } = await db().then((s) =>
      s
        .from("accounting_periods")
        .update({
          status: "closed",
          closed_by: user.id,
          closed_at: new Date().toISOString(),
        } as never)
        .eq("id", id)
        .eq("status", "open"),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function reopenPeriod(id: string): Promise<ActionResult> {
  try {
    await requirePermission("period", "approve");
    const { error } = await db().then((s) =>
      s
        .from("accounting_periods")
        .update({ status: "open", closed_by: null, closed_at: null } as never)
        .eq("id", id)
        .eq("status", "closed"),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
