import { describe, expect, it } from "vitest"
import { dayBuckets, getPeriodRange, getPreviousRange, monthBuckets } from "@/lib/analytics/periods"

describe("getPeriodRange", () => {
  it("returns the last 7 days inclusive", () => {
    const range = getPeriodRange("7d", "2026-08-02")
    expect(range).toEqual({ from: "2026-07-27", to: "2026-08-02" })
  })

  it("returns the current month", () => {
    const range = getPeriodRange("this_month", "2026-08-02")
    expect(range.from).toBe("2026-08-01")
    expect(range.to).toBe("2026-08-02")
  })

  it("returns the current quarter start", () => {
    const range = getPeriodRange("this_quarter", "2026-08-15")
    expect(range.from).toBe("2026-07-01")
  })

  it("returns the current year start", () => {
    const range = getPeriodRange("this_year", "2026-08-15")
    expect(range.from).toBe("2026-01-01")
  })
})

describe("getPreviousRange", () => {
  it("returns an equal-length range immediately before", () => {
    const prev = getPreviousRange({ from: "2026-07-01", to: "2026-07-31" })
    expect(prev).toEqual({ from: "2026-05-31", to: "2026-06-30" })
  })
})

describe("monthBuckets", () => {
  it("lists months inclusive across a range", () => {
    expect(monthBuckets({ from: "2026-01-15", to: "2026-03-10" })).toEqual(["2026-01", "2026-02", "2026-03"])
  })
})

describe("dayBuckets", () => {
  it("lists each day inclusive", () => {
    const days = dayBuckets({ from: "2026-08-01", to: "2026-08-03" })
    expect(days).toEqual(["2026-08-01", "2026-08-02", "2026-08-03"])
  })
})
