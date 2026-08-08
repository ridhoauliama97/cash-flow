// Service Buku Besar (Fase 1) — posting jurnal double-entry.
//
// Bagian PURE (buildJournalEntries, isBalanced) diuji di src/lib/ledger.test.ts
// tanpa DB/React. Server function postJournal memakai Prisma (driver adapter
// pg, pola konstruksi prisma/seed.ts) untuk membaca transaksi + akun, lalu
// menulis semua baris journal_entries dalam SATU interactive transaction
// (ALL-OR-NOTHING). Server-only: dipanggil dari src/lib/actions/ledger.ts.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { requirePermission, PermissionError } from "@/lib/rbac";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface JournalEntryDraft {
  accountId: string;
  debit: number;
  credit: number;
  description: string;
}

/** Input builder PURE: transaksi sudah dinormalisasi ke IDR (base_amount). */
export interface LedgerTransaction {
  id: string;
  type: string; // "income" | "expense"
  baseAmount: number; // IDR
  description: string;
}

/**
 * Akun default hasil seed (lihat prisma/seed.ts):
 * Kas 1-1000, Bank 1-2000, Pendapatan Usaha 4-1000, Beban Operasional 5-1000.
 * Semua opsional — fungsi PURE memutuskan akun mana yang wajib ada per tipe,
 * jadi kegagalan mapping bisa diuji tanpa cast.
 */
export interface LedgerAccountMap {
  cash?: { id: string };
  bank?: { id: string };
  revenue?: { id: string };
  expense?: { id: string };
}

/** Error akun belum dipetakan / input tidak valid — dipetakan caller ke pesan user. */
export class LedgerBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerBuildError";
  }
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Bangun pasangan jurnal double-entry (PURE):
 * - income  → debit kas/bank, kredit pendapatan
 * - expense → debit beban, kredit kas/bank
 * Sisi kas memakai akun `cash` bila ada, else `bank`. Jumlah = baseAmount (IDR)
 * — tanpa konversi di sini, jurnal selalu IDR. Kedua baris memakai deskripsi
 * transaksi. Akun wajib hilang / tipe tak dikenal => throw LedgerBuildError
 * (tidak ada entry parsial yang bisa bocor).
 */
export function buildJournalEntries(
  transaction: LedgerTransaction,
  accounts: LedgerAccountMap,
): JournalEntryDraft[] {
  const { type, baseAmount, description } = transaction;

  if (type !== "income" && type !== "expense") {
    throw new LedgerBuildError(`Tipe transaksi tidak dikenal: ${type}`);
  }
  if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
    throw new LedgerBuildError("Jumlah (base_amount) tidak valid");
  }

  const cashAccountId = accounts.cash?.id ?? accounts.bank?.id;
  if (!cashAccountId) {
    throw new LedgerBuildError("Akun kas/bank belum dipetakan");
  }

  if (type === "income") {
    const revenueId = accounts.revenue?.id;
    if (!revenueId) {
      throw new LedgerBuildError("Akun pendapatan belum dipetakan");
    }
    return [
      { accountId: cashAccountId, debit: baseAmount, credit: 0, description },
      { accountId: revenueId, debit: 0, credit: baseAmount, description },
    ];
  }

  const expenseId = accounts.expense?.id;
  if (!expenseId) {
    throw new LedgerBuildError("Akun beban belum dipetakan");
  }
  return [
    { accountId: expenseId, debit: baseAmount, credit: 0, description },
    { accountId: cashAccountId, debit: 0, credit: baseAmount, description },
  ];
}

/** Cek keseimbangan debit == kredit (floating-safe: round ke 2 desimal). */
export function isBalanced(entries: readonly JournalEntryDraft[]): boolean {
  const debit = round2(entries.reduce((sum, e) => sum + e.debit, 0));
  const credit = round2(entries.reduce((sum, e) => sum + e.credit, 0));
  return debit === credit;
}

// Prisma client singleton (driver adapter WAJIB — generated client tanpa
// datasource url). Konstruksi ditunda sampai pemakaian pertama agar modul
// tetap aman diimpor unit test (yang hanya memakai bagian PURE) dan tidak
// bocor koneksi saat dev hot-reload.
const globalForPrisma = globalThis as unknown as {
  ledgerPrisma?: PrismaClient;
};

function getPrisma(): PrismaClient {
  if (!globalForPrisma.ledgerPrisma) {
    globalForPrisma.ledgerPrisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }
  return globalForPrisma.ledgerPrisma;
}

function guardErr(e: unknown): string {
  if (e instanceof PermissionError) return e.message;
  return e instanceof Error ? e.message : String(e);
}

// Kode akun default hasil seed (lihat prisma/seed.ts).
const CODE_CASH = "1-1000";
const CODE_BANK = "1-2000";
const CODE_REVENUE = "4-1000";
const CODE_EXPENSE = "5-1000";

/**
 * Posting jurnal untuk satu transaksi (double-entry, ALL-OR-NOTHING):
 * 1. Guard permission "ledger/create".
 * 2. Transaksi harus ada; idempoten: jurnal sudah ada → ok "already posted".
 * 3. Baca akun default (Kas/Bank/Pendapatan/Beban) → buildJournalEntries;
 *    akun kurang → error "Akun belum dipetakan".
 * 4. Balance check (debit == kredit) → insert semua baris dalam satu
 *    interactive transaction; kegagalan mana pun → rollback semua.
 *
 * STATUS Fase 1: workflow approval penuh belum ada (UI membuat 'draft',
 * approval penuh di Fase 2) — transaksi 'draft' & 'approved' diterima, yang
 * lain ('pending'/'rejected') ditolak. Deviasi sengaja agar fitur terpakai
 * di Fase 1; perketat ke 'approved'-only saat approval masuk.
 */
export async function postJournal(
  transactionId: string,
): Promise<ActionResult<{ alreadyPosted: boolean }>> {
  try {
    await requirePermission("ledger", "create");
    const prisma = getPrisma();

    const txn = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    if (!txn) return { ok: false, error: "Transaksi tidak ditemukan" };

    if (txn.status !== "draft" && txn.status !== "approved") {
      return { ok: false, error: "Transaksi belum siap diposting" };
    }

    const existingCount = await prisma.journalEntry.count({
      where: { transactionId },
    });
    if (existingCount > 0) {
      return { ok: true, data: { alreadyPosted: true } };
    }

    const rows = await prisma.chartOfAccount.findMany({
      where: {
        code: { in: [CODE_CASH, CODE_BANK, CODE_REVENUE, CODE_EXPENSE] },
      },
      select: { id: true, code: true },
    });
    const byCode = new Map(rows.map((r) => [r.code, r.id] as const));
    const accountMap: LedgerAccountMap = {};
    const cashId = byCode.get(CODE_CASH);
    const bankId = byCode.get(CODE_BANK);
    const revenueId = byCode.get(CODE_REVENUE);
    const expenseId = byCode.get(CODE_EXPENSE);
    if (cashId) accountMap.cash = { id: cashId };
    if (bankId) accountMap.bank = { id: bankId };
    if (revenueId) accountMap.revenue = { id: revenueId };
    if (expenseId) accountMap.expense = { id: expenseId };

    let entries: JournalEntryDraft[];
    try {
      entries = buildJournalEntries(
        {
          id: txn.id,
          type: txn.type,
          baseAmount: txn.baseAmount.toNumber(),
          description: txn.description,
        },
        accountMap,
      );
    } catch (e) {
      if (e instanceof LedgerBuildError) {
        return {
          ok: false,
          error:
            "Akun belum dipetakan: pastikan akun Kas, Bank, Pendapatan, dan Beban ada di chart of accounts",
        };
      }
      throw e;
    }

    if (!isBalanced(entries)) {
      return { ok: false, error: "Tidak balance: debit ≠ kredit" };
    }

    // ALL-OR-NOTHING: salah satu baris gagal → semua di-rollback.
    await prisma.$transaction(async (tx) => {
      await tx.journalEntry.createMany({
        data: entries.map((e) => ({
          transactionId: txn.id,
          accountId: e.accountId,
          debit: e.debit,
          credit: e.credit,
          description: e.description,
        })),
      });
      await tx.transaction.update({
        where: { id: txn.id },
        data: { status: "posted" },
      });
    });

    return { ok: true, data: { alreadyPosted: false } };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
