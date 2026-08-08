import { useMemo, useState } from "react"
import { Percent, PiggyBank, TrendingDown, TrendingUp } from "lucide-react"
import { EMPTY_FILTERS, type DashboardFilters, type PeriodKey } from "@/types"
import { dimensionValues, effectiveTransactions } from "@/lib/analytics/filter"
import { byMonth } from "@/lib/analytics/kpis"
import { getPeriodRange, getPreviousRange } from "@/lib/analytics/periods"
import { profitByDimension, profitabilitySummary } from "@/lib/analytics/profitability"
import { formatMoney, formatNumber, formatPercent, formatPercentPlain } from "@/lib/format"
import { fromISODate } from "@/lib/utils"
import { MarginTrend, type MarginPoint } from "@/components/charts/margin-trend"
import { ProfitBars } from "@/components/charts/profit-bars"
import { ProfitTrend } from "@/components/charts/profit-trend"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterBar } from "@/components/shared/filter-bar"
import { KpiCard } from "@/components/shared/kpi-card"
import { PageHeader } from "@/components/shared/page-header"
import { PeriodSelect } from "@/components/shared/period-select"
import { useApp } from "@/context/app-context"

const DIMENSIONS = ["client", "product", "region"] as const
type DimensionKey = (typeof DIMENSIONS)[number]

export function ProfitabilityPage() {
  const { transactions, invoices, homeCurrency } = useApp()
  const [period, setPeriod] = useState<PeriodKey>("this_month")
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS)
  const [dimension, setDimension] = useState<DimensionKey>("client")

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
        ...filters,
        dateFrom: range.from,
        dateTo: range.to,
      }, homeCurrency),
    [transactions, invoices, filters, range, homeCurrency],
  )
  const previous = useMemo(
    () =>
      effectiveTransactions(transactions, invoices, {
        ...filters,
        dateFrom: previousRange.from,
        dateTo: previousRange.to,
      }, homeCurrency),
    [transactions, invoices, filters, previousRange, homeCurrency],
  )

  const days = useMemo(() => {
    const ms = fromISODate(range.to).getTime() - fromISODate(range.from).getTime()
    return Math.max(1, Math.round(ms / 86_400_000) + 1)
  }, [range])

  const summary = useMemo(
    () => profitabilitySummary(current, previous, days),
    [current, previous, days],
  )

  const monthly = useMemo(
    () =>
      byMonth(
        effectiveTransactions(transactions, invoices, filters, homeCurrency),
      ).slice(-12),
    [transactions, invoices, filters, homeCurrency],
  )

  const marginTrend = useMemo<MarginPoint[]>(
    () =>
      monthly.map((m) => ({
        label: m.label,
        margin: m.revenue > 0 ? (m.net / m.revenue) * 100 : null,
      })),
    [monthly],
  )

  const byDimension = useMemo(
    () => profitByDimension(current, dimension, 8),
    [current, dimension],
  )

  const dimLabel: Record<DimensionKey, string> = {
    client: "Client",
    product: "Product",
    region: "Region",
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profitability"
        description="Net profit and margins across your business."
        actions={<PeriodSelect value={period} onChange={setPeriod} />}
      />

      <FilterBar filters={filters} onChange={setFilters} options={filterOptions} showType={false} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={formatMoney(summary.revenue, homeCurrency)}
          icon={TrendingUp}
          trend={{
            value: summary.revenueGrowth === null ? "—" : formatPercent(summary.revenueGrowth),
            positive: (summary.revenueGrowth ?? 0) >= 0,
            neutral: summary.revenueGrowth === null,
          }}
          sub="vs previous period"
        />
        <KpiCard
          label="Expenses"
          value={formatMoney(summary.expenses, homeCurrency)}
          icon={TrendingDown}
          trend={{
            value: summary.expenseGrowth === null ? "—" : formatPercent(summary.expenseGrowth),
            positive: (summary.expenseGrowth ?? 0) <= 0,
            neutral: summary.expenseGrowth === null,
          }}
          sub="vs previous period"
        />
        <KpiCard
          label="Net profit"
          value={formatMoney(summary.net, homeCurrency)}
          icon={PiggyBank}
          trend={{
            value: summary.netGrowth === null ? "—" : formatPercent(summary.netGrowth),
            positive: (summary.netGrowth ?? 0) >= 0,
            neutral: summary.netGrowth === null,
          }}
          sub="vs previous period"
        />
        <KpiCard
          label="Net margin"
          value={formatPercentPlain(summary.margin)}
          icon={Percent}
          trend={{
            value: summary.marginDelta === null ? "—" : formatPercent(summary.marginDelta),
            positive: (summary.marginDelta ?? 0) >= 0,
            neutral: summary.marginDelta === null,
          }}
          sub="vs previous period (pp)"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly profit</CardTitle>
          </CardHeader>
          <CardContent>
            {monthly.length === 0 ? (
              <EmptyState
                title="No data yet"
                description="Add revenue and expense transactions to see your monthly profit trend."
              />
            ) : (
              <ProfitTrend data={monthly} currency={homeCurrency} height={280} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Margin by month</CardTitle>
          </CardHeader>
          <CardContent>
            {marginTrend.every((m) => m.margin === null) ? (
              <EmptyState
                title="No revenue yet"
                description="Margins are shown for months with revenue."
              />
            ) : (
              <MarginTrend data={marginTrend} height={280} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Profit by {dimLabel[dimension]}</CardTitle>
          <Tabs value={dimension} onValueChange={(v) => setDimension(v as DimensionKey)}>
            <TabsList>
              {DIMENSIONS.map((d) => (
                <TabsTrigger key={d} value={d}>
                  {dimLabel[d]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-6">
          {byDimension.length === 0 ? (
            <EmptyState
              title={`No ${dimLabel[dimension].toLowerCase()} data`}
              description="Transactions with a dimension assigned will appear here."
            />
          ) : (
            <>
              <ProfitBars data={byDimension} currency={homeCurrency} height={240} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dimLabel[dimension]}</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Net profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byDimension.map((d) => (
                    <TableRow key={d.name}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(d.count)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(d.revenue, homeCurrency)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(d.expenses, homeCurrency)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${d.net < 0 ? "text-destructive" : ""}`}>
                        {formatMoney(d.net, homeCurrency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {d.margin === null ? "—" : formatPercentPlain(d.margin)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
