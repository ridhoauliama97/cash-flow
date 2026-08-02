import type { MonthPoint } from "@/lib/analytics/kpis"

export interface ForecastPoint {
  key: string // YYYY-MM
  label: string
  revenue: number
  expenses: number
  net: number
  balance: number // projected closing cash balance
  isForecast: boolean
}

interface Series {
  key: string
  index: number
  value: number
}

/** Simple linear regression: y = a + b*x over historical points. */
function linearRegression(points: Series[]): { slope: number; intercept: number } {
  const n = points.length
  if (n === 0) return { slope: 0, intercept: 0 }
  const meanX = points.reduce((s, p) => s + p.index, 0) / n
  const meanY = points.reduce((s, p) => s + p.value, 0) / n
  let num = 0
  let den = 0
  for (const p of points) {
    num += (p.index - meanX) * (p.value - meanY)
    den += (p.index - meanX) ** 2
  }
  const slope = den === 0 ? 0 : num / den
  return { slope, intercept: meanY - slope * meanX }
}

/** Seasonal index: ratio of each calendar month's value to its trend line. */
function seasonalIndexes(history: MonthPoint[]): Map<number, number> {
  const points: Series[] = history.map((h, i) => ({ key: h.key, index: i, value: h.revenue + h.expenses }))
  const { slope, intercept } = linearRegression(points)
  const byMonth = new Map<number, number[]>()
  for (const h of history) {
    const month = Number(h.key.slice(5, 7)) - 1
    const idx = history.indexOf(h)
    const trend = intercept + slope * idx
    const ratio = trend > 0 ? (h.revenue + h.expenses) / trend : 1
    const arr = byMonth.get(month) ?? []
    arr.push(ratio)
    byMonth.set(month, arr)
  }
  const out = new Map<number, number>()
  for (const [month, ratios] of byMonth) {
    out.set(month, ratios.reduce((s, r) => s + r, 0) / ratios.length)
  }
  return out
}

function monthKeyShift(key: string, months: number): string {
  const [y, m] = key.split("-").map(Number)
  const d = new Date(y, (m ?? 1) - 1 + months, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function labelFor(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
}

export interface ForecastInput {
  history: MonthPoint[]
  currentBalance: number
  months?: number
}

/**
 * 12-month cash-flow forecast using trend (linear regression) plus
 * calendar seasonality extracted from historical patterns.
 */
export function forecastCashFlow({ history, currentBalance, months = 12 }: ForecastInput): ForecastPoint[] {
  const sorted = [...history].toSorted((a, b) => a.key.localeCompare(b.key))
  if (sorted.length === 0) return []

  const revenueSeries: Series[] = sorted.map((h, i) => ({ key: h.key, index: i, value: h.revenue }))
  const expenseSeries: Series[] = sorted.map((h, i) => ({ key: h.key, index: i, value: h.expenses }))
  const revTrend = linearRegression(revenueSeries)
  const expTrend = linearRegression(expenseSeries)
  const seasonality = seasonalIndexes(sorted)

  const lastKey = sorted[sorted.length - 1].key
  const lastIndex = sorted.length - 1
  let balance = currentBalance
  const out: ForecastPoint[] = []

  for (let i = 1; i <= months; i++) {
    const key = monthKeyShift(lastKey, i)
    const monthNum = Number(key.slice(5, 7)) - 1
    const seasonal = seasonality.get(monthNum) ?? 1
    const rawRev = revTrend.intercept + revTrend.slope * (lastIndex + i)
    const rawExp = expTrend.intercept + expTrend.slope * (lastIndex + i)
    const revenue = Math.max(0, rawRev * seasonal)
    const expenses = Math.max(0, rawExp * seasonal)
    const net = revenue - expenses
    balance += net
    out.push({ key, label: labelFor(key), revenue, expenses, net, balance, isForecast: true })
  }
  return out
}

/** Low/high confidence band around a forecast (roughly ±15%). */
export function confidenceBand(point: ForecastPoint): { low: number; high: number } {
  return { low: point.balance * 0.85, high: point.balance * 1.15 }
}
