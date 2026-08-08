// Unit test bagian PURE Buku Besar: computeGlRows + glTotals.
// Tanpa DB/React — pola sama dengan src/lib/coa.test.ts / ledger.test.ts.

import { describe, expect, it } from "vitest";
import { computeGlRows, glTotals, type GlRow } from "./general-ledger";

const accounts = [
  { id: "acc-kas", code: "1-1000", name: "Kas", type: "asset", parent_id: null },
  {
    id: "acc-bank",
    code: "1-2000",
    name: "Bank",
    type: "asset",
    parent_id: null,
  },
  {
    id: "acc-pendapatan",
    code: "4-1000",
    name: "Pendapatan Usaha",
    type: "revenue",
    parent_id: null,
  },
  {
    id: "acc-beban",
    code: "5-1000",
    name: "Beban Operasional",
    type: "expense",
    parent_id: null,
  },
];

// Income 5 jt (debit kas / kredit pendapatan) + expense 2,5 jt
// (debit beban / kredit kas) — kas menerima 2 entri untuk menguji agregasi.
const entries = [
  { account_id: "acc-kas", debit: 5_000_000, credit: 0 },
  { account_id: "acc-pendapatan", debit: 0, credit: 5_000_000 },
  { account_id: "acc-beban", debit: 2_500_000, credit: 0 },
  { account_id: "acc-kas", debit: 0, credit: 2_500_000 },
];

describe("computeGlRows", () => {
  it("aggregates debit/credit per account and computes balance (debit - credit)", () => {
    const rows = computeGlRows(entries, accounts);
    expect(rows).toHaveLength(3);

    const kas = rows.find((r) => r.code === "1-1000");
    expect(kas).toMatchObject({ debit: 5_000_000, credit: 2_500_000, balance: 2_500_000 });

    const pendapatan = rows.find((r) => r.code === "4-1000");
    expect(pendapatan).toMatchObject({ debit: 0, credit: 5_000_000, balance: -5_000_000 });

    const beban = rows.find((r) => r.code === "5-1000");
    expect(beban).toMatchObject({ debit: 2_500_000, credit: 0, balance: 2_500_000 });
  });

  it("excludes accounts without journal entries", () => {
    const rows = computeGlRows(entries, accounts);
    // Bank (1-2000) tidak punya jurnal — tidak boleh muncul.
    expect(rows.some((r) => r.code === "1-2000")).toBe(false);
  });

  it("sorts rows by account code", () => {
    const rows = computeGlRows(entries, accounts);
    expect(rows.map((r) => r.code)).toEqual(["1-1000", "4-1000", "5-1000"]);
  });

  it("carries account metadata (id, name, type, parentId)", () => {
    const rows = computeGlRows(entries, accounts);
    expect(rows[0]).toMatchObject({
      accountId: "acc-kas",
      name: "Kas",
      type: "asset",
      parentId: null,
    });
  });

  it("empty entries yield empty rows", () => {
    expect(computeGlRows([], accounts)).toEqual([]);
  });

  it("skips entries whose account is missing from accounts list", () => {
    const rows = computeGlRows(
      [{ account_id: "ghost", debit: 100, credit: 0 }],
      accounts,
    );
    expect(rows).toEqual([]);
  });
});

describe("glTotals", () => {
  it("sums debit and credit across all rows", () => {
    const totals = glTotals(computeGlRows(entries, accounts));
    expect(totals).toEqual({ debit: 7_500_000, credit: 7_500_000 });
  });

  it("balanced ledger: debit total === credit total", () => {
    const totals = glTotals(computeGlRows(entries, accounts));
    expect(totals.debit).toBe(totals.credit);
  });

  it("unequal totals for unbalanced input", () => {
    const rows: GlRow[] = [
      {
        accountId: "a",
        code: "1",
        name: "A",
        type: "asset",
        parentId: null,
        debit: 100,
        credit: 0,
        balance: 100,
      },
      {
        accountId: "b",
        code: "2",
        name: "B",
        type: "asset",
        parentId: null,
        debit: 0,
        credit: 90,
        balance: -90,
      },
    ];
    expect(glTotals(rows)).toEqual({ debit: 100, credit: 90 });
  });

  it("empty rows => zero totals", () => {
    expect(glTotals([])).toEqual({ debit: 0, credit: 0 });
  });

  it("rounds totals to 2 decimals (floating-safe, seperti isBalanced)", () => {
    const rows = computeGlRows(
      [
        { account_id: "a", debit: 0.1, credit: 0 },
        { account_id: "a", debit: 0.2, credit: 0 },
        { account_id: "b", debit: 0, credit: 0.3 },
      ],
      [
        { id: "a", code: "1", name: "A", type: "asset", parent_id: null },
        { id: "b", code: "2", name: "B", type: "asset", parent_id: null },
      ],
    );
    // 0.1 + 0.2 = 0.30000000000000004 di floating point — dibulatkan jadi 0.3.
    expect(glTotals(rows)).toEqual({ debit: 0.3, credit: 0.3 });
  });
});
