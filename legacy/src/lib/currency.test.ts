import { describe, expect, it } from "vitest"
import { convert, ratesForHome, FALLBACK_RATES_PER_USD, ensureRates, fallbackRates, isRatesStale } from "@/lib/currency"
import type { CachedRates } from "@/types"

describe("convert", () => {
  const rates = ratesForHome(FALLBACK_RATES_PER_USD, "IDR")

  it("returns amount unchanged for same currency", () => {
    expect(convert(1000, "USD", "USD", rates)).toBe(1000)
  })

  it("converts USD → IDR using per-home rates", () => {
    // 1 USD = 15800 IDR
    expect(convert(100, "USD", "IDR", rates)).toBeCloseTo(1_580_000, 0)
  })

  it("converts IDR → USD (round trip)", () => {
    const back = convert(convert(100, "USD", "IDR", rates), "IDR", "USD", rates)
    expect(back).toBeCloseTo(100, 6)
  })
})

describe("ratesForHome", () => {
  it("normalizes the base currency to 1", () => {
    const rates = ratesForHome(FALLBACK_RATES_PER_USD, "USD")
    expect(rates.USD).toBe(1)
    expect(rates.EUR).toBeCloseTo(0.9234, 4)
  })

  it("rebases correctly for a non-USD home", () => {
    const rates = ratesForHome(FALLBACK_RATES_PER_USD, "EUR")
    expect(rates.EUR).toBe(1)
    expect(rates.USD).toBeCloseTo(1 / 0.9234, 4)
  })
})

describe("ensureRates / isRatesStale", () => {
  it("uses fresh cache without network", async () => {
    const cached: CachedRates = {
      base: "USD",
      rates: ratesForHome(FALLBACK_RATES_PER_USD, "USD"),
      fetchedAt: new Date().toISOString(),
      source: "fallback",
    }
    const result = await ensureRates(cached, "USD", undefined)
    expect(result.rates.USD).toBe(1)
    expect(result.status.ok).toBe(true)
  })

  it("falls back to static rates when no key and no cache", async () => {
    const result = await ensureRates(null, "USD", undefined)
    expect(result.rates.USD).toBe(1)
    expect(result.status.ok).toBe(false)
    expect(result.status.error).toContain("No API key")
  })

  it("detects stale caches older than maxAge", () => {
    const old: CachedRates = {
      base: "USD",
      rates: ratesForHome(FALLBACK_RATES_PER_USD, "USD"),
      fetchedAt: new Date(Date.now() - 100 * 3_600_000).toISOString(),
      source: "fallback",
    }
    expect(isRatesStale(old)).toBe(true)
    expect(isRatesStale(null)).toBe(true)
  })
})

describe("fallbackRates", () => {
  it("produces a valid snapshot for any currency", () => {
    for (const home of ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "IDR"] as const) {
      const snapshot = fallbackRates(home)
      expect(snapshot.base).toBe(home)
      expect(snapshot.rates[home]).toBe(1)
      expect(snapshot.source).toBe("fallback")
    }
  })
})
