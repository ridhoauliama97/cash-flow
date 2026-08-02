import { describe, expect, it } from "vitest"
import { accrualRevenue, applyFilters } from "@/lib/analytics/filter"
import { EMPTY_FILTERS, type Invoice, type Transaction } from "@/types"

const tx = (overrides: Partial<Transaction> & { date: string }): Transaction => ({
  id: "t",
  type: "revenue",
  description: "Test",
  amount: 100,
  currency: "USD",
  baseAmount: 100,
  category: "Services",
  createdAt: "2026-01-01",
  ...overrides,
})

const inv = (overrides: Partial<Invoice>): Invoice => ({
  id: "i1",
  number: "INV-1",
  client: "Acme",
  issueDate: "2026-08-01",
  dueDate: "2026-08-15",
  amount: 100,
  currency: "USD",
  baseAmount: 100,
  paidAmount: 0,
  status: "unpaid",
  createdAt: "2026-08-01",
  ...overrides,
})

describe("applyFilters", () => {
  const txs = [
    tx({ date: "2026-08-01", type: "revenue", category: "Services", client: "Acme", region: "Europe", baseAmount: 500 }),
    tx({ date: "2026-08-02", type: "expense", category: "Marketing", client: "Globex", region: "Asia", baseAmount: 120 }),
    tx({ date: "2026-08-03", type: "revenue", category: "Services", client: "Beta", region: "Europe", baseAmount: 300 }),
  ]

  it("filters by type", () => {
    const out = applyFilters(txs, { ...EMPTY_FILTERS, type: "expense" })
    expect(out).toHaveLength(1)
    expect(out[0].description).toBe("Test")
  })

  it("filters by category and client", () => {
    const out = applyFilters(txs, { ...EMPTY_FILTERS, category: "Services", client: "Acme" })
    expect(out).toHaveLength(1)
    expect(out[0].baseAmount).toBe(500)
  })

  it("filters by region", () => {
    const out = applyFilters(txs, { ...EMPTY_FILTERS, region: "Asia" })
    expect(out).toHaveLength(1)
    expect(out[0].type).toBe("expense")
  })

  it("filters by date range inclusive", () => {
    const out = applyFilters(txs, { ...EMPTY_FILTERS, dateFrom: "2026-08-02", dateTo: "2026-08-02" })
    expect(out).toHaveLength(1)
  })

  it("searches description text", () => {
    const out = applyFilters(txs, { ...EMPTY_FILTERS, search: "test" })
    expect(out).toHaveLength(3)
  })

  it("returns all when no filters set", () => {
    expect(applyFilters(txs, { ...EMPTY_FILTERS })).toHaveLength(3)
  })
})

describe("accrualRevenue", () => {
  it("recognizes unpaid invoice revenue on the issue date", () => {
    const invoices = [
      inv({ id: "a", issueDate: "2026-08-01", baseAmount: 1000, status: "unpaid" }),
      inv({ id: "b", issueDate: "2026-08-02", baseAmount: 500, status: "paid" }),
      inv({ id: "c", issueDate: "2026-07-01", baseAmount: 300, status: "unpaid" }),
    ]
    const out = accrualRevenue(invoices, "2026-08-01", "2026-08-31")
    expect(out).toHaveLength(1)
    expect(out[0].baseAmount).toBe(1000)
    expect(out[0].description).toContain("accrual")
  })

  it("counts partial payments as outstanding", () => {
    const invoices = [inv({ id: "a", issueDate: "2026-08-01", baseAmount: 1000, paidAmount: 400, status: "partial" })]
    const out = accrualRevenue(invoices, "2026-08-01", "2026-08-31")
    expect(out[0].baseAmount).toBe(600)
  })
})
