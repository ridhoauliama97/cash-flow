import { describe, expect, it } from "vitest"
import type { Bill, Invoice, Transaction } from "@/types"
import { buildNotifications, cashAlerts, paymentAlerts } from "@/lib/notifications"

function inv(overrides: Partial<Invoice> & { id: string; dueDate: string }): Invoice {
  return {
    number: `INV-${overrides.id}`,
    client: "Acme",
    issueDate: "2026-06-01",
    amount: 1000,
    currency: "USD",
    baseAmount: 1000,
    paidAmount: 0,
    status: "unpaid",
    createdAt: "2026-06-01T00:00:00Z",
    ...overrides,
  }
}

function bill(overrides: Partial<Bill> & { id: string; dueDate: string }): Bill {
  return {
    number: `BILL-${overrides.id}`,
    vendor: "Vendor Co",
    issueDate: "2026-06-01",
    amount: 500,
    currency: "USD",
    baseAmount: 500,
    paidAmount: 0,
    status: "unpaid",
    category: "Rent",
    createdAt: "2026-06-01T00:00:00Z",
    ...overrides,
  }
}

function txn(overrides: Omit<Partial<Transaction>, "type" | "baseAmount"> & { type: "revenue" | "expense"; baseAmount: number }): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    date: "2026-07-01",
    description: "t",
    amount: overrides.baseAmount,
    currency: "USD",
    category: "General",
    createdAt: "2026-07-01T00:00:00Z",
    ...overrides,
  }
}

const TODAY = "2026-07-15"

describe("paymentAlerts", () => {
  it("flags overdue invoices as critical", () => {
    const alerts = paymentAlerts([inv({ id: "1", dueDate: "2026-07-10" })], [], TODAY)
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.kind).toBe("invoice-overdue")
    expect(alerts[0]?.severity).toBe("critical")
    expect(alerts[0]?.title).toContain("5 days overdue")
    expect(alerts[0]?.to).toBe("/receivables?tab=ar")
  })

  it("flags invoices due within the horizon as warnings", () => {
    const alerts = paymentAlerts([inv({ id: "1", dueDate: "2026-07-18" })], [], TODAY)
    expect(alerts[0]?.kind).toBe("invoice-due")
    expect(alerts[0]?.severity).toBe("warning")
    expect(alerts[0]?.title).toBe("Invoice due in 3d")
  })

  it("ignores invoices due beyond the horizon and paid invoices", () => {
    const alerts = paymentAlerts(
      [
        inv({ id: "1", dueDate: "2026-07-30" }),
        inv({ id: "2", dueDate: "2026-07-10", status: "paid" }),
      ],
      [],
      TODAY,
    )
    expect(alerts).toEqual([])
  })

  it("uses outstanding amount for partial payments", () => {
    const alerts = paymentAlerts(
      [inv({ id: "1", dueDate: "2026-07-12", baseAmount: 1000, paidAmount: 400 })],
      [],
      TODAY,
    )
    expect(alerts[0]?.amount).toBe(600)
  })

  it("handles bills (AP) with their own tab target", () => {
    const alerts = paymentAlerts([], [bill({ id: "1", dueDate: "2026-07-10" })], TODAY)
    expect(alerts[0]?.kind).toBe("bill-overdue")
    expect(alerts[0]?.to).toBe("/receivables?tab=ap")
  })
})

describe("cashAlerts", () => {
  it("flags a negative balance as critical", () => {
    const alerts = cashAlerts(
      [txn({ type: "expense", baseAmount: 1500 })],
      1000,
      TODAY,
    )
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.kind).toBe("cash-negative")
    expect(alerts[0]?.severity).toBe("critical")
    expect(alerts[0]?.to).toBe("/cash-flow")
  })

  it("flags a short runway as a warning", () => {
    // balance 300, daily expense 20 → 15 days of runway
    const alerts = cashAlerts(
      [txn({ type: "expense", baseAmount: 600, date: "2026-07-14" })],
      900,
      TODAY,
    )
    expect(alerts[0]?.kind).toBe("cash-low")
    expect(alerts[0]?.severity).toBe("warning")
  })

  it("stays silent when the runway is healthy", () => {
    const alerts = cashAlerts(
      [
        txn({ type: "revenue", baseAmount: 100_000 }),
        txn({ type: "expense", baseAmount: 100, date: "2026-07-14" }),
      ],
      0,
      TODAY,
    )
    expect(alerts).toEqual([])
  })
})

describe("buildNotifications", () => {
  it("sorts critical first, then by due date", () => {
    const alerts = buildNotifications(
      [
        txn({ type: "expense", baseAmount: 5000 }),
        txn({ type: "expense", baseAmount: 100, date: "2026-07-14" }),
      ],
      [inv({ id: "1", dueDate: "2026-07-18" })],
      [bill({ id: "2", dueDate: "2026-07-12" })],
      100,
      TODAY,
    )
    expect(alerts[0]?.kind).toBe("cash-negative")
    expect(alerts[1]?.kind).toBe("bill-overdue")
    expect(alerts[2]?.kind).toBe("invoice-due")
  })
})
