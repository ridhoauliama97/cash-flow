import type { Budget, Transaction } from "@/types"

export interface Comparison {
  current: number
  previous: number
  absolute: number // current - previous
  growth: number | null // percent, null when previous is 0
}

/** Compare a metric across two periods with growth %. */
export function compare(current: number, previous: number): Comparison {
  const absolute = current - previous
  const growth = previous === 0 ? (current === 0 ? 0 : null) : (absolute / previous) * 100
  return { current, previous, absolute, growth }
}

export interface BudgetLine {
  category: string
  budget: number
  actual: number
  variance: number // budget - actual
  used: number // percent of budget used
}

/**
 * Budget vs actual for a month (key: YYYY-MM).
 * Only categories with budgets are returned.
 */
export function budgetVsActual(transactions: Transaction[], budgets: Budget[], month: string): BudgetLine[] {
  const budgetMap = new Map(budgets.filter((b) => b.month === month).map((b) => [b.category, b.amount]))
  const actualMap = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== "expense") continue
    if (!t.date.startsWith(month)) continue
    actualMap.set(t.category, (actualMap.get(t.category) ?? 0) + t.baseAmount)
  }
  const lines: BudgetLine[] = []
  for (const [category, budget] of budgetMap) {
    const actual = actualMap.get(category) ?? 0
    lines.push({
      category,
      budget,
      actual,
      variance: budget - actual,
      used: budget > 0 ? (actual / budget) * 100 : 0,
    })
  }
  return lines.toSorted((a, b) => b.actual - a.actual)
}

export function totalBudget(budgets: Budget[], month: string): number {
  return budgets.filter((b) => b.month === month).reduce((s, b) => s + b.amount, 0)
}

export function totalActual(transactions: Transaction[], month: string): number {
  return transactions
    .filter((t) => t.type === "expense" && t.date.startsWith(month))
    .reduce((s, t) => s + t.baseAmount, 0)
}
