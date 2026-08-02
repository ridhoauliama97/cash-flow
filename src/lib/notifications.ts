import type { Bill, Invoice, Transaction } from "@/types"
import { daysBetween } from "@/lib/utils"

export type NotificationKind =
  | "invoice-overdue"
  | "invoice-due"
  | "bill-overdue"
  | "bill-due"
  | "cash-negative"
  | "cash-low"
  | "report-delivered"

export type NotificationSeverity = "critical" | "warning" | "info"

export interface AppNotification {
  id: string
  kind: NotificationKind
  severity: NotificationSeverity
  title: string
  description: string
  amount: number // home currency
  dueDate: string | null
  to: string // navigation target
}

/**
 * Invoice (AR) and bill (AP) alerts: overdue or due within `horizonDays`.
 * Returns notifications sorted by due date (most urgent first).
 */
export function paymentAlerts(
  invoices: Invoice[],
  bills: Bill[],
  today: string,
  horizonDays = 7,
): AppNotification[] {
  const items: AppNotification[] = []

  for (const inv of invoices) {
    if (inv.status === "paid") continue
    const days = daysBetween(inv.dueDate, today)
    const outstanding = Math.max(0, inv.baseAmount - inv.paidAmount)
    if (outstanding <= 0) continue
    if (days > 0) {
      items.push({
        id: `inv-${inv.id}-overdue`,
        kind: "invoice-overdue",
        severity: "critical",
        title: `Invoice ${days === 1 ? "1 day" : `${days} days`} overdue`,
        description: `${inv.number} · ${inv.client}`,
        amount: outstanding,
        dueDate: inv.dueDate,
        to: "/receivables?tab=ar",
      })
    } else if (days >= -horizonDays) {
      items.push({
        id: `inv-${inv.id}-due`,
        kind: "invoice-due",
        severity: "warning",
        title: days === 0 ? "Invoice due today" : `Invoice due in ${-days}d`,
        description: `${inv.number} · ${inv.client}`,
        amount: outstanding,
        dueDate: inv.dueDate,
        to: "/receivables?tab=ar",
      })
    }
  }
  for (const bill of bills) {
    if (bill.status === "paid") continue
    const days = daysBetween(bill.dueDate, today)
    const outstanding = Math.max(0, bill.baseAmount - bill.paidAmount)
    if (outstanding <= 0) continue
    if (days > 0) {
      items.push({
        id: `bill-${bill.id}-overdue`,
        kind: "bill-overdue",
        severity: "critical",
        title: `Bill ${days === 1 ? "1 day" : `${days} days`} overdue`,
        description: `${bill.number} · ${bill.vendor}`,
        amount: outstanding,
        dueDate: bill.dueDate,
        to: "/receivables?tab=ap",
      })
    } else if (days >= -horizonDays) {
      items.push({
        id: `bill-${bill.id}-due`,
        kind: "bill-due",
        severity: "warning",
        title: days === 0 ? "Bill due today" : `Bill due in ${-days}d`,
        description: `${bill.number} · ${bill.vendor}`,
        amount: outstanding,
        dueDate: bill.dueDate,
        to: "/receivables?tab=ap",
      })
    }
  }

  return items.toSorted((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
}

/**
 * Cash position alerts: negative balance (critical) or runway under
 * `warningMonths` based on average daily expense over the last 30 days.
 */
export function cashAlerts(
  transactions: Transaction[],
  openingBalance: number,
  today: string,
  warningMonths = 1,
): AppNotification[] {
  let balance = openingBalance
  let expense30d = 0
  const monthStart = new Date(`${today}T00:00:00`)
  monthStart.setDate(monthStart.getDate() - 30)
  const cutoff = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-${String(monthStart.getDate()).padStart(2, "0")}`

  for (const t of transactions) {
    balance += t.type === "revenue" ? t.baseAmount : -t.baseAmount
    if (t.type === "expense" && t.date >= cutoff) expense30d += t.baseAmount
  }

  const items: AppNotification[] = []
  if (balance < 0) {
    items.push({
      id: "cash-negative",
      kind: "cash-negative",
      severity: "critical",
      title: "Cash balance is negative",
      description: "Outflows have exceeded the cash position.",
      amount: Math.abs(balance),
      dueDate: null,
      to: "/cash-flow",
    })
  } else {
    const avgDaily = expense30d / 30
    const runwayDays = avgDaily > 0 ? balance / avgDaily : Infinity
    if (avgDaily > 0 && runwayDays < 30 * warningMonths) {
      items.push({
        id: "cash-low",
        kind: "cash-low",
        severity: "warning",
        title: "Low cash runway",
        description: `${Math.floor(runwayDays)} days at the current burn rate.`,
        amount: balance,
        dueDate: null,
        to: "/cash-flow",
      })
    }
  }
  return items
}

/**
 * Combine all notifications, critical first, then by due date.
 */
export function buildNotifications(
  transactions: Transaction[],
  invoices: Invoice[],
  bills: Bill[],
  openingBalance: number,
  today: string,
  horizonDays = 7,
): AppNotification[] {
  const all = [
    ...paymentAlerts(invoices, bills, today, horizonDays),
    ...cashAlerts(transactions, openingBalance, today),
  ]
  const severityRank: Record<NotificationSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  }
  return all.toSorted((a, b) => {
    const bySeverity = severityRank[a.severity] - severityRank[b.severity]
    if (bySeverity !== 0) return bySeverity
    return (a.dueDate ?? "").localeCompare(b.dueDate ?? "")
  })
}
