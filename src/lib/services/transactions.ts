// Service transaksi kas manual (Fase 1) — validasi PURE + create ke DB.
// UI form & posting jurnal menyusul di subtask lain: di sini hanya menulis
// baris accounting.transactions (status 'draft', source 'manual') dengan
// konversi multi-currency ke IDR + rate_snapshot untuk laporan historis.
// Server-only (dipanggil dari server actions / route handlers); fungsi
// validasi murni diuji di src/lib/transactions.test.ts.

import { requirePermission, PermissionError } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  convert,
  ensureRates,
  ratesForHome,
  type Rates,
} from "@/lib/currency-rates";
import {
  CURRENCIES,
  TRANSACTION_TYPES_FASE1,
  type Currency,
  type TransactionTypeFase1,
} from "@/types/ledger";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface TransactionDraft {
  type: string;
  date: string; // ISO date
  description: string;
  amount: number;
  currency: string;
  costCenterId?: string | null;
}

export interface OpenPeriod {
  startDate: string;
  endDate: string;
}

export interface ValidateOptions {
  openPeriods: OpenPeriod[];
  costCenterIds: ReadonlySet<string>;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

function inPeriod(date: Date, p: OpenPeriod): boolean {
  const start = new Date(p.startDate).getTime();
  const end = new Date(p.endDate).getTime();
  return date.getTime() >= start && date.getTime() <= end;
}

/**
 * Validasi PURE (tanpa DB/React). Kembalikan pesan error, atau null bila valid.
 * openPeriods = periode akuntansi berstatus 'open'; tanggal draft harus berada
 * di dalam minimal satu periode. costCenterId (bila diisi) harus ada di set.
 */
export function validateTransactionDraft(
  draft: TransactionDraft,
  opts: ValidateOptions,
): string | null {
  const { type, date, description, amount, currency, costCenterId } = draft;

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return "Jumlah harus lebih besar dari 0";
  }
  if (!TRANSACTION_TYPES_FASE1.includes(type as TransactionTypeFase1)) {
    return `Tipe transaksi harus salah satu dari: ${TRANSACTION_TYPES_FASE1.join(", ")}`;
  }
  if (!CURRENCIES.includes(currency as Currency)) {
    return `Mata uang harus salah satu dari: ${CURRENCIES.join(", ")}`;
  }
  if (!description.trim()) return "Deskripsi wajib diisi";

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Tanggal tidak valid";
  if (!opts.openPeriods.some((p) => inPeriod(d, p))) {
    return "Tanggal di luar periode akuntansi yang terbuka";
  }
  if (costCenterId && !opts.costCenterIds.has(costCenterId)) {
    return "Cost center tidak valid";
  }
  return null;
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
 * Buat transaksi kas manual:
 * 1. Guard permission "transaction/create".
 * 2. Ambil periode 'open' + cost center (RLS aktif), lalu validasi draft.
 * 3. Kurs: ensureRates("USD") → rebase ke IDR; base_amount = konversi amount,
 *    rate_snapshot = kurs IDR-per-1-unit-currency yang dipakai
 *    (base_amount === amount saat currency === "IDR" karena convert short-circuit).
 * 4. Insert status 'draft', source 'manual', created_by = user pemanggil,
 *    accounting_period_id = periode open pertama yang memuat tanggal.
 */
export async function createTransaction(
  draft: TransactionDraft,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("transaction", "create");

    const [periodsRes, costCentersRes] = await Promise.all([
      db().then((s) =>
        s
          .from("accounting_periods")
          .select("id, start_date, end_date")
          .eq("status", "open")
          .order("start_date", { ascending: true }),
      ),
      db().then((s) => s.from("cost_centers").select("id")),
    ]);
    if (periodsRes.error)
      return { ok: false, error: guardErr(periodsRes.error) };
    if (costCentersRes.error)
      return { ok: false, error: guardErr(costCentersRes.error) };

    const periodRows = (periodsRes.data ?? []) as Array<{
      id: string;
      start_date: string;
      end_date: string;
    }>;
    const openPeriods: OpenPeriod[] = periodRows.map((p) => ({
      startDate: p.start_date,
      endDate: p.end_date,
    }));
    const costCenterIds = new Set(
      ((costCentersRes.data ?? []) as Array<{ id: string }>).map((c) => c.id),
    );

    const invalid = validateTransactionDraft(draft, {
      openPeriods,
      costCenterIds,
    });
    if (invalid) return { ok: false, error: invalid };

    // Kurs live (bila CURRENCYAPI_KEY ada) atau static fallback, base IDR.
    const idrRates: Rates = ratesForHome(await ensureRates("USD"), "IDR");
    const currency = draft.currency as Currency; // lolos validasi di atas
    const baseAmount = round2(convert(draft.amount, currency, "IDR", idrRates));
    const rateSnapshot = round2(1 / idrRates[currency]); // IDR per 1 unit currency

    const txnDate = new Date(draft.date).getTime();
    const matchingPeriod = periodRows.find((p) => {
      const start = new Date(p.start_date).getTime();
      const end = new Date(p.end_date).getTime();
      return txnDate >= start && txnDate <= end;
    });

    const { data: inserted, error } = await db().then((s) =>
      s
        .from("transactions")
        .insert({
          type: draft.type,
          date: draft.date,
          description: draft.description.trim(),
          amount: draft.amount,
          currency: draft.currency,
          base_amount: baseAmount,
          rate_snapshot: rateSnapshot,
          cost_center_id: draft.costCenterId ?? null,
          created_by: user.id,
          status: "draft",
          source: "manual",
          accounting_period_id: matchingPeriod?.id ?? null,
        } as never)
        .select("id")
        .single(),
    );
    if (error) return { ok: false, error: guardErr(error) };
    return { ok: true, data: { id: inserted?.id as string } };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export interface TransactionUpdate extends TransactionDraft {
  id: string;
}

export async function updateTransaction(
  update: TransactionUpdate,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("transaction", "update");

    const periodsRes = await db().then((s) =>
      s
        .from("accounting_periods")
        .select("id, start_date, end_date")
        .eq("status", "open")
        .order("start_date", { ascending: true }),
    );
    if (periodsRes.error)
      return { ok: false, error: guardErr(periodsRes.error) };
    const periodRows = (periodsRes.data ?? []) as Array<{
      id: string;
      start_date: string;
      end_date: string;
    }>;
    const openPeriods: OpenPeriod[] = periodRows.map((p) => ({
      startDate: p.start_date,
      endDate: p.end_date,
    }));

    const costCentersRes = await db().then((s) =>
      s.from("cost_centers").select("id"),
    );
    if (costCentersRes.error)
      return { ok: false, error: guardErr(costCentersRes.error) };
    const costCenterIds = new Set(
      ((costCentersRes.data ?? []) as Array<{ id: string }>).map((c) => c.id),
    );

    const invalid = validateTransactionDraft(update, {
      openPeriods,
      costCenterIds,
    });
    if (invalid) return { ok: false, error: invalid };

    const { error: ownerErr } = await db().then((s) =>
      s.from("transactions").select("created_by").eq("id", update.id).single(),
    );
    if (ownerErr) return { ok: false, error: guardErr(ownerErr) };

    const { error } = await db().then((s) =>
      s
        .from("transactions")
        .update({
          type: update.type,
          date: update.date,
          description: update.description.trim(),
          amount: update.amount,
          currency: update.currency,
          cost_center_id: update.costCenterId ?? null,
        } as never)
        .eq("id", update.id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    return { ok: true, data: { id: update.id } };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
