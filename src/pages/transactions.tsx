import { useMemo, useState } from "react"
import { Plus } from "lucide-react"

import type { DashboardFilters } from "@/types"
import { EMPTY_FILTERS } from "@/types"

import { applyFilters, dimensionValues } from "@/lib/analytics/filter"
import { sumByType } from "@/lib/analytics/kpis"
import { formatSigned } from "@/lib/format"
import { cn } from "@/lib/utils"

import { EmptyState } from "@/components/shared/empty-state"
import { FilterBar } from "@/components/shared/filter-bar"
import { PageHeader } from "@/components/shared/page-header"
import { TransactionFormDialog } from "@/components/shared/transaction-form-dialog"
import { TransactionsTable } from "@/components/shared/transactions-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { useApp } from "@/context/app-context"

export function TransactionsPage() {
  const { transactions, homeCurrency } = useApp()
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS)
  const [addOpen, setAddOpen] = useState(false)

  const options = useMemo(
    () => ({
      categories: Array.from(new Set(transactions.map((t) => t.category))).toSorted(),
      products: dimensionValues(transactions, "product"),
      clients: dimensionValues(transactions, "client"),
      regions: dimensionValues(transactions, "region"),
      departments: dimensionValues(transactions, "department"),
      projects: dimensionValues(transactions, "project"),
    }),
    [transactions],
  )

  const filtered = useMemo(() => applyFilters(transactions, filters), [transactions, filters])
  const totals = useMemo(() => sumByType(filtered), [filtered])
  const sorted = useMemo(() => filtered.toSorted((a, b) => b.date.localeCompare(a.date)), [filtered])

  const addButton = (
    <Button size="sm" onClick={() => setAddOpen(true)}>
      <Plus className="size-4" /> Add transaction
    </Button>
  )

  if (transactions.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Transactions" description="Every cash movement in and out of the business." actions={addButton} />
        <EmptyState
          title="No transactions yet"
          description="Add your first transaction to populate the ledger."
          actionLabel="Add transaction"
          onAction={() => setAddOpen(true)}
        />
        <TransactionFormDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" description="Every cash movement in and out of the business." actions={addButton} />

      <FilterBar filters={filters} onChange={setFilters} options={options} />

      <Card>
        <CardContent className="grid gap-4 py-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Revenue</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatSigned(totals.revenue, homeCurrency)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expenses</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-destructive">
              {formatSigned(totals.expenses, homeCurrency)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Net</p>
            <p className={cn("mt-1 text-xl font-semibold tabular-nums", totals.net < 0 && "text-destructive")}>
              {formatSigned(totals.net, homeCurrency)}
            </p>
          </div>
        </CardContent>
      </Card>

      <TransactionsTable transactions={sorted} />

      <TransactionFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
