import { describe, expect, it } from "vitest";
import { burnMetrics } from "@/lib/analytics/burn";
import type { Transaction } from "@/types";

function tx(date: string, type: "revenue" | "expense", baseAmount: number): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    date,
    type,
    description: `${type} ${date}`,
    amount: baseAmount,
    currency: "USD",
    baseAmount,
    category: type === "revenue" ? "Software" : "Salaries",
    createdAt: `${date}T00:00:00Z`,
  };
}

describe("burnMetrics", () => {
  it("computes gross and net burn from the last N months", () => {
    const txs = [
      tx("2026-01-10", "revenue", 100),
      tx("2026-01-15", "expense", 40),
      tx("2026-02-10", "revenue", 120),
      tx("2026-02-15", "expense", 50),
    ];
    const m = burnMetrics(txs, 500, 6);
    expect(m.grossBurn).toBe(45); // (40 + 50) / 2
    expect(m.netBurn).toBe(65); // ((100-40) + (120-50)) / 2
    expect(m.cashPosition).toBe(500 + 100 - 40 + 120 - 50);
    expect(m.windowMonths).toBe(2);
    expect(m.runwayMonths).toBeCloseTo(m.cashPosition / 45);
    expect(m.runwayDays).toBe(Math.floor(m.runwayMonths! * 30.44));
  });

  it("returns null runway when there are no expenses", () => {
    const m = burnMetrics([tx("2026-01-10", "revenue", 100)], 1000);
    expect(m.grossBurn).toBe(0);
    expect(m.runwayMonths).toBeNull();
    expect(m.runwayDays).toBeNull();
  });

  it("handles an empty ledger", () => {
    const m = burnMetrics([], 0);
    expect(m.grossBurn).toBe(0);
    expect(m.netBurn).toBe(0);
    expect(m.cashPosition).toBe(0);
    expect(m.runwayDays).toBeNull();
  });

  it("respects a smaller window", () => {
    const txs = [
      tx("2026-01-15", "expense", 30),
      tx("2026-02-15", "expense", 60),
      tx("2026-03-15", "expense", 90),
    ];
    const m = burnMetrics(txs, 0, 2);
    expect(m.windowMonths).toBe(2);
    expect(m.grossBurn).toBe(75);
  });
});
