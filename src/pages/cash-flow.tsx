import { useMemo, useState } from "react"
import { CalendarClock, Flame, Landmark, TrendingDown, TrendingUp, Wallet } from "lucide-react"

import type { DashboardFilters, PeriodKey } from "@/types"
import { EMPTY_FILTERS } from "@/types"

import { applyFilters, dimensionValues, effectiveTransactions } from "@/lib/analytics/filter"
import { balanceBefore, computeKpis, dailyBalances } from "@/lib/analytics/kpis"
import { burnMetrics } from "@/lib/analytics/burn"
import { getPeriodRange, getPreviousRange } from "@/lib/analytics/periods"
import { cashFlowWaterfall, weeklyPattern } from "@/lib/analytics/waterfall"
import { formatDurationDays, formatMoney, formatPercent, formatSigned } from "@/lib/format"
import { daysBetween, todayISO } from "@/lib/utils"

import { BalanceChart } from "@/components/charts/balance-chart"
import { BarCompare } from "@/components/charts/bar-compare"
import { WaterfallChart } from "@/components/charts/waterfall-chart"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterBar } from "@/components/shared/filter-bar"
import { KpiCard, StatRow } from "@/components/shared/kpi-card"
import { PageHeader } from "@/components/shared/page-header"
import { PeriodSelect } from "@/components/shared/period-select"
import { TransactionFormDialog } from "@/components/shared/transaction-form-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { useApp } from "@/context/app-context"

export function CashFlowPage() {
  const { profile, transactions, invoices, homeCurrency } = useApp()
  const [period, setPeriod] = useState<PeriodKey>("this_month")
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS)
  const [addOpen, setAddOpen] = useState(false)

  const today = todayISO()
  const openingBalance = profile?.openingBalance ?? 0

  const range = useMemo(() => getPeriodRange(period, today), [period, today])
  const previousRange = useMemo(() => getPreviousRange(range), [range])

  // Cash balance at the start of the selected period (not account inception).
  const periodStart = useMemo(
    () => balanceBefore(transactions, range.from, openingBalance),
    [transactions, range, openingBalance],
  )

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

  // Cash-ledger view for the waterfall / balance charts (actual money movement).
  const rangeTxs = useMemo(
    () => applyFilters(transactions, { ...filters, dateFrom: range.from, dateTo: range.to }),
    [transactions, filters, range],
  )
  // Accrual-aware views for KPIs.
  const current = useMemo(
    () => effectiveTransactions(transactions, invoices, { ...filters, dateFrom: range.from, dateTo: range.to }, homeCurrency),
    [transactions, invoices, filters, range],
  )
  const previous = useMemo(
    () => effectiveTransactions(transactions, invoices, { ...filters, dateFrom: previousRange.from, dateTo: previousRange.to }, homeCurrency),
    [transactions, invoices, filters, previousRange],
  )
  const days = useMemo(() => daysBetween(range.from, range.to) + 1, [range])
  const kpis = useMemo(
    () => computeKpis({ current, previous, openingBalance: periodStart, days }),
    [current, previous, periodStart, days],
  )

  const waterfall = useMemo(() => cashFlowWaterfall(rangeTxs, periodStart), [rangeTxs, periodStart])
  const balances = useMemo(
    () => dailyBalances(rangeTxs, periodStart, range.from, range.to),
    [rangeTxs, periodStart, range],
  )
  const weekly = useMemo(
    () => weeklyPattern(rangeTxs).map((p) => ({ name: p.day, actual: p.value })),
    [rangeTxs],
  )

  const growthTrend = (growth: number | null) =>
    growth === null
      ? { value: "n/a", positive: false, neutral: true }
      : { value: formatPercent(growth), positive: growth >= 0 }

  // Burn-rate metrics respect the current filters but ignore the date range
  // so the runway reflects the full ledger, not just the selected period.
  const burn = useMemo(
    () => burnMetrics(applyFilters(transactions, { ...filters, dateFrom: null, dateTo: null }), openingBalance, 6),
    [transactions, filters, openingBalance],
  )

  if (transactions.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cash Flow" description="Cash movement across the selected period." actions={<PeriodSelect value={period} onChange={setPeriod} />} />
        <EmptyState
          title="No transactions yet"
          description="Add your first transaction to start tracking cash flow and runway."
          actionLabel="Add transaction"
          onAction={() => setAddOpen(true)}
        />
        <TransactionFormDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Flow"
        description="Cash movement across the selected period, from opening to closing balance."
        actions={<PeriodSelect value={period} onChange={setPeriod} />}
      />

      <FilterBar filters={filters} onChange={setFilters} options={options} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Net cash flow"
          value={formatSigned(kpis.net, homeCurrency)}
          icon={kpis.net >= 0 ? TrendingUp : TrendingDown}
          trend={growthTrend(kpis.netGrowth)}
          sub="vs previous period"
        />
        <KpiCard label="Opening balance" value={formatMoney(periodStart, homeCurrency)} icon={Wallet} sub="start of period" />
        <KpiCard label="Closing balance" value={formatMoney(kpis.cashPosition, homeCurrency)} icon={Landmark} sub="opening + net flow" />
        <KpiCard
          label="Runway days"
          value={kpis.runwayDays === null || kpis.runwayDays < 0 ? "—" : formatDurationDays(kpis.runwayDays)}
          icon={CalendarClock}
          sub={`${formatMoney(kpis.avgDailyExpense, homeCurrency, true)}/day avg expense`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="size-4 text-muted-foreground" />
              Burn rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <StatRow label={`Gross burn · avg / month (last ${burn.windowMonths})`} value={formatMoney(burn.grossBurn, homeCurrency)} />
            <StatRow
              label="Net burn · avg / month"
              value={formatSigned(burn.netBurn, homeCurrency)}
              hint={burn.netBurn >= 0 ? "cash-flow positive" : "cash consumed monthly"}
            />
            <StatRow
              label="Runway"
              value={burn.runwayDays === null ? "—" : formatDurationDays(burn.runwayDays)}
              hint={burn.runwayMonths === null ? "no expenses" : "at current gross burn"}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cash position</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <StatRow label="Cash on hand" value={formatMoney(burn.cashPosition, homeCurrency)} />
            <StatRow label="Gross burn" value={formatMoney(burn.grossBurn, homeCurrency)} hint={`avg of last ${burn.windowMonths} month${burn.windowMonths === 1 ? "" : "s"}`} />
            <StatRow label="Net burn" value={formatSigned(burn.netBurn, homeCurrency)} hint="revenue − expenses, monthly average" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cash flow waterfall</CardTitle>
          </CardHeader>
          <CardContent>
            <WaterfallChart data={waterfall} currency={homeCurrency} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily balance</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceChart data={balances} currency={homeCurrency} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly spending pattern</CardTitle>
        </CardHeader>
        <CardContent>
          <BarCompare data={weekly} currency={homeCurrency} actualLabel="Spending" />
        </CardContent>
      </Card>

      <TransactionFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
