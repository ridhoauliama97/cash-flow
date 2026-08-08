"use server";

import { requirePermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  computeGlRows,
  glTotals,
  type GlRow,
  type GlTotals,
} from "@/lib/general-ledger";
import { guardErr } from "@/lib/utils/guard-err";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface AccountingPeriodRow {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface GeneralLedgerData {
  rows: GlRow[];
  totals: GlTotals;
}

interface PeriodDbRow {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface JournalDbRow {
  account_id: string;
  debit: string | number;
  credit: string | number;
  transaction: { date: string } | null;
  account: {
    code: string;
    name: string;
    type: string;
    parent_id: string | null;
  } | null;
}

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}


const toNumber = (v: string | number): number =>
  typeof v === "number" ? v : Number(v);

function toPeriod(r: PeriodDbRow): AccountingPeriodRow {
  return {
    id: r.id,
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
  };
}

/** List periode akuntansi (start_date desc) untuk filter laporan. */
export async function listAccountingPeriods(): Promise<
  ActionResult<AccountingPeriodRow[]>
> {
  try {
    await requirePermission("report", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("accounting_periods")
        .select("id, start_date, end_date, status")
        .order("start_date", { ascending: false }),
    );
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      data: (data ?? []).map((r) => toPeriod(r as PeriodDbRow)),
    };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

/**
 * Buku Besar: journal_entries (join transactions + chart_of_accounts),
 * difilter per periode ATAU rentang tanggal transaksi, lalu diagregasi PURE
 * (computeGlRows + glTotals).
 *
 * STATUS Fase 1 (deviasi sengaja dari acceptance criteria subtask, per
 * keputusan orchestrator): journal_entries hanya berisi transaksi yang SUDAH
 * diposting (postJournal Fase 1 menerima draft+approved — workflow approval
 * penuh belum ada, lihat services/ledger.ts). Semua entri yang ada layak
 * dilaporkan, jadi TIDAK ada filter ulang status transaksi di sini. Perketat
 * ke approved-only saat workflow approval (Fase 2) masuk.
 */
export async function getGeneralLedger(
  periodId?: string | null,
  fromDate?: string | null,
  toDate?: string | null,
): Promise<ActionResult<GeneralLedgerData>> {
  try {
    await requirePermission("report", "read");
    const { data, error } = await db().then((s) => {
      // `transaction` = alias embed relasi journal_entries -> transactions;
      // `!inner` agar entri tanpa transaksi yang terlihat (RLS) tidak bocor.
      let q = s
        .from("journal_entries")
        .select(
          "account_id, debit, credit, transaction:transactions!inner(date), account:chart_of_accounts(code, name, type, parent_id)",
        );
      if (periodId) {
        q = q.eq("transaction.accounting_period_id", periodId);
      } else {
        if (fromDate) q = q.gte("transaction.date", fromDate);
        if (toDate) q = q.lte("transaction.date", toDate);
      }
      return q;
    });
    if (error) return { ok: false, error: error.message };

    const raw = (data ?? []) as unknown as JournalDbRow[];
    // PostgREST mengembalikan kolom DECIMAL sebagai string — normalisasi ke
    // number sebelum masuk fungsi PURE.
    const entries = raw.map((r) => ({
      account_id: r.account_id,
      debit: toNumber(r.debit),
      credit: toNumber(r.credit),
    }));

    // Data akun di-dedupe dari hasil join (satu chart_of_accounts per entri).
    const accountById = new Map<
      string,
      { code: string; name: string; type: string; parent_id: string | null }
    >();
    for (const r of raw) {
      if (r.account) accountById.set(r.account_id, r.account);
    }
    const accounts = [...accountById.entries()].map(([id, a]) => ({
      id,
      ...a,
    }));

    const rows = computeGlRows(entries, accounts);
    return { ok: true, data: { rows, totals: glTotals(rows) } };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
