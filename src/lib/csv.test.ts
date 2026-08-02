import { describe, expect, it } from "vitest"
import { csvTemplate, inferCategory, parseTransactionsCsv } from "@/lib/csv"

describe("inferCategory", () => {
  it("detects revenue categories from descriptions", () => {
    expect(inferCategory("Monthly retainer — Acme")).toEqual({ category: "Client Services", type: "revenue" })
    expect(inferCategory("Website development sprint")).toEqual({ category: "Development", type: "revenue" })
  })

  it("detects expense categories", () => {
    expect(inferCategory("AWS hosting bill")).toEqual({ category: "Software & Subscriptions", type: "expense" })
    expect(inferCategory("Google Ads campaign")).toEqual({ category: "Marketing & Ads", type: "expense" })
  })

  it("defaults to Other/revenue for unknown text", () => {
    expect(inferCategory("something random")).toEqual({ category: "Other", type: "revenue" })
  })
})

describe("parseTransactionsCsv", () => {
  it("parses the provided template", () => {
    const result = parseTransactionsCsv(csvTemplate())
    expect(result.errors).toEqual([])
    expect(result.skipped).toBe(0)
    expect(result.transactions).toHaveLength(4)
    const first = result.transactions[0]
    expect(first).toMatchObject({
      date: "2026-08-01",
      type: "revenue",
      amount: 2500,
      currency: "USD",
      client: "Acme",
    })
  })

  it("converts dates in MM/DD/YYYY format", () => {
    const csv = "date,description,amount\n08/05/2026,Coffee,5"
    const result = parseTransactionsCsv(csv)
    expect(result.transactions[0].date).toBe("2026-08-05")
  })

  it("infers type from the type column", () => {
    const csv = "date,type,description,amount\n2026-08-01,expense,Rent,1000"
    const result = parseTransactionsCsv(csv)
    expect(result.transactions[0].type).toBe("expense")
  })

  it("detects currency symbols", () => {
    const csv = "date,description,amount,currency\n2026-08-01,Coffee,5,€"
    const result = parseTransactionsCsv(csv)
    expect(result.transactions[0].currency).toBe("EUR")
  })

  it("skips rows with missing amounts", () => {
    const csv = "date,description,amount\n2026-08-01,Coffee,\n2026-08-02,Tea,3"
    const result = parseTransactionsCsv(csv)
    expect(result.transactions).toHaveLength(1)
    expect(result.skipped).toBe(1)
  })

  it("handles amount strings with currency formatting", () => {
    const csv = "date,description,amount\n2026-08-01,Coffee,\"$1,250.50\""
    const result = parseTransactionsCsv(csv)
    expect(result.transactions[0].amount).toBe(1250.5)
  })

  it("uses today's date for missing dates", () => {
    const csv = "description,amount\nCoffee,5"
    const result = parseTransactionsCsv(csv)
    expect(result.transactions[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
