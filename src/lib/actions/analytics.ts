"use server";

import { requirePermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  aggregateMonthly,
  computeTotals,
  formatMonthLabel,
  type MonthRow,
  type Totals,
} from "@/lib/analytics";
import { guardErr } from "@/lib/utils/guard-err";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface MonthlySummary {
  rows: Array<{
    month: string;
    label: string;
    income: number;
    expense: number;
    net: number;
  }>;
  totals: Totals;
}

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}

/**
 * Ringkasan bulanan untuk analitik: income vs expense per bulan (IDR).
 * Hanya transaksi yang sudah di-post (status draft/approved — Fase 1
 * mem-post draft+approved, belum ada workflow approval) yang dihitung.
 */
export async function getMonthlySummary(): Promise<
  ActionResult<MonthlySummary>
> {
  try {
    await requirePermission("dashboard", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("transactions")
        .select("date, type, base_amount")
        .in("status", ["draft", "approved"]),
    );
    if (error) return { ok: false, error: error.message };

    const txns = (data ?? []).map((r) => ({
      date: r.date as string,
      type: r.type as string,
      baseAmount: Number(r.base_amount),
    }));
    const rows: MonthRow[] = aggregateMonthly(txns);
    const totals = computeTotals(rows);
    return {
      ok: true,
      data: {
        rows: rows.map((r) => ({
          ...r,
          label: formatMonthLabel(r.month),
          net: r.income - r.expense,
        })),
        totals,
      },
    };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
