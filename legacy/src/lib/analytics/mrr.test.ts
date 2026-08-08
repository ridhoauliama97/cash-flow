import { describe, expect, it } from "vitest";
import {
  isRecurringProduct,
  mrrByMonth,
  mrrDeltaByMonth,
  mrrSummary,
  recurringRevenue,
} from "@/lib/analytics/mrr";
import type { Transaction } from "@/types";

function tx(
  date: string,
  product: string,
  client: string,
  baseAmount: number,
): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    date,
    type: "revenue",
    description: `${product} — ${client}`,
    amount: baseAmount,
    currency: "USD",
    baseAmount,
    category: "Software & Licenses",
    product,
    client,
    createdAt: `${date}T00:00:00Z`,
  };
}

describe("isRecurringProduct", () => {
  it("recognises subscription-like products", () => {
    expect(isRecurringProduct("SaaS Subscription")).toBe(true);
    expect(isRecurringProduct("Support Retainer")).toBe(true);
    expect(isRecurringProduct("Maintenance Plan")).toBe(true);
    expect(isRecurringProduct("Annual License")).toBe(true);
  });

  it("ignores one-off products and empty names", () => {
    expect(isRecurringProduct("Logo Design")).toBe(false);
    expect(isRecurringProduct("Consulting Sprint")).toBe(false);
    expect(isRecurringProduct(null)).toBe(false);
    expect(isRecurringProduct(undefined)).toBe(false);
  });
});

describe("recurringRevenue", () => {
  it("only includes revenue from recurring products", () => {
    const txs = [
      tx("2026-01-05", "SaaS Subscription", "Acme", 100),
      tx("2026-01-05", "Logo Design", "Beta", 500),
    ];
    const result = recurringRevenue(txs);
    expect(result).toHaveLength(1);
    expect(result[0]?.product).toBe("SaaS Subscription");
  });
});

describe("mrrByMonth", () => {
  it("aggregates recurring revenue per month", () => {
    const txs = [
      tx("2026-01-05", "Retainer", "Acme", 100),
      tx("2026-01-20", "Retainer", "Acme", 100),
      tx("2026-01-10", "Retainer", "Beta", 50),
      tx("2026-02-05", "Retainer", "Acme", 100),
    ];
    const points = mrrByMonth(txs);
    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({ key: "2026-01", mrr: 250, arr: 3000, clients: 2 });
    expect(points[1]).toMatchObject({ key: "2026-02", mrr: 100, clients: 1 });
  });

  it("returns an empty series when there is no recurring revenue", () => {
    expect(mrrByMonth([])).toEqual([]);
  });
});

describe("mrrDeltaByMonth", () => {
  it("decomposes new, expansion, contraction and churn", () => {
    const txs = [
      // Jan: Acme starts (100), Beta starts (50)
      tx("2026-01-05", "Retainer", "Acme", 100),
      tx("2026-01-05", "Retainer", "Beta", 50),
      // Feb: Acme expands to 150, Beta contracts to 30
      tx("2026-02-05", "Retainer", "Acme", 150),
      tx("2026-02-05", "Retainer", "Beta", 30),
      // Mar: Gamma is new (40), Acme churns (0), Beta stays at 30
      tx("2026-03-05", "Retainer", "Gamma", 40),
      tx("2026-03-05", "Retainer", "Beta", 30),
    ];
    const points = mrrDeltaByMonth(txs);
    expect(points).toHaveLength(3);

    expect(points[0]).toMatchObject({ key: "2026-01", new: 150, expansion: 0, contraction: 0, churn: 0 });
    expect(points[1]).toMatchObject({ key: "2026-02", new: 0, expansion: 50, contraction: 20, churn: 0 });
    expect(points[2]).toMatchObject({ key: "2026-03", new: 40, expansion: 0, contraction: 0, churn: 150 });
  });

  it("returns an empty array without client-assigned recurring revenue", () => {
    const noClients = [tx("2026-01-05", "Retainer", "Client A", 100)].map((t) => ({ ...t, client: undefined }));
    expect(mrrDeltaByMonth(noClients)).toEqual([]);
  });
});

describe("mrrSummary", () => {
  it("computes latest MRR, ARR and month-over-month growth", () => {
    const txs = [
      tx("2026-01-05", "Retainer", "Acme", 100),
      tx("2026-02-05", "Retainer", "Acme", 120),
    ];
    const summary = mrrSummary(txs);
    expect(summary.mrr).toBe(120);
    expect(summary.arr).toBe(1440);
    expect(summary.growthPct).toBeCloseTo(20);
    expect(summary.clientCount).toBe(1);
  });

  it("returns zero MRR and null growth without recurring revenue", () => {
    expect(mrrSummary([])).toMatchObject({ mrr: 0, arr: 0, growthPct: null, clientCount: 0 });
  });
});
