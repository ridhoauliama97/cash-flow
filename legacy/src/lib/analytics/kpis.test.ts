import { describe, expect, it } from "vitest"
import { byMonth, computeKpis, dailyBalances, sumByType } from "@/lib/analytics/kpis"
import type { Transaction } from "@/types"

const tx = (overrides: Partial<Transaction> & { date: string }): Transaction => ({
  id: "t",
  type: "revenue",
  description: "x",
  amount: 100,
  currency: "USD",
  baseAmount: 100,
  category: "c",
  createdAt: "2026-01-01",
  ...overrides,
})

describe("sumByType", () => {
  it("totals revenue and expenses separately", () => {
    const txs = [
      tx({ date: "2026-01-01", type: "revenue", baseAmount: 500 }),
      tx({ date: "2026-01-02", type: "expense", baseAmount: 200 }),
      tx({ date: "2026-01-03", type: "revenue", baseAmount: 100 }),
    ]
    expect(sumByType(txs)).toEqual({ revenue: 600, expenses: 200, net: 400 })
  })
})

describe("computeKpis", () => {
  it("computes revenue, expenses, net and margin", () => {
    const kpis = computeKpis({
      current: [
        tx({ date: "2026-01-01", type: "revenue", baseAmount: 1000 }),
        tx({ date: "2026-01-02", type: "expense", baseAmount: 400 }),
      ],
      previous: [],
      openingBalance: 100,
      days: 30,
    })
    expect(kpis.revenue).toBe(1000)
    expect(kpis.expenses).toBe(400)
    expect(kpis.net).toBe(600)
    expect(kpis.margin).toBe(60)
    expect(kpis.cashPosition).toBe(700)
  })

  it("computes growth percentages vs previous period", () => {
    const kpis = computeKpis({
      current: [tx({ date: "2026-02-01", type: "revenue", baseAmount: 200 })],
      previous: [tx({ date: "2026-01-01", type: "revenue", baseAmount: 100 })],
      openingBalance: 0,
      days: 30,
    })
    expect(kpis.revenueGrowth).toBe(100)
  })

  it("returns null growth when previous period had no revenue", () => {
    const kpis = computeKpis({
      current: [tx({ date: "2026-02-01", type: "revenue", baseAmount: 200 })],
      previous: [],
      openingBalance: 0,
      days: 30,
    })
    expect(kpis.revenueGrowth).toBeNull()
  })

  it("estimates runway from average daily burn", () => {
    const kpis = computeKpis({
      current: [tx({ date: "2026-01-01", type: "expense", baseAmount: 300 })],
      previous: [],
      openingBalance: 900,
      days: 30,
    })
    // burn = 10/day; cash = 900 - 300 = 600 → 60 days
    expect(kpis.runwayDays).toBe(60)
  })
})

describe("byMonth", () => {
  it("aggregates transactions into month buckets", () => {
    const txs = [
      tx({ date: "2026-01-05", type: "revenue", baseAmount: 100 }),
      tx({ date: "2026-01-20", type: "expense", baseAmount: 30 }),
      tx({ date: "2026-02-02", type: "revenue", baseAmount: 50 }),
    ]
    const months = byMonth(txs)
    expect(months).toHaveLength(2)
    expect(months[0]).toMatchObject({ key: "2026-01", revenue: 100, expenses: 30, net: 70 })
    expect(months[1]).toMatchObject({ key: "2026-02", revenue: 50, expenses: 0, net: 50 })
  })
})

describe("dailyBalances", () => {
  it("accumulates balance day by day", () => {
    const txs = [
      tx({ date: "2026-08-01", type: "revenue", baseAmount: 100 }),
      tx({ date: "2026-08-02", type: "expense", baseAmount: 40 }),
    ]
    const days = dailyBalances(txs, 50, "2026-08-01", "2026-08-03")
    expect(days.map((d) => d.balance)).toEqual([150, 110, 110])
    expect(days[0].inflow).toBe(100)
    expect(days[1].outflow).toBe(40)
  })
})
