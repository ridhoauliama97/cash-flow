import { describe, expect, it } from "vitest"
import { agingBuckets, expectedCollections, outstandingBills, overdueDays, outstandingByClient } from "@/lib/analytics/aging"
import type { Invoice } from "@/types"

const inv = (overrides: Partial<Invoice>): Invoice => ({
  id: "i",
  number: "INV-1",
  client: "Acme",
  issueDate: "2026-06-01",
  dueDate: "2026-07-01",
  amount: 100,
  currency: "USD",
  baseAmount: 100,
  paidAmount: 0,
  status: "unpaid",
  createdAt: "2026-06-01",
  ...overrides,
})

const TODAY = "2026-08-02"

describe("agingBuckets", () => {
  it("places invoices into the correct aging buckets", () => {
    const invoices = [
      inv({ id: "a", dueDate: "2026-08-20", baseAmount: 100 }), // current
      inv({ id: "b", dueDate: "2026-07-20", baseAmount: 200 }), // 1-30
      inv({ id: "c", dueDate: "2026-06-20", baseAmount: 300 }), // 31-60
      inv({ id: "d", dueDate: "2026-05-10", baseAmount: 400 }), // 61-90
      inv({ id: "e", dueDate: "2026-04-01", baseAmount: 500 }), // 90+
      inv({ id: "f", dueDate: "2026-07-01", baseAmount: 999, status: "paid" }), // excluded
    ]
    const summary = agingBuckets(invoices, TODAY)
    expect(summary.buckets[0].total).toBe(100)
    expect(summary.buckets[1].total).toBe(200)
    expect(summary.buckets[2].total).toBe(300)
    expect(summary.buckets[3].total).toBe(400)
    expect(summary.buckets[4].total).toBe(500)
    expect(summary.totalOutstanding).toBe(1500)
    expect(summary.totalOverdue).toBe(1400)
    expect(summary.overdueCount).toBe(4)
    expect(summary.atRisk.map((i) => i.id)).toEqual(["e", "d", "c", "b"])
  })

  it("counts partial invoices as outstanding", () => {
    const summary = agingBuckets(
      [inv({ id: "a", dueDate: "2026-07-20", baseAmount: 1000, paidAmount: 600, status: "partial" })],
      TODAY,
    )
    expect(summary.totalOutstanding).toBe(400)
  })

  it("returns zeroes for empty data", () => {
    const summary = agingBuckets([], TODAY)
    expect(summary.totalOutstanding).toBe(0)
    expect(summary.buckets.every((b) => b.total === 0)).toBe(true)
  })
})

describe("overdueDays", () => {
  it("computes positive days overdue and negative for future dues", () => {
    expect(overdueDays(inv({ dueDate: "2026-07-20" }), TODAY)).toBe(13)
    expect(overdueDays(inv({ dueDate: "2026-08-20" }), TODAY)).toBe(-18)
  })
})

describe("outstandingByClient", () => {
  it("groups and sorts clients by outstanding amount", () => {
    const invoices = [
      inv({ id: "a", client: "Acme", baseAmount: 100, dueDate: "2026-08-20" }),
      inv({ id: "b", client: "Acme", baseAmount: 50, dueDate: "2026-07-01" }),
      inv({ id: "c", client: "Beta", baseAmount: 300, dueDate: "2026-08-01" }),
      inv({ id: "d", client: "Gamma", baseAmount: 999, status: "paid", dueDate: "2026-08-01" }),
    ]
    const out = outstandingByClient(invoices)
    expect(out.map((o) => o.client)).toEqual(["Beta", "Acme"])
    expect(out[1]).toMatchObject({ client: "Acme", total: 150, count: 2, oldest: "2026-07-01" })
  })
})

describe("expectedCollections", () => {
  it("sums outstanding amounts due within the horizon, including overdue", () => {
    const invoices = [
      inv({ id: "a", baseAmount: 100, dueDate: "2026-08-15" }), // within 30d
      inv({ id: "b", baseAmount: 200, dueDate: "2026-07-01" }), // overdue
      inv({ id: "c", baseAmount: 300, dueDate: "2026-09-15" }), // beyond horizon
      inv({ id: "d", baseAmount: 400, status: "paid", dueDate: "2026-08-10" }), // excluded
      inv({ id: "e", baseAmount: 50, paidAmount: 20, dueDate: "2026-08-10" }), // partial
    ]
    expect(expectedCollections(invoices, TODAY, 30)).toBe(100 + 200 + 30)
  })

  it("handles a zero horizon", () => {
    const invoices = [
      inv({ id: "a", baseAmount: 100, dueDate: "2026-08-02" }), // today
      inv({ id: "b", baseAmount: 200, dueDate: "2026-08-03" }), // tomorrow
    ]
    expect(expectedCollections(invoices, TODAY, 0)).toBe(100)
  })
})

describe("outstandingBills", () => {
  it("sums outstanding bills and excludes paid ones", () => {
    const bills = [
      { id: "1", vendor: "AWS", baseAmount: 100, paidAmount: 0, status: "unpaid" },
      { id: "2", vendor: "Figma", baseAmount: 200, paidAmount: 50, status: "partial" },
      { id: "3", vendor: "Slack", baseAmount: 300, paidAmount: 300, status: "paid" },
    ] as unknown as import("@/types").Bill[]
    expect(outstandingBills(bills)).toBe(250)
  })
})
