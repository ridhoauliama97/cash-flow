import type { CurrencyCode, DashboardFilters, Invoice, Transaction } from "@/types"

/**
 * Apply dashboard filters to transactions.
 * When basis === "accrual", outstanding (unpaid) invoice revenue is
 * recognized on the invoice issue date, giving an accrual-basis view.
 */
export function applyFilters(txs: Transaction[], filters: DashboardFilters): Transaction[] {
  return txs.filter((t) => {
    if (filters.type !== "all" && t.type !== filters.type) return false
    if (filters.dateFrom && t.date < filters.dateFrom) return false
    if (filters.dateTo && t.date > filters.dateTo) return false
    if (filters.category && t.category !== filters.category) return false
    if (filters.product && t.product !== filters.product) return false
    if (filters.client && t.client !== filters.client) return false
    if (filters.region && t.region !== filters.region) return false
    if (filters.department && t.department !== filters.department) return false
    if (filters.project && t.project !== filters.project) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const haystack = `${t.description} ${t.client ?? ""} ${t.category} ${t.product ?? ""}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}

/**
 * Convert outstanding invoices into synthetic revenue transactions (accrual basis).
 * Synthetic rows are denominated in the home currency: `amount` equals
 * `baseAmount` (home currency), so `currency` must match.
 */
export function accrualRevenue(
  invoices: Invoice[],
  dateFrom: string | null,
  dateTo: string | null,
  homeCurrency: CurrencyCode = "USD",
): Transaction[] {
  return invoices
    .filter((i) => {
      if (i.status === "paid") return false
      const outstanding = i.baseAmount - i.paidAmount
      if (outstanding <= 0) return false
      if (dateFrom && i.issueDate < dateFrom) return false
      if (dateTo && i.issueDate > dateTo) return false
      return true
    })
    .map((i) => {
      const outstanding = i.baseAmount - i.paidAmount
      return {
        id: `accrual-${i.id}`,
        date: i.issueDate,
        type: "revenue" as const,
        description: `${i.number} — ${i.client} (accrual)`,
        amount: outstanding,
        currency: homeCurrency, // amount and baseAmount are in home currency
        baseAmount: outstanding,
        category: "Accounts Receivable",
        client: i.client,
        project: i.project,
        createdAt: i.createdAt,
      }
    })
}

/** Transactions to analyze for a given filter set (respects accrual basis). */
export function effectiveTransactions(
  txs: Transaction[],
  invoices: Invoice[],
  filters: DashboardFilters,
  homeCurrency: CurrencyCode = "USD",
): Transaction[] {
  const base = applyFilters(txs, filters)
  if (filters.basis !== "accrual") return base
  const accrual = accrualRevenue(invoices, filters.dateFrom, filters.dateTo, homeCurrency)
  return [...base, ...accrual]
}

/** Distinct values of a dimension across transactions, sorted by usage. */
export function dimensionValues(txs: Transaction[], key: "product" | "client" | "region" | "department" | "project"): string[] {
  return Array.from(new Set(txs.map((t) => t[key]).filter((v): v is string => Boolean(v)))).toSorted()
}
