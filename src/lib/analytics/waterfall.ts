import type { Transaction } from "@/types"
import { sumByType } from "@/lib/analytics/kpis"

export interface WaterfallPoint {
  name: string
  label: string
  value: number // signed delta (income positive, expense negative)
  isTotal: boolean
  range: [number, number] // [bottom, top] for Recharts range bars
}

/**
 * Build a cash-flow waterfall: Start balance → revenue → expenses → End balance.
 * Uses Recharts v3 range bars ([bottom, top]) so no stacking tricks are needed.
 */
export function cashFlowWaterfall(
  txs: Transaction[],
  openingBalance: number,
): WaterfallPoint[] {
  const { revenue, expenses } = sumByType(txs)
  const start = openingBalance
  const afterRevenue = start + revenue
  const end = afterRevenue - expenses

  const points: WaterfallPoint[] = [
    { name: "start", label: "Opening", value: start, isTotal: true, range: [0, start] },
    { name: "revenue", label: "Revenue", value: revenue, isTotal: false, range: [start, afterRevenue] },
    { name: "expenses", label: "Expenses", value: -expenses, isTotal: false, range: [afterRevenue, end] },
    { name: "end", label: "Closing", value: end, isTotal: true, range: [0, end] },
  ]
  return points
}

/** Weekly spending pattern: Mon..Sun expense totals (for trend insights). */
export function weeklyPattern(txs: Transaction[]): Array<{ day: string; value: number }> {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const totals = new Array(7).fill(0) as number[]
  for (const t of txs) {
    if (t.type !== "expense") continue
    const d = new Date(`${t.date}T12:00:00`)
    totals[d.getDay()] += t.baseAmount
  }
  return days.map((day, i) => ({ day, value: totals[i] }))
}
