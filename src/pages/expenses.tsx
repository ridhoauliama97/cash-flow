import { useMemo, useState } from "react"
import { CalendarClock, Percent, Receipt, Target } from "lucide-react"
import { EMPTY_FILTERS, type DashboardFilters, type PeriodKey } from "@/types"
import { budgetVsActual, totalActual, totalBudget } from "@/lib/analytics/compare"
import { dimensionValues, effectiveTransactions } from "@/lib/analytics/filter"
import { byDimension, computeKpis } from "@/lib/analytics/kpis"
import { getPeriodRange, getPreviousRange } from "@/lib/analytics/periods"
import { formatMoney, formatMonthKey, formatPercent, formatPercentPlain } from "@/lib/format"
import { fromISODate, todayISO } from "@/lib/utils"
import { BarCompare } from "@/components/charts/bar-compare"
import { DonutChart } from "@/components/charts/donut-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterBar } from "@/components/shared/filter-bar"
import { KpiCard } from "@/components/shared/kpi-card"
import { PageHeader } from "@/components/shared/page-header"
import { PeriodSelect } from "@/components/shared/period-select"
import { useApp } from "@/context/app-context"

export function ExpensesPage() {
  const { transactions, invoices, budgets, profile, homeCurrency } = useApp()
  const [period, setPeriod] = useState<PeriodKey>("this_month")
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS)
  const [budgetMonth, setBudgetMonth] = useState<string | null>(null)

  const openingBalance = profile?.openingBalance ?? 0
  const expFilters = useMemo<DashboardFilters>(() => ({ ...filters, type: "expense" }), [filters])

  const filterOptions = useMemo(
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

  const range = useMemo(() => getPeriodRange(period), [period])
  const previousRange = useMemo(() => getPreviousRange(range), [range])

  const current = useMemo(
    () =>
      effectiveTransactions(transactions, invoices, {
        ...expFilters,
        dateFrom: range.from,
        dateTo: range.to,
      }, homeCurrency),
    [transactions, invoices, expFilters, range, homeCurrency],
  )
  const previous = useMemo(
    () =>
      effectiveTransactions(transactions, invoices, {
        ...expFilters,
        dateFrom: previousRange.from,
        dateTo: previousRange.to,
      }, homeCurrency),
    [transactions, invoices, expFilters, previousRange, homeCurrency],
  )

  const days = useMemo(() => {
    const ms = fromISODate(range.to).getTime() - fromISODate(range.from).getTime()
    return Math.max(1, Math.round(ms / 86_400_000) + 1)
  }, [range])

  const kpis = useMemo(
    () => computeKpis({ current, previous, openingBalance, days }),
    [current, previous, openingBalance, days],
  )

  // Budget usage for the month containing the selected period.
  const budgetMonthKey = range.from.slice(0, 7)
  const monthBudget = totalBudget(budgets, budgetMonthKey)
  const monthActual = totalActual(transactions, budgetMonthKey)
  const budgetUsage = monthBudget > 0 ? (monthActual / monthBudget) * 100 : null

  const expenseByCategory = useMemo(
    () => byDimension(current, "category", 6).map((d) => ({ name: d.name, value: d.value })),
    [current],
  )
  const categoryTotal = expenseByCategory.reduce((s, d) => s + d.value, 0)

  const budgetMonths = useMemo(
    () => Array.from(new Set(budgets.map((b) => b.month))).toSorted(),
    [budgets],
  )
  const selectedMonth = budgetMonth ?? budgetMonths.at(-1) ?? todayISO().slice(0, 7)
  const budgetLines = useMemo(
    () => budgetVsActual(transactions, budgets, selectedMonth),
    [transactions, budgets, selectedMonth],
  )
  const barData = budgetLines.map((l) => ({ name: l.category, actual: l.actual, budget: l.budget }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Spending by category and performance against budget."
        actions={<PeriodSelect value={period} onChange={setPeriod} />}
      />

      <FilterBar filters={filters} onChange={setFilters} options={filterOptions} showType={false} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Expenses"
          value={formatMoney(kpis.expenses, homeCurrency)}
          icon={Receipt}
          trend={{
            value: kpis.expenseGrowth === null ? "—" : formatPercent(kpis.expenseGrowth),
            positive: (kpis.expenseGrowth ?? 0) <= 0,
            neutral: kpis.expenseGrowth === null,
          }}
          sub={`${current.length} transactions`}
        />
        <KpiCard
          label="Budget usage"
          value={budgetUsage === null ? "—" : formatPercentPlain(budgetUsage, 0)}
          icon={Target}
          trend={
            budgetUsage === null
              ? undefined
              : {
                  value: budgetUsage <= 100 ? "On track" : "Over budget",
                  positive: budgetUsage <= 100,
                }
          }
          sub={
            monthBudget > 0
              ? `${formatMoney(monthActual, homeCurrency, true)} of ${formatMoney(monthBudget, homeCurrency, true)}`
              : "No budget for this month"
          }
        />
        <KpiCard
          label="Avg daily expense"
          value={formatMoney(kpis.avgDailyExpense, homeCurrency)}
          icon={CalendarClock}
          sub="per day"
        />
        <KpiCard
          label="Net margin"
          value={formatPercentPlain(kpis.margin)}
          icon={Percent}
          trend={{
            value: kpis.netGrowth === null ? "—" : formatPercent(kpis.netGrowth),
            positive: (kpis.netGrowth ?? 0) >= 0,
            neutral: kpis.netGrowth === null,
          }}
          sub="net ÷ revenue"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Expenses by category</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={expenseByCategory}
              currency={homeCurrency}
              centerLabel="Expenses"
              centerValue={formatMoney(categoryTotal, homeCurrency, true)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Budget vs actual</CardTitle>
            {budgetMonths.length > 0 && (
              <Select value={selectedMonth} onValueChange={setBudgetMonth}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {budgetMonths.map((m) => (
                    <SelectItem key={m} value={m}>
                      {formatMonthKey(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent>
            {budgetLines.length === 0 ? (
              <EmptyState
                title="No budgets for this month"
                description="Create budgets per category to compare against actual spending."
              />
            ) : (
              <>
                <BarCompare data={barData} currency={homeCurrency} height={260} />
                <div className="mt-6 space-y-4 border-t pt-4">
                  {budgetLines.map((l) => (
                    <div key={l.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{l.category}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatMoney(l.actual, homeCurrency, true)} /{" "}
                          {formatMoney(l.budget, homeCurrency, true)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={Math.min(l.used, 100)} />
                        <span className="w-11 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {formatPercentPlain(l.used, 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
