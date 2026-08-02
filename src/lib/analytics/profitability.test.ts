import { describe, expect, it } from "vitest"
import type { Transaction } from "@/types"
import { profitByDimension, profitabilitySummary } from "@/lib/analytics/profitability"

function tx(overrides: Omit<Partial<Transaction>, "type"> & { type: "revenue" | "expense" }): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    date: "2026-07-15",
    description: "test",
    amount: 0,
    currency: "USD",
    baseAmount: 100,
    category: "General",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("profitabilitySummary", () => {
  const current = [
    tx({ type: "revenue", baseAmount: 1000, client: "A" }),
    tx({ type: "revenue", baseAmount: 500, client: "B" }),
    tx({ type: "expense", baseAmount: 300, client: "A" }),
  ]
  const previous = [
    tx({ type: "revenue", baseAmount: 1000, client: "A" }),
    tx({ type: "expense", baseAmount: 500, client: "A" }),
  ]

  it("computes revenue, expenses, net and margin", () => {
    const s = profitabilitySummary(current, previous, 30)
    expect(s.revenue).toBe(1500)
    expect(s.expenses).toBe(300)
    expect(s.net).toBe(1200)
    expect(s.margin).toBeCloseTo(80)
  })

  it("computes growth vs previous period", () => {
    const s = profitabilitySummary(current, previous, 30)
    expect(s.revenueGrowth).toBeCloseTo(50)
    expect(s.expenseGrowth).toBeCloseTo(-40)
    expect(s.netGrowth).toBeCloseTo(140)
  })

  it("computes margin delta in percentage points", () => {
    // prev margin = 50% (500/1000), current = 80% → delta +30pp
    const s = profitabilitySummary(current, previous, 30)
    expect(s.marginDelta).toBeCloseTo(30)
  })

  it("marginDelta is null when previous period had no revenue", () => {
    const s = profitabilitySummary(current, [], 30)
    expect(s.marginDelta).toBeNull()
  })

  it("margin is 0 when there is no revenue", () => {
    const s = profitabilitySummary([tx({ type: "expense", baseAmount: 50 })], [], 30)
    expect(s.margin).toBe(0)
  })
})

describe("profitByDimension", () => {
  const txs = [
    tx({ type: "revenue", baseAmount: 1000, client: "A" }),
    tx({ type: "revenue", baseAmount: 200, client: "B" }),
    tx({ type: "expense", baseAmount: 400, client: "A" }),
    tx({ type: "expense", baseAmount: 300, client: "C" }),
    tx({ type: "revenue", baseAmount: 1000, client: "C" }),
  ]

  it("groups revenue and expenses per dimension", () => {
    const rows = profitByDimension(txs, "client")
    const a = rows.find((r) => r.name === "A")
    expect(a?.revenue).toBe(1000)
    expect(a?.expenses).toBe(400)
    expect(a?.net).toBe(600)
    expect(a?.count).toBe(2)
  })

  it("sorts by net profit descending and respects topN", () => {
    const rows = profitByDimension(txs, "client", 2)
    expect(rows.map((r) => r.name)).toEqual(["C", "A"])
  })

  it("margin is null when a dimension has no revenue", () => {
    const rows = profitByDimension([tx({ type: "expense", baseAmount: 100, client: "D" })], "client")
    expect(rows[0]?.margin).toBeNull()
  })

  it("ignores transactions without the dimension", () => {
    const rows = profitByDimension(
      [tx({ type: "revenue", baseAmount: 10, client: undefined })],
      "client",
    )
    expect(rows).toEqual([])
  })
})
