import type { Transaction } from "@/types"

export interface TypeTotals {
  revenue: number
  expenses: number
  net: number
}

/** Sum revenue and expenses (base currency). */
export function sumByType(txs: Transaction[]): TypeTotals {
  let revenue = 0
  let expenses = 0
  for (const t of txs) {
    if (t.type === "revenue") revenue += t.baseAmount
    else expenses += t.baseAmount
  }
  return { revenue, expenses, net: revenue - expenses }
}

/**
 * Cumulative cash balance (opening balance + net of all transactions with
 * date < `date`, i.e. strictly before). Use this to get a true period-start
 * balance instead of the account inception balance.
 */
export function balanceBefore(txs: Transaction[], date: string, openingBalance = 0): number {
  let balance = openingBalance
  for (const t of txs) {
    if (t.date < date) balance += t.type === "revenue" ? t.baseAmount : -t.baseAmount
  }
  return balance
}

export interface Kpis {
  revenue: number
  expenses: number
  net: number
  margin: number // net / revenue (percent)
  cashPosition: number // opening balance + net
  avgDailyExpense: number
  runwayDays: number | null // cash / avg daily expense
  revenueGrowth: number | null // % vs previous period
  expenseGrowth: number | null
  netGrowth: number | null
}

export interface KpiInput {
  current: Transaction[]
  previous: Transaction[]
  openingBalance: number
  days: number // length of current period in days
}

/** Core dashboard KPIs with period-over-period growth. */
export function computeKpis({ current, previous, openingBalance, days }: KpiInput): Kpis {
  const cur = sumByType(current)
  const prev = sumByType(previous)

  const growth = (c: number, p: number): number | null => (p === 0 ? (c === 0 ? 0 : null) : ((c - p) / p) * 100)

  const avgDailyExpense = days > 0 ? cur.expenses / days : 0
  const runwayDays = avgDailyExpense > 0 ? Math.floor((openingBalance + cur.net) / avgDailyExpense) : null

  return {
    revenue: cur.revenue,
    expenses: cur.expenses,
    net: cur.net,
    margin: cur.revenue > 0 ? (cur.net / cur.revenue) * 100 : 0,
    cashPosition: openingBalance + cur.net,
    avgDailyExpense,
    runwayDays,
    revenueGrowth: growth(cur.revenue, prev.revenue),
    expenseGrowth: growth(cur.expenses, prev.expenses),
    netGrowth: growth(cur.net, prev.net),
  }
}

export interface MonthPoint {
  key: string // YYYY-MM
  label: string
  revenue: number
  expenses: number
  net: number
}

/** Aggregate transactions into month buckets. */
export function byMonth(txs: Transaction[]): MonthPoint[] {
  const map = new Map<string, MonthPoint>()
  for (const t of txs) {
    const key = t.date.slice(0, 7)
    let point = map.get(key)
    if (!point) {
      const [y, m] = key.split("-").map(Number)
      const label = new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("en-US", { month: "short" })
      point = { key, label, revenue: 0, expenses: 0, net: 0 }
      map.set(key, point)
    }
    if (t.type === "revenue") point.revenue += t.baseAmount
    else point.expenses += t.baseAmount
    point.net = point.revenue - point.expenses
  }
  return [...map.values()].toSorted((a, b) => a.key.localeCompare(b.key))
}

export interface DimensionPoint {
  name: string
  value: number
  count: number
}

/** Group transactions by a dimension, returning top-N by value. */
export function byDimension(
  txs: Transaction[],
  dim: "category" | "product" | "client" | "region" | "department" | "project",
  topN = 8,
): DimensionPoint[] {
  const map = new Map<string, { value: number; count: number }>()
  for (const t of txs) {
    const name = t[dim]
    if (!name) continue
    const entry = map.get(name) ?? { value: 0, count: 0 }
    entry.value += t.baseAmount
    entry.count += 1
    map.set(name, entry)
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, value: v.value, count: v.count }))
    .toSorted((a, b) => b.value - a.value)
    .slice(0, topN)
}

export interface DailyPoint {
  date: string
  inflow: number
  outflow: number
  balance: number
}

/** Daily cash position: cumulative balance with daily inflow/outflow. */
export function dailyBalances(txs: Transaction[], openingBalance: number, from: string, to: string): DailyPoint[] {
  const days: DailyPoint[] = []
  const byDate = new Map<string, DailyPoint>()
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    const point = { date: iso, inflow: 0, outflow: 0, balance: 0 }
    byDate.set(iso, point)
    days.push(point)
  }
  for (const t of txs) {
    const point = byDate.get(t.date)
    if (!point) continue
    if (t.type === "revenue") point.inflow += t.baseAmount
    else point.outflow += t.baseAmount
  }
  let balance = openingBalance
  for (const p of days) {
    balance += p.inflow - p.outflow
    p.balance = balance
  }
  return days
}
