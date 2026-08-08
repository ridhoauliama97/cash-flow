import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight, Flame, Landmark, PiggyBank, Plus, Repeat, TrendingDown, TrendingUp } from "lucide-react"
import { EMPTY_FILTERS, type DashboardFilters, type PeriodKey } from "@/types"
import { agingBuckets, overdueDays } from "@/lib/analytics/aging"
import { burnMetrics } from "@/lib/analytics/burn"
import { applyFilters, dimensionValues, effectiveTransactions } from "@/lib/analytics/filter"
import { byDimension, balanceBefore, byMonth, computeKpis, sumByType } from "@/lib/analytics/kpis"
import { mrrSummary } from "@/lib/analytics/mrr"
import { getPeriodRange, getPreviousRange } from "@/lib/analytics/periods"
import { formatDate, formatDurationDays, formatMoney, formatPercent, formatPercentPlain, formatSigned } from "@/lib/format"
import { cn, fromISODate, todayISO } from "@/lib/utils"
import { NEGATIVE_COLOR, POSITIVE_COLOR } from "@/lib/chart-colors"
import { DonutChart } from "@/components/charts/donut-chart"
import { RangeAreaChart } from "@/components/charts/range-area-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterBar } from "@/components/shared/filter-bar"
import { KpiCard } from "@/components/shared/kpi-card"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { PeriodSelect } from "@/components/shared/period-select"
import { TransactionFormDialog } from "@/components/shared/transaction-form-dialog"
import { useApp } from "@/context/app-context"

function initialsOf(description: string): string {
  const parts = description.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"
}

export function DashboardPage() {
  const { transactions, invoices, profile, homeCurrency } = useApp()
  const [period, setPeriod] = useState<PeriodKey>("this_month")
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS)
  const [addOpen, setAddOpen] = useState(false)

  const openingBalance = profile?.openingBalance ?? 0

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

  // Cash balance at the start of the selected period (not account inception).
  const periodStart = useMemo(
    () => balanceBefore(transactions, range.from, openingBalance),
    [transactions, range, openingBalance],
  )

  const rangeFilters = useMemo(() => ({ ...filters, dateFrom: range.from, dateTo: range.to }), [filters, range])
  const previousFilters = useMemo(
    () => ({ ...filters, dateFrom: previousRange.from, dateTo: previousRange.to }),
    [filters, previousRange],
  )

  const current = useMemo(
    () => effectiveTransactions(transactions, invoices, rangeFilters, homeCurrency),
    [transactions, invoices, rangeFilters],
  )
  const previous = useMemo(
    () => effectiveTransactions(transactions, invoices, previousFilters, homeCurrency),
    [transactions, invoices, previousFilters],
  )
  const trend = useMemo(
    () => byMonth(effectiveTransactions(transactions, invoices, filters, homeCurrency)).slice(-12),
    [transactions, invoices, filters],
  )

  const days = useMemo(() => {
    const ms = fromISODate(range.to).getTime() - fromISODate(range.from).getTime()
    return Math.max(1, Math.round(ms / 86_400_000) + 1)
  }, [range])

  const kpis = useMemo(
    () => computeKpis({ current, previous, openingBalance: periodStart, days }),
    [current, previous, periodStart, days],
  )
  const prevNet = useMemo(() => sumByType(previous).net, [previous])
  const cashDelta = kpis.net - prevNet
  const expenseByCategory = useMemo(
    () =>
      byDimension(current.filter((t) => t.type === "expense"), "category", 5).map((d) => ({
        name: d.name,
        value: d.value,
      })),
    [current],
  )

  const aging = useMemo(() => agingBuckets(invoices, todayISO()), [invoices])
  const atRisk = aging.atRisk.slice(0, 3)

  // Executive metrics respect the current filters but ignore the date range
  // so MRR and burn reflect the full ledger, not just the selected period.
  const filteredAll = useMemo(
    () => effectiveTransactions(transactions, invoices, filters, homeCurrency),
    [transactions, invoices, filters, homeCurrency],
  )
  const mrr = useMemo(() => mrrSummary(filteredAll), [filteredAll])
  const burn = useMemo(
    () => burnMetrics(applyFilters(transactions, { ...filters, dateFrom: null, dateTo: null }), openingBalance, 6),
    [transactions, filters, openingBalance],
  )

  // Sparkline series (last 12 months).
  const revenueSpark = useMemo(() => trend.map((p) => p.revenue), [trend])
  const expenseSpark = useMemo(() => trend.map((p) => p.expenses), [trend])
  const netSpark = useMemo(() => trend.map((p) => p.net), [trend])
  const cashSpark = useMemo(() => {
    let acc = 0
    return trend.map((p) => {
      acc += p.net
      return acc
    })
  }, [trend])

  const recent = useMemo(
    () =>
      applyFilters(transactions, filters)
        .toSorted((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [transactions, filters],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Cash position, revenue and expenses at a glance."
        actions={
          <>
            <PeriodSelect value={period} onChange={setPeriod} />
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4" /> Add transaction
            </Button>
            <Button asChild variant="outline">
              <Link to="/reports">
                <ArrowUpRight className="size-4" /> View reports
              </Link>
            </Button>
          </>
        }
      />

      <FilterBar filters={filters} onChange={setFilters} options={filterOptions} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={formatMoney(kpis.revenue, homeCurrency)}
          icon={TrendingUp}
          trend={{
            value: kpis.revenueGrowth === null ? "—" : formatPercent(kpis.revenueGrowth),
            positive: (kpis.revenueGrowth ?? 0) >= 0,
            neutral: kpis.revenueGrowth === null,
          }}
          sub={`${formatPercentPlain(kpis.margin)} margin`}
          sparkline={revenueSpark}
          sparklineColor={POSITIVE_COLOR}
        />
        <MetricCard
          label="Expenses"
          value={formatMoney(kpis.expenses, homeCurrency)}
          icon={TrendingDown}
          trend={{
            value: kpis.expenseGrowth === null ? "—" : formatPercent(kpis.expenseGrowth),
            positive: (kpis.expenseGrowth ?? 0) <= 0,
            neutral: kpis.expenseGrowth === null,
          }}
          sub={`${formatMoney(kpis.avgDailyExpense, homeCurrency, true)}/day`}
          sparkline={expenseSpark}
          sparklineColor={NEGATIVE_COLOR}
        />
        <MetricCard
          label="Net income"
          value={formatSigned(kpis.net, homeCurrency)}
          icon={PiggyBank}
          trend={{
            value: kpis.netGrowth === null ? "—" : formatPercent(kpis.netGrowth),
            positive: (kpis.netGrowth ?? 0) >= 0,
            neutral: kpis.netGrowth === null,
          }}
          sub="vs previous period"
          sparkline={netSpark}
          sparklineColor="var(--chart-3)"
        />
        <MetricCard
          label="Cash position"
          value={formatMoney(kpis.cashPosition, homeCurrency)}
          icon={Landmark}
          trend={{
            value: formatSigned(cashDelta, homeCurrency, true),
            positive: cashDelta >= 0,
          }}
          sub={kpis.runwayDays !== null ? `${kpis.runwayDays} days runway` : "No runway data"}
          sparkline={cashSpark}
          sparklineColor="var(--chart-4)"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="MRR"
          value={formatMoney(mrr.mrr, homeCurrency)}
          icon={Repeat}
          trend={{
            value: mrr.growthPct === null ? "—" : formatPercent(mrr.growthPct),
            positive: (mrr.growthPct ?? 0) >= 0,
            neutral: mrr.growthPct === null,
          }}
          sub={`${formatMoney(mrr.arr, homeCurrency, true)} ARR`}
        />
        <KpiCard
          label="Gross burn"
          value={formatMoney(burn.grossBurn, homeCurrency)}
          icon={Flame}
          sub={`avg / month (last ${burn.windowMonths})`}
        />
        <KpiCard
          label="Net burn"
          value={formatSigned(burn.netBurn, homeCurrency)}
          icon={TrendingDown}
          sub={burn.netBurn >= 0 ? "cash-flow positive" : "cash consumed monthly"}
        />
        <KpiCard
          label="Runway"
          value={burn.runwayDays === null ? "—" : formatDurationDays(burn.runwayDays)}
          icon={PiggyBank}
          sub={burn.runwayMonths === null ? "no expenses" : "at current gross burn"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Revenue vs expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAll.length === 0 ? (
            <EmptyState
              title="No data yet"
              description="Add transactions to see your daily revenue and expenses."
              onAction={() => setAddOpen(true)}
              actionLabel="Add transaction"
            />
          ) : (
            <RangeAreaChart
              transactions={filteredAll}
              openingBalance={openingBalance}
              currency={homeCurrency}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top expense categories</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={expenseByCategory}
              currency={homeCurrency}
              centerLabel="Expenses"
              centerValue={formatMoney(expenseByCategory.reduce((s, d) => s + d.value, 0), homeCurrency, true)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Needs attention</CardTitle>
          </CardHeader>
          <CardContent>
            {atRisk.length === 0 ? (
              <EmptyState
                title="No overdue invoices"
                description="All outstanding invoices are on time."
                className="py-10"
              />
            ) : (
              <ul className="divide-y">
                {atRisk.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{inv.client}</p>
                      <p className="text-xs text-muted-foreground">{inv.number} · due {formatDate(inv.dueDate)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">{formatMoney(inv.baseAmount, homeCurrency)}</span>
                      <Badge variant="destructive">{overdueDays(inv, todayISO())}d overdue</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent activity</CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link to="/transactions">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              title="No transactions"
              description="Add a transaction to get started."
              onAction={() => setAddOpen(true)}
              actionLabel="Add transaction"
            />
          ) : (
            <ul className="divide-y">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                    {initialsOf(t.description)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.description}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.category}
                      {t.client ? ` · ${t.client}` : ""} · {formatDate(t.date)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-medium tabular-nums",
                      t.type === "revenue"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive",
                    )}
                  >
                    {t.type === "revenue" ? "+" : "−"}
                    {formatMoney(t.baseAmount, homeCurrency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <TransactionFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
