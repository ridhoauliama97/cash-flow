import { useMemo, useState } from "react"
import { Percent, Receipt, Repeat, TrendingUp, Users } from "lucide-react"
import { EMPTY_FILTERS, type DashboardFilters, type PeriodKey } from "@/types"
import { dimensionValues, effectiveTransactions } from "@/lib/analytics/filter"
import { byDimension, byMonth, computeKpis } from "@/lib/analytics/kpis"
import { mrrByMonth, mrrDeltaByMonth, mrrSummary } from "@/lib/analytics/mrr"
import { getPeriodRange, getPreviousRange } from "@/lib/analytics/periods"
import { formatMoney, formatNumber, formatPercent, formatPercentPlain } from "@/lib/format"
import { fromISODate } from "@/lib/utils"
import { AreaTrend } from "@/components/charts/area-trend"
import { DonutChart } from "@/components/charts/donut-chart"
import { MrrDeltaChart } from "@/components/charts/mrr-delta-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterBar } from "@/components/shared/filter-bar"
import { KpiCard } from "@/components/shared/kpi-card"
import { PageHeader } from "@/components/shared/page-header"
import { PeriodSelect } from "@/components/shared/period-select"
import { useApp } from "@/context/app-context"

export function RevenuePage() {
  const { transactions, invoices, profile, homeCurrency } = useApp()
  const [period, setPeriod] = useState<PeriodKey>("this_month")
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS)

  const openingBalance = profile?.openingBalance ?? 0
  const revFilters = useMemo<DashboardFilters>(() => ({ ...filters, type: "revenue" }), [filters])

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
        ...revFilters,
        dateFrom: range.from,
        dateTo: range.to,
      }, homeCurrency),
    [transactions, invoices, revFilters, range, homeCurrency],
  )
  const previous = useMemo(
    () =>
      effectiveTransactions(transactions, invoices, {
        ...revFilters,
        dateFrom: previousRange.from,
        dateTo: previousRange.to,
      }, homeCurrency),
    [transactions, invoices, revFilters, previousRange, homeCurrency],
  )
  const trend = useMemo(
    () => byMonth(effectiveTransactions(transactions, invoices, revFilters, homeCurrency)).slice(-12),
    [transactions, invoices, revFilters, homeCurrency],
  )

  const filteredTxs = useMemo(
    () => effectiveTransactions(transactions, invoices, revFilters, homeCurrency),
    [transactions, invoices, revFilters, homeCurrency],
  )
  const mrr = useMemo(() => mrrSummary(filteredTxs), [filteredTxs])
  const mrrTrend = useMemo(
    () =>
      mrrByMonth(filteredTxs).map((p) => ({
        key: p.key,
        label: p.label,
        revenue: p.mrr,
        expenses: 0,
        net: p.mrr,
      })),
    [filteredTxs],
  )
  const mrrDeltas = useMemo(() => mrrDeltaByMonth(filteredTxs), [filteredTxs])
  const recurringShare =
    filteredTxs.length > 0
      ? (mrrTrend.reduce((s, p) => s + p.revenue, 0) / Math.max(1, filteredTxs.reduce((s, t) => s + t.baseAmount, 0))) * 100
      : 0

  const days = useMemo(() => {
    const ms = fromISODate(range.to).getTime() - fromISODate(range.from).getTime()
    return Math.max(1, Math.round(ms / 86_400_000) + 1)
  }, [range])

  const kpis = useMemo(
    () => computeKpis({ current, previous, openingBalance, days }),
    [current, previous, openingBalance, days],
  )

  const revenueCount = current.length
  const avgTransaction = revenueCount > 0 ? kpis.revenue / revenueCount : 0

  const byProduct = useMemo(
    () => byDimension(current, "product", 6).map((d) => ({ name: d.name, value: d.value })),
    [current],
  )
  const byClient = useMemo(
    () => byDimension(current, "client", 6).map((d) => ({ name: d.name, value: d.value })),
    [current],
  )
  const byRegion = useMemo(
    () => byDimension(current, "region", 6).map((d) => ({ name: d.name, value: d.value })),
    [current],
  )
  const topClients = useMemo(() => byDimension(current, "client"), [current])
  const topClient = topClients[0]

  const sum = (points: Array<{ name: string; value: number }>) =>
    points.reduce((s, d) => s + d.value, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue"
        description="Where your income comes from and how it is trending."
        actions={<PeriodSelect value={period} onChange={setPeriod} />}
      />

      <FilterBar filters={filters} onChange={setFilters} options={filterOptions} showType={false} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={formatMoney(kpis.revenue, homeCurrency)}
          icon={TrendingUp}
          trend={{
            value: kpis.revenueGrowth === null ? "—" : formatPercent(kpis.revenueGrowth),
            positive: (kpis.revenueGrowth ?? 0) >= 0,
            neutral: kpis.revenueGrowth === null,
          }}
          sub={`${revenueCount} transactions`}
        />
        <KpiCard
          label="Growth"
          value={kpis.revenueGrowth === null ? "—" : formatPercent(kpis.revenueGrowth)}
          icon={Percent}
          sub="vs previous period"
        />
        <KpiCard
          label="Avg transaction"
          value={formatMoney(avgTransaction, homeCurrency)}
          icon={Receipt}
          sub="per transaction"
        />
        <KpiCard
          label="Top client"
          value={formatMoney(topClient?.value ?? 0, homeCurrency)}
          icon={Users}
          sub={topClient?.name ?? "No clients"}
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
          sub="recurring revenue / month"
        />
        <KpiCard
          label="ARR"
          value={formatMoney(mrr.arr, homeCurrency)}
          icon={TrendingUp}
          sub="annual run-rate (MRR × 12)"
        />
        <KpiCard
          label="Recurring clients"
          value={formatNumber(mrr.clientCount)}
          icon={Users}
          sub="contributing to MRR"
        />
        <KpiCard
          label="Recurring share"
          value={mrrTrend.length > 0 ? formatPercentPlain(recurringShare) : "—"}
          icon={Percent}
          sub="of total revenue (all-time)"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>MRR trend</CardTitle>
          </CardHeader>
          <CardContent>
            {mrrTrend.length === 0 ? (
              <EmptyState
                title="No recurring revenue"
                description="Transactions with a subscription-like product (retainer, SaaS, support plan…) feed the MRR series."
              />
            ) : (
              <AreaTrend data={mrrTrend} currency={homeCurrency} height={280} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>MRR movement</CardTitle>
          </CardHeader>
          <CardContent>
            {mrrDeltas.length === 0 ? (
              <EmptyState
                title="No recurring revenue"
                description="Assign a client and a subscription-like product to see new, expansion, contraction and churn."
              />
            ) : (
              <MrrDeltaChart data={mrrDeltas} currency={homeCurrency} height={280} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Revenue trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <EmptyState
              title="No revenue yet"
              description="Add revenue transactions to see your monthly trend."
            />
          ) : (
            <AreaTrend data={trend} currency={homeCurrency} height={300} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>By product</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={byProduct}
              currency={homeCurrency}
              centerLabel="Total"
              centerValue={formatMoney(sum(byProduct), homeCurrency, true)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By client</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={byClient}
              currency={homeCurrency}
              centerLabel="Total"
              centerValue={formatMoney(sum(byClient), homeCurrency, true)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By region</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={byRegion}
              currency={homeCurrency}
              centerLabel="Total"
              centerValue={formatMoney(sum(byRegion), homeCurrency, true)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Top clients</CardTitle>
        </CardHeader>
        <CardContent>
          {topClients.length === 0 ? (
            <EmptyState
              title="No clients"
              description="Revenue with a client assigned will appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(c.count)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(c.value, homeCurrency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {kpis.revenue > 0 ? formatPercentPlain((c.value / kpis.revenue) * 100) : "0.0%"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
