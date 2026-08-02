import { describe, expect, it } from "vitest"
import { budgetVsActual, compare, totalActual, totalBudget } from "@/lib/analytics/compare"
import type { Budget, Transaction } from "@/types"

const tx = (overrides: Partial<Transaction> & { date: string }): Transaction => ({
  id: "t",
  type: "expense",
  description: "x",
  amount: 100,
  currency: "USD",
  baseAmount: 100,
  category: "c",
  createdAt: "2026-01-01",
  ...overrides,
})

describe("compare", () => {
  it("computes absolute and relative growth", () => {
    expect(compare(150, 100)).toEqual({ current: 150, previous: 100, absolute: 50, growth: 50 })
  })

  it("returns null growth when previous is zero and current is not", () => {
    expect(compare(50, 0).growth).toBeNull()
  })

  it("returns 0 growth when both are zero", () => {
    expect(compare(0, 0).growth).toBe(0)
  })
})

describe("budgetVsActual", () => {
  const budgets: Budget[] = [
    { id: "b1", month: "2026-08", category: "Marketing", amount: 1000 },
    { id: "b2", month: "2026-08", category: "Travel", amount: 500 },
    { id: "b3", month: "2026-07", category: "Marketing", amount: 1000 },
  ]
  const txs = [
    tx({ date: "2026-08-03", category: "Marketing", baseAmount: 300 }),
    tx({ date: "2026-08-10", category: "Marketing", baseAmount: 200 }),
    tx({ date: "2026-08-12", category: "Travel", baseAmount: 600 }),
    tx({ date: "2026-07-01", category: "Marketing", baseAmount: 999 }),
  ]

  it("matches actuals to the right month and category", () => {
    const lines = budgetVsActual(txs, budgets, "2026-08")
    const marketing = lines.find((l) => l.category === "Marketing")
    const travel = lines.find((l) => l.category === "Travel")
    expect(marketing).toMatchObject({ budget: 1000, actual: 500, variance: 500, used: 50 })
    expect(travel).toMatchObject({ budget: 500, actual: 600, variance: -100, used: 120 })
  })

  it("sorts by actual descending", () => {
    const lines = budgetVsActual(txs, budgets, "2026-08")
    expect(lines[0].category).toBe("Travel")
  })

  it("returns empty for a month without budgets", () => {
    expect(budgetVsActual(txs, budgets, "2026-09")).toEqual([])
  })
})

describe("totalBudget / totalActual", () => {
  it("sums budgets and actuals for a month", () => {
    const budgets: Budget[] = [
      { id: "b1", month: "2026-08", category: "A", amount: 100 },
      { id: "b2", month: "2026-08", category: "B", amount: 250 },
    ]
    const txs = [
      tx({ date: "2026-08-01", baseAmount: 100 }),
      tx({ date: "2026-08-02", baseAmount: 50 }),
      tx({ date: "2026-08-03", type: "revenue", baseAmount: 500 }),
    ]
    expect(totalBudget(budgets, "2026-08")).toBe(350)
    expect(totalActual(txs, "2026-08")).toBe(150)
  })
})
