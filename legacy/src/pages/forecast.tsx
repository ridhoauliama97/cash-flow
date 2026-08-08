import { useMemo } from "react"
import { Info, PiggyBank, ShieldCheck, TrendingUp, Wallet } from "lucide-react"
import { EMPTY_FILTERS } from "@/types"
import { useApp } from "@/context/app-context"
import { effectiveTransactions } from "@/lib/analytics/filter"
import {
  confidenceBand,
  forecastCashFlow,
  type ForecastPoint,
} from "@/lib/analytics/forecast"
import { byMonth, sumByType } from "@/lib/analytics/kpis"
import { formatMoney, formatSigned } from "@/lib/format"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ForecastChart } from "@/components/charts/forecast-chart"
import { EmptyState } from "@/components/shared/empty-state"
import { KpiCard } from "@/components/shared/kpi-card"
import { PageHeader } from "@/components/shared/page-header"

/** Point accepted by ForecastChart: history uses net/balance, forecast uses forecastNet/forecastBalance. */
type ChartPoint = ForecastPoint & { forecastNet?: number; forecastBalance?: number }

/** The `n` most recent calendar month keys (YYYY-MM), oldest first, ending with the current month. */
function lastMonthKeys(n: number): string[] {
  const now = new Date()
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }
  return keys
}

export function ForecastPage() {
  const { profile, transactions, invoices, homeCurrency } = useApp()

  const { forecast, currentBalance, chartData } = useMemo(() => {
    if (!profile) {
      return { forecast: [] as ForecastPoint[], currentBalance: 0, chartData: [] as ChartPoint[] }
    }
    const window = new Set(lastMonthKeys(12))
    const history = byMonth(effectiveTransactions(transactions, invoices, EMPTY_FILTERS, homeCurrency)).filter(
      (p) => window.has(p.key),
    )
    const currentBalance = profile.openingBalance + sumByType(transactions).net
    const forecast = forecastCashFlow({ history, currentBalance, months: 12 })

    // Running balance for history points, ending exactly at currentBalance so the
    // solid history line meets the dashed forecast line without a jump.
    const histNet = history.reduce((s, h) => s + h.net, 0)
    let running = currentBalance - histNet
    const chartData: ChartPoint[] = []
    history.forEach((h) => {
      running += h.net
      chartData.push({
        key: h.key,
        label: h.label,
        revenue: h.revenue,
        expenses: h.expenses,
        net: h.net,
        balance: running,
        isForecast: false,
      })
    })
    forecast.forEach((f) => {
      chartData.push({ ...f, forecastNet: f.net, forecastBalance: f.balance })
    })
    return { forecast, currentBalance, chartData }
  }, [profile, transactions, invoices, homeCurrency])

  if (!profile) return null

  const last = forecast[forecast.length - 1]
  const projectedNet = forecast.reduce((s, f) => s + f.net, 0)
  const band = last ? confidenceBand(last) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash flow forecast"
        description="Projected cash position over the next 12 months, extrapolated from your last 12 months of activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Current balance"
          value={formatMoney(currentBalance, homeCurrency)}
          icon={Wallet}
          sub="Opening + net to date"
        />
        <KpiCard
          label="Projected balance"
          value={last ? formatMoney(last.balance, homeCurrency) : "—"}
          icon={PiggyBank}
          sub="In 12 months"
          hint={band ? `Confidence band: ${formatMoney(band.low, homeCurrency)} – ${formatMoney(band.high, homeCurrency)}` : undefined}
        />
        <KpiCard
          label="Projected net"
          value={formatSigned(projectedNet, homeCurrency)}
          icon={TrendingUp}
          sub="Next 12 months"
        />
        <KpiCard
          label="Confidence"
          value={band ? "±15%" : "—"}
          icon={ShieldCheck}
          sub="Trend + seasonality"
          hint={band ? `Projected balance range: ${formatMoney(band.low, homeCurrency)} – ${formatMoney(band.high, homeCurrency)}` : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>12-month projection</CardTitle>
          <CardDescription>Solid line — actuals · Dashed line — forecast</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <EmptyState
              title="Not enough history"
              description="Add transactions to unlock the cash-flow forecast."
            />
          ) : (
            <ForecastChart data={chartData} currency={homeCurrency} />
          )}
        </CardContent>
      </Card>

      {forecast.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Forecast detail</CardTitle>
            <CardDescription>Monthly projection with confidence band</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Projected balance</TableHead>
                  <TableHead className="text-right">Confidence band</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecast.map((f) => {
                  const band = confidenceBand(f)
                  return (
                    <TableRow key={f.key}>
                      <TableCell>{f.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(f.revenue, homeCurrency)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(f.expenses, homeCurrency)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatSigned(f.net, homeCurrency)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(f.balance, homeCurrency)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatMoney(band.low, homeCurrency)} – {formatMoney(band.high, homeCurrency)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Alert>
        <Info className="size-4" />
        <AlertTitle>Methodology</AlertTitle>
        <AlertDescription>
          Projections are generated from a linear trend of the last 12 months adjusted for
          calendar seasonality. They are estimates, not financial advice.
        </AlertDescription>
      </Alert>
    </div>
  )
}
