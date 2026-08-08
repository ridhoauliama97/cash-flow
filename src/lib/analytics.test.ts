import { describe, expect, it } from "vitest";
import {
  aggregateMonthly,
  computeTotals,
  formatMonthLabel,
  type TxnRow,
} from "@/lib/analytics";

const rows: TxnRow[] = [
  { date: "2026-01-05", type: "income", baseAmount: 5_000_000 },
  { date: "2026-01-10", type: "expense", baseAmount: 1_000_000 },
  { date: "2026-02-02", type: "income", baseAmount: 7_500_000 },
  { date: "2026-02-15", type: "expense", baseAmount: 2_500_000 },
  { date: "2026-02-20", type: "income", baseAmount: 1_250_000 },
];

describe("aggregateMonthly", () => {
  it("mengelompokkan income/expense per bulan dan mengurutkan ascending", () => {
    const result = aggregateMonthly(rows);
    expect(result).toEqual([
      { month: "2026-01", income: 5_000_000, expense: 1_000_000 },
      { month: "2026-02", income: 8_750_000, expense: 2_500_000 },
    ]);
  });

  it("menjumlahkan transaksi dalam bulan yang sama", () => {
    const result = aggregateMonthly(rows);
    expect(result[1]!.income).toBe(8_750_000);
  });

  it("menghasilkan array kosong untuk input kosong", () => {
    expect(aggregateMonthly([])).toEqual([]);
  });

  it("mengabaikan baris dengan tanggal tidak valid", () => {
    const bad: TxnRow[] = [{ date: "bukan-tanggal", type: "income", baseAmount: 1 }];
    expect(aggregateMonthly(bad)).toEqual([]);
  });

  it("mengabaikan tipe selain income/expense", () => {
    const unknown: TxnRow[] = [{ date: "2026-01-01", type: "transfer", baseAmount: 1 }];
    expect(aggregateMonthly(unknown)).toEqual([{ month: "2026-01", income: 0, expense: 0 }]);
  });
});

describe("computeTotals", () => {
  it("menghitung total income, expense, dan net", () => {
    const totals = computeTotals([
      { month: "2026-01", income: 5_000_000, expense: 1_000_000 },
      { month: "2026-02", income: 8_750_000, expense: 2_500_000 },
    ]);
    expect(totals).toEqual({ income: 13_750_000, expense: 3_500_000, net: 10_250_000 });
  });

  it("net bisa negatif bila beban lebih besar", () => {
    const totals = computeTotals([{ month: "2026-01", income: 100, expense: 500 }]);
    expect(totals.net).toBe(-400);
  });
});

describe("formatMonthLabel", () => {
  it("memformat label bulan Indonesia", () => {
    expect(formatMonthLabel("2026-08")).toContain("Agu");
    expect(formatMonthLabel("2026-08")).toContain("2026");
  });
});
