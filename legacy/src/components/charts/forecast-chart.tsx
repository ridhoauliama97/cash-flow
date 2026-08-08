import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  type TooltipContentProps,
} from "recharts"
import type { CurrencyCode } from "@/types"
import type { ForecastPoint } from "@/lib/analytics/forecast"
import { ChartTooltipBody, type TooltipRow } from "@/components/charts/chart-tooltip"
import { formatMoney } from "@/lib/format"
import { useTheme } from "@/hooks/use-theme"
import { POSITIVE_COLOR, NEGATIVE_COLOR, NEUTRAL_COLOR } from "@/lib/chart-colors"

/**
 * 12-month forecast chart: historical net + projected balance band.
 */
export function ForecastChart({
  data,
  currency,
  height = 340,
}: {
  data: Array<ForecastPoint & { isForecast?: boolean }>
  currency: CurrencyCode
  height?: number
}) {
  const { resolvedTheme } = useTheme()
  const gridColor = resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
  const tickColor = resolvedTheme === "dark" ? "var(--muted-foreground)" : "var(--muted-foreground)"

  const tooltipContent = ({ active, payload, label }: TooltipContentProps) => {
    const rows: TooltipRow[] = (payload ?? []).map((p) => {
      const names: Record<string, string> = {
        net: "Net",
        balance: "Cash balance",
        forecastNet: "Forecast net",
        forecastBalance: "Forecast balance",
        low: "Low band",
        high: "High band",
      }
      const key = String(p.dataKey ?? "")
      return {
        name: names[key] ?? key,
        value: Number(p.value),
        color: key.includes("balance") ? NEUTRAL_COLOR : key === "net" || key === "forecastNet" ? POSITIVE_COLOR : NEGATIVE_COLOR,
      }
    })
    return <ChartTooltipBody active={active} label={label} rows={rows} currency={currency} />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={NEUTRAL_COLOR} stopOpacity={0.25} />
          <stop offset="100%" stopColor={NEUTRAL_COLOR} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
      <YAxis
        tick={{ fontSize: 11, fill: tickColor }}
        axisLine={false}
        tickLine={false}
        width={70}
        tickFormatter={(v: number) => formatMoney(v, currency, true)}
      />
      <Tooltip content={tooltipContent} />
      <ReferenceLine y={0} stroke={gridColor} />
      <Area type="monotone" dataKey="net" stroke={POSITIVE_COLOR} strokeWidth={2} fill="url(#balanceFill)" name="net" />
      <Area type="monotone" dataKey="forecastNet" stroke={POSITIVE_COLOR} strokeWidth={2} strokeDasharray="6 4" fill="none" name="forecastNet" />
      <Line type="monotone" dataKey="balance" stroke={NEUTRAL_COLOR} strokeWidth={2} dot={false} name="balance" />
      <Line type="monotone" dataKey="forecastBalance" stroke={NEUTRAL_COLOR} strokeWidth={2} strokeDasharray="6 4" dot={false} name="forecastBalance" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
