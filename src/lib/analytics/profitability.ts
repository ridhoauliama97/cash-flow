import type { Transaction } from "@/types"
import { computeKpis, sumByType } from "@/lib/analytics/kpis"

export interface ProfitabilitySummary {
  revenue: number
  expenses: number
  net: number
  margin: number // net / revenue (percent)
  revenueGrowth: number | null
  expenseGrowth: number | null
  netGrowth: number | null
  marginDelta: number | null // percentage-point change vs previous period
}

/**
 * Profitability KPIs for a period, with growth vs the previous period.
 * Margins are net (no COGS concept in the data model), in home currency.
 */
export function profitabilitySummary(
  current: Transaction[],
  previous: Transaction[],
  days: number,
): ProfitabilitySummary {
  const k = computeKpis({ current, previous, openingBalance: 0, days })
  const prev = sumByType(previous)
  const prevMargin = prev.revenue > 0 ? (prev.net / prev.revenue) * 100 : 0
  return {
    revenue: k.revenue,
    expenses: k.expenses,
    net: k.net,
    margin: k.margin,
    revenueGrowth: k.revenueGrowth,
    expenseGrowth: k.expenseGrowth,
    netGrowth: k.netGrowth,
    marginDelta: prev.revenue > 0 ? k.margin - prevMargin : null,
  }
}

export interface DimensionProfit {
  name: string
  revenue: number
  expenses: number
  net: number
  margin: number | null // null when the dimension has no revenue
  count: number
}

/**
 * Group transactions by a dimension (client, product, region…) and compute
 * revenue, expenses, net profit and margin per group, sorted by net profit.
 */
export function profitByDimension(
  txs: Transaction[],
  dim: "category" | "product" | "client" | "region" | "department" | "project",
  topN = 8,
): DimensionProfit[] {
  const map = new Map<string, DimensionProfit>()
  for (const t of txs) {
    const name = t[dim]
    if (!name) continue
    let entry = map.get(name)
    if (!entry) {
      entry = { name, revenue: 0, expenses: 0, net: 0, margin: null, count: 0 }
      map.set(name, entry)
    }
    if (t.type === "revenue") entry.revenue += t.baseAmount
    else entry.expenses += t.baseAmount
    entry.count += 1
  }
  return [...map.values()]
    .map((e) => ({
      ...e,
      net: e.revenue - e.expenses,
      margin: e.revenue > 0 ? ((e.revenue - e.expenses) / e.revenue) * 100 : null,
    }))
    .toSorted((a, b) => b.net - a.net)
    .slice(0, topN)
}
