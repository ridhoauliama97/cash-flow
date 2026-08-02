import type { Budget, CachedRates, Database, Invoice, ReportSchedule, Transaction } from "@/types"
import { fallbackRates } from "@/lib/currency"
import { mulberry32, shiftDays, toISODate } from "@/lib/utils"
import { DEMO_END, DEMO_START } from "@/lib/csv"

const REVENUE_CATEGORIES = [
  "Client Services",
  "Design Services",
  "Development",
  "Courses & Training",
  "Affiliate Income",
  "Advertising",
]
const EXPENSE_CATEGORIES = [
  "Salaries & Payroll",
  "Software & Subscriptions",
  "Marketing & Ads",
  "Travel",
  "Office & Supplies",
  "Contractors",
  "Taxes & Insurance",
  "Utilities",
]

const PRODUCTS = ["Web App", "Mobile App", "Brand Design", "Consulting", "Online Course", "API Access"]
const CLIENTS = [
  "Acme Corporation",
  "Beta GmbH",
  "Globex Ltd",
  "Initech",
  "Umbrella Co",
  "Stark Industries",
  "Wayne Enterprises",
  "Hooli",
]
const DEPARTMENTS = ["Product", "Design", "Engineering", "Marketing", "Operations"]
const PROJECTS = ["Website Retainer", "Brand Refresh", "Mobile App v2", "SaaS Platform", "Marketing Site"]
const METHODS = ["Bank Transfer", "PayPal", "Stripe", "Credit Card", "Wire"]

export interface DemoProfileConfig {
  name: string
  company: string
}

/**
 * Generate a realistic, deterministic multi-currency dataset covering
 * the last 12 months (revenue, expenses, invoices, budgets, schedules).
 */
export function generateDemoData(profile: DemoProfileConfig = { name: "Alex Morgan", company: "Morgan Studio" }): Database {
  const rand = mulberry32(20260802)
  const today = new Date()
  const rates = fallbackRates("IDR")

  const rnd = (min: number, max: number) => min + rand() * (max - min)
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
  const chance = (p: number) => rand() < p

  // Month-over-month growth: start smaller, end larger (growing business).
  const monthIndex = (date: Date) => (date.getFullYear() - today.getFullYear()) * 12 + date.getMonth() - today.getMonth()
  const growthFactor = (date: Date) => 0.55 + 0.045 * (monthIndex(date) + 12)

  const transactions: Transaction[] = []
  let cursor = new Date(today)
  cursor.setDate(1)

  // Walk backwards 12 full months + current partial month.
  for (let m = 0; m < 13; m++) {
    const month = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const gf = growthFactor(month)
    const isCurrent = m === 0

    // Revenue transactions: 5-9 per month, mostly USD/EUR with a few JPY/CAD/AUD.
    const revCount = Math.round(rnd(5, 9))
    for (let i = 0; i < revCount; i++) {
      const day = isCurrent ? Math.min(Math.floor(rnd(1, today.getDate() + 1)), daysInMonth) : Math.floor(rnd(1, daysInMonth + 1))
      const currency = chance(0.5) ? "USD" : chance(0.3) ? "EUR" : chance(0.5) ? "JPY" : pick(["CAD", "AUD"] as const)
      const amountRaw = rnd(600, 6500) * gf
      const amount = Math.round(amountRaw * (currency === "JPY" ? 100 : 1)) / (currency === "JPY" ? 100 : 1)
      const rate = rates.rates[currency]
      transactions.push({
        id: `tx-${month.toISOString().slice(0, 7)}-r${i}`,
        date: toISODate(new Date(month.getFullYear(), month.getMonth(), day)),
        type: "revenue",
        description: pick([
          "Monthly retainer",
          "Project milestone",
          "Design sprint",
          "License renewal",
          "Course sales",
          "Ad revenue share",
        ]),
        amount,
        currency,
        baseAmount: Math.round(amount / rate),
        category: pick(REVENUE_CATEGORIES),
        product: pick(PRODUCTS),
        client: pick(CLIENTS),
        region: currency === "EUR" ? "Europe" : currency === "JPY" ? "Asia" : currency === "AUD" || currency === "CAD" ? "Oceania" : "North America",
        department: "Product",
        project: pick(PROJECTS),
        paymentMethod: pick(METHODS),
        createdAt: toISODate(new Date(month.getFullYear(), month.getMonth(), day)),
      })
    }

    // Expense transactions: 7-12 per month.
    const expCount = Math.round(rnd(7, 12))
    for (let i = 0; i < expCount; i++) {
      const day = isCurrent ? Math.min(Math.floor(rnd(1, today.getDate() + 1)), daysInMonth) : Math.floor(rnd(1, daysInMonth + 1))
      const currency = chance(0.75) ? "USD" : chance(0.6) ? "EUR" : "GBP"
      const amount = Math.round(rnd(20, 1200) * gf * (currency === "GBP" ? 0.85 : 1))
      const rate = rates.rates[currency]
      transactions.push({
        id: `tx-${month.toISOString().slice(0, 7)}-e${i}`,
        date: toISODate(new Date(month.getFullYear(), month.getMonth(), day)),
        type: "expense",
        description: pick([
          "Software subscription",
          "Contractor invoice",
          "Cloud hosting",
          "Team lunch",
          "Flight & hotel",
          "Marketing spend",
          "Office supplies",
          "Bank transfer fee",
        ]),
        amount,
        currency,
        baseAmount: Math.round(amount / rate),
        category: pick(EXPENSE_CATEGORIES),
        department: pick(DEPARTMENTS),
        paymentMethod: pick(METHODS),
        createdAt: toISODate(new Date(month.getFullYear(), month.getMonth(), day)),
      })
    }
    cursor = new Date(month.getFullYear(), month.getMonth() - 1, 1)
  }

  // Invoices: ~20 across aging buckets (current, 30, 60, 90+ overdue).
  const invoices: Invoice[] = []
  const todayIso = toISODate(today)
  const invRand = mulberry32(20260717)
  const invPick = <T,>(arr: T[]): T => arr[Math.floor(invRand() * arr.length)]
  const invRnd = (min: number, max: number) => min + invRand() * (max - min)

  const buckets: Array<{ issueOffset: number; dueOffset: number; paid: boolean; base: number }> = []
  for (let i = 0; i < 4; i++) {
    buckets.push({ issueOffset: -invRnd(3, 15), dueOffset: -invRnd(0, 2), paid: true, base: 1 })
  }
  for (let i = 0; i < 5; i++) {
    buckets.push({ issueOffset: -invRnd(2, 25), dueOffset: -invRnd(1, 28), paid: false, base: 1 })
  }
  for (let i = 0; i < 4; i++) {
    buckets.push({ issueOffset: -invRnd(25, 55), dueOffset: -invRnd(29, 60), paid: false, base: 1 })
  }
  for (let i = 0; i < 4; i++) {
    buckets.push({ issueOffset: -invRnd(55, 120), dueOffset: -invRnd(61, 130), paid: false, base: 1 })
  }

  buckets.forEach((b, i) => {
    const issue = shiftDays(todayIso, b.issueOffset)
    const due = shiftDays(todayIso, b.dueOffset)
    const currency = invRnd(0, 1) > 0.55 ? "USD" : invRnd(0, 1) > 0.4 ? "EUR" : "USD"
    const amount = Math.round(invRnd(500, 8000))
    const rate = rates.rates[currency]
    const baseAmount = Math.round(amount / rate)
    const paidAmount = b.paid ? baseAmount : invRnd(0, 1) > 0.7 ? Math.round(baseAmount * 0.4) : 0
    invoices.push({
      id: `inv-${i}`,
      number: `INV-2026-${String(100 + i)}`,
      client: invPick(CLIENTS),
      issueDate: issue,
      dueDate: due,
      amount,
      currency,
      baseAmount,
      paidAmount,
      status: b.paid ? "paid" : paidAmount > 0 ? "partial" : "unpaid",
      project: invPick(PROJECTS),
      createdAt: issue,
    })
  })

  // Budgets: last 3 months + next month per expense category.
  const budgets: Budget[] = []
  for (let m = 1; m >= -1; m--) {
    const base = new Date(today.getFullYear(), today.getMonth() - m, 1)
    const key = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`
    EXPENSE_CATEGORIES.forEach((cat, i) => {
      budgets.push({
        id: `budget-${key}-${i}`,
        month: key,
        category: cat,
        amount: Math.round(rnd(250, 2500) * 100),
      })
    })
  }

  const schedules: ReportSchedule[] = [
    {
      id: "sch-1",
      name: "Weekly client report",
      frequency: "weekly",
      format: "pdf",
      recipients: "finance@morganstudio.io",
      enabled: true,
      lastSentAt: shiftDays(todayIso, -3) + "T09:00:00Z",
      nextRunAt: shiftDays(todayIso, 4) + "T09:00:00Z",
    },
    {
      id: "sch-2",
      name: "Monthly P&L to partners",
      frequency: "monthly",
      format: "both",
      recipients: "partners@morganstudio.io, cfo@morganstudio.io",
      enabled: true,
      lastSentAt: null,
      nextRunAt: todayIso.slice(0, 8) + "01T08:00:00Z",
    },
  ]

  const demoProfile: Database["profile"] = {
    id: "local-demo",
    name: profile.name,
    company: profile.company,
    homeCurrency: "IDR",
    openingBalance: 85_000_000, // Rp 85M starting cash
  }

  const sortedTx = transactions.toSorted((a, b) => a.date.localeCompare(b.date))
  const sortedInvoices = invoices.toSorted((a, b) => a.dueDate.localeCompare(b.dueDate))

  return {
    profile: demoProfile,
    transactions: sortedTx,
    invoices: sortedInvoices,
    budgets,
    schedules,
    rates: { ...rates, fetchedAt: new Date().toISOString() } as CachedRates,
  }
}

/** Month keys covered by the demo data, oldest first. */
export function demoMonthKeys(): string[] {
  const keys = new Set<string>()
  for (let m = 0; m < 13; m++) {
    const d = new Date(DEMO_END)
    const base = new Date(d.getFullYear(), d.getMonth() - m, 1)
    keys.add(`${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`)
  }
  return [...keys].toSorted()
}

/** Compact but realistic summary of the demo dataset (for the import page). */
export function demoSummary(): { transactions: number; invoices: number; period: string } {
  return {
    transactions: 150,
    invoices: 17,
    period: `${DEMO_START} → ${DEMO_END}`,
  }
}
