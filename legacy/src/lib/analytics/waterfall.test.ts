import { describe, expect, it } from "vitest"
import { cashFlowWaterfall, weeklyPattern } from "@/lib/analytics/waterfall"
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

describe("cashFlowWaterfall", () => {
  it("builds a start→revenue→expenses→end waterfall", () => {
    const txs = [
      tx({ date: "2026-08-01", type: "revenue", baseAmount: 800 }),
      tx({ date: "2026-08-02", type: "expense", baseAmount: 300 }),
    ]
    const wf = cashFlowWaterfall(txs, 200)
    expect(wf).toHaveLength(4)
    expect(wf[0]).toMatchObject({ name: "start", value: 200, range: [0, 200] })
    expect(wf[1]).toMatchObject({ name: "revenue", value: 800, range: [200, 1000] })
    expect(wf[2]).toMatchObject({ name: "expenses", value: -300, range: [1000, 700] })
    expect(wf[3]).toMatchObject({ name: "end", value: 700, range: [0, 700] })
  })

  it("handles empty datasets", () => {
    const wf = cashFlowWaterfall([], 500)
    expect(wf[3].value).toBe(500)
  })
})

describe("weeklyPattern", () => {
  it("groups expenses by weekday", () => {
    // 2026-08-02 is a Sunday
    const txs = [
      tx({ date: "2026-08-02", type: "expense", baseAmount: 100 }),
      tx({ date: "2026-08-03", type: "expense", baseAmount: 50 }), // Monday
      tx({ date: "2026-08-03", type: "expense", baseAmount: 25 }), // Monday
      tx({ date: "2026-08-04", type: "revenue", baseAmount: 999 }), // excluded
    ]
    const pattern = weeklyPattern(txs)
    const sun = pattern.find((p) => p.day === "Sun")
    const mon = pattern.find((p) => p.day === "Mon")
    expect(sun?.value).toBe(100)
    expect(mon?.value).toBe(75)
    expect(pattern.reduce((s, p) => s + p.value, 0)).toBe(175)
  })
})
