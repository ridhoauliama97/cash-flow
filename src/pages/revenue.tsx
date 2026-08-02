import { useMemo, useState } from "react"
import { Percent, Receipt, TrendingUp, Users } from "lucide-react"
import { EMPTY_FILTERS, type DashboardFilters, type PeriodKey } from "@/types"
import { dimensionValues, effectiveTransactions } from "@/lib/analytics/filter"
import { byDimension, byMonth, computeKpis } from "@/lib/analytics/kpis"
import { getPeriodRange, getPreviousRange } from "@/lib/analytics/periods"
import { formatMoney, formatNumber, formatPercent, formatPercentPlain } from "@/lib/format"
import { fromISODate } from "@/lib/utils"
import { AreaTrend } from "@/components/charts/area-trend"
import { DonutChart } from "@/components/charts/donut-chart"
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
