// Unit test bagian PURE Buku Besar: buildJournalEntries + isBalanced.
// Tanpa DB/React — pola sama dengan src/lib/coa.test.ts / transactions.test.ts
// (impor modul service, tidak menyentuh Prisma maupun UI).

import { describe, expect, it } from "vitest";
import {
  buildJournalEntries,
  isBalanced,
  LedgerBuildError,
  type JournalEntryDraft,
  type LedgerAccountMap,
  type LedgerTransaction,
} from "@/lib/services/ledger";

const accounts: LedgerAccountMap = {
  cash: { id: "acc-kas" },
  bank: { id: "acc-bank" },
  revenue: { id: "acc-pendapatan" },
  expense: { id: "acc-beban" },
};

const income: LedgerTransaction = {
  id: "txn-1",
  type: "income",
  baseAmount: 5_000_000,
  description: "Penjualan tunai",
};

const expense: LedgerTransaction = {
  id: "txn-2",
  type: "expense",
  baseAmount: 2_500_000,
  description: "Pembelian ATK",
};

describe("buildJournalEntries — income", () => {
  it("debit akun kas + kredit akun pendapatan, jumlah = baseAmount", () => {
    const entries = buildJournalEntries(income, accounts);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      accountId: "acc-kas",
      debit: 5_000_000,
      credit: 0,
      description: "Penjualan tunai",
    });
    expect(entries[1]).toEqual({
      accountId: "acc-pendapatan",
      debit: 0,
      credit: 5_000_000,
      description: "Penjualan tunai",
    });
  });
});

describe("buildJournalEntries — expense", () => {
  it("debit akun beban + kredit akun kas, jumlah = baseAmount", () => {
    const entries = buildJournalEntries(expense, accounts);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      accountId: "acc-beban",
      debit: 2_500_000,
      credit: 0,
      description: "Pembelian ATK",
    });
    expect(entries[1]).toEqual({
      accountId: "acc-kas",
      debit: 0,
      credit: 2_500_000,
      description: "Pembelian ATK",
    });
  });
});

describe("isBalanced", () => {
  it("debit total = kredit total untuk income dan expense", () => {
    expect(isBalanced(buildJournalEntries(income, accounts))).toBe(true);
    expect(isBalanced(buildJournalEntries(expense, accounts))).toBe(true);
  });

  it("false bila debit ≠ kredit", () => {
    const unbalanced: JournalEntryDraft[] = [
      { accountId: "a", debit: 100, credit: 0, description: "x" },
      { accountId: "b", debit: 0, credit: 99, description: "x" },
    ];
    expect(isBalanced(unbalanced)).toBe(false);
  });
});

describe("buildJournalEntries — fallback kas → bank", () => {
  it("income tanpa akun kas memakai akun bank", () => {
    const entries = buildJournalEntries(income, {
      bank: accounts.bank,
      revenue: accounts.revenue,
      expense: accounts.expense,
    });
    expect(entries[0].accountId).toBe("acc-bank");
    expect(entries[0].debit).toBe(5_000_000);
    expect(entries[1].accountId).toBe("acc-pendapatan");
    expect(entries[1].credit).toBe(5_000_000);
  });

  it("expense tanpa akun kas memakai akun bank", () => {
    const entries = buildJournalEntries(expense, {
      bank: accounts.bank,
      revenue: accounts.revenue,
      expense: accounts.expense,
    });
    expect(entries[0].accountId).toBe("acc-beban");
    expect(entries[1].accountId).toBe("acc-bank");
    expect(entries[1].credit).toBe(2_500_000);
  });
});

describe("buildJournalEntries — akun wajib hilang (no partial entries)", () => {
  it("income tanpa akun pendapatan → throw LedgerBuildError", () => {
    expect(() =>
      buildJournalEntries(income, {
        cash: accounts.cash,
        bank: accounts.bank,
        expense: accounts.expense,
      }),
    ).toThrow(LedgerBuildError);
  });

  it("expense tanpa akun beban → throw LedgerBuildError", () => {
    expect(() =>
      buildJournalEntries(expense, {
        cash: accounts.cash,
        bank: accounts.bank,
        revenue: accounts.revenue,
      }),
    ).toThrow(LedgerBuildError);
  });

  it("kas dan bank keduanya hilang → throw LedgerBuildError", () => {
    expect(() =>
      buildJournalEntries(income, {
        revenue: accounts.revenue,
        expense: accounts.expense,
      }),
    ).toThrow(/kas/i);
  });

  it("tipe transaksi tidak dikenal → throw LedgerBuildError", () => {
    expect(() =>
      buildJournalEntries({ ...income, type: "transfer" }, accounts),
    ).toThrow(LedgerBuildError);
  });
});
