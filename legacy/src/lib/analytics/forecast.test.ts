import { describe, expect, it } from "vitest"
import { forecastCashFlow } from "@/lib/analytics/forecast"
import type { MonthPoint } from "@/lib/analytics/kpis"

const history: MonthPoint[] = [
  { key: "2026-01", label: "Jan", revenue: 1000, expenses: 700, net: 300 },
  { key: "2026-02", label: "Feb", revenue: 1100, expenses: 750, net: 350 },
  { key: "2026-03", label: "Mar", revenue: 1200, expenses: 800, net: 400 },
  { key: "2026-04", label: "Apr", revenue: 1300, expenses: 850, net: 450 },
  { key: "2026-05", label: "May", revenue: 1400, expenses: 900, net: 500 },
  { key: "2026-06", label: "Jun", revenue: 1500, expenses: 950, net: 550 },
  { key: "2026-07", label: "Jul", revenue: 1600, expenses: 1000, net: 600 },
]

describe("forecastCashFlow", () => {
  it("projects 12 months with accumulating balances", () => {
    const forecast = forecastCashFlow({ history, currentBalance: 1000 })
    expect(forecast).toHaveLength(12)
    expect(forecast[0].key).toBe("2026-08")
    expect(forecast[0].isForecast).toBe(true)
    // Every point carries a balance that accumulates net
    for (let i = 1; i < forecast.length; i++) {
      expect(forecast[i].balance).toBeCloseTo(forecast[i - 1].balance + forecast[i].net, 6)
    }
  })

  it("trends upward for a growing business", () => {
    const forecast = forecastCashFlow({ history, currentBalance: 1000 })
    const last = forecast[forecast.length - 1]
    expect(last.revenue).toBeGreaterThan(forecast[0].revenue)
    expect(last.balance).toBeGreaterThan(forecast[0].balance)
  })

  it("returns empty for no history", () => {
    expect(forecastCashFlow({ history: [], currentBalance: 0 })).toEqual([])
  })

  it("handles single-month history without crashing", () => {
    const forecast = forecastCashFlow({ history: [history[0]], currentBalance: 500 })
    expect(forecast).toHaveLength(12)
    expect(forecast[0].revenue).toBeGreaterThan(0)
  })

  it("never projects negative revenue or expenses", () => {
    const flat = [{ key: "2026-01", label: "Jan", revenue: 100, expenses: 300, net: -200 }]
    const forecast = forecastCashFlow({ history: flat, currentBalance: 100 })
    for (const p of forecast) {
      expect(p.revenue).toBeGreaterThanOrEqual(0)
      expect(p.expenses).toBeGreaterThanOrEqual(0)
    }
  })
})
