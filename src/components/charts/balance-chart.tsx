import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts"
import type { CurrencyCode } from "@/types"
import type { DailyPoint } from "@/lib/analytics/kpis"
import { ChartTooltipBody, type TooltipRow } from "@/components/charts/chart-tooltip"
import { formatDateShort, formatMoney } from "@/lib/format"
import { useTheme } from "@/hooks/use-theme"
import { POSITIVE_COLOR, NEGATIVE_COLOR, NEUTRAL_COLOR } from "@/lib/chart-colors"

/**
 * Daily cash balance line with inflow/outflow area.
 */
export function BalanceChart({
  data,
  currency,
  height = 300,
}: {
  data: DailyPoint[]
  currency: CurrencyCode
  height?: number
}) {
  const { resolvedTheme } = useTheme()
  const gridColor = resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
  const tickColor = resolvedTheme === "dark" ? "var(--muted-foreground)" : "var(--muted-foreground)"
  const chartData = data.map((d) => ({ ...d, label: formatDateShort(d.date) }))

  const tooltipContent = ({ active, payload, label }: TooltipContentProps) => {
    const rows: TooltipRow[] = (payload ?? []).map((p) => ({
      name:
        p.dataKey === "balance" ? "Balance" : p.dataKey === "inflow" ? "Inflow" : p.dataKey === "outflow" ? "Outflow" : String(p.dataKey ?? ""),
      value: Number(p.value),
      color: p.dataKey === "balance" ? NEUTRAL_COLOR : p.dataKey === "inflow" ? POSITIVE_COLOR : NEGATIVE_COLOR,
    }))
    return <ChartTooltipBody active={active} label={label} rows={rows} currency={currency} />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
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
        <Area type="monotone" dataKey="balance" stroke={NEUTRAL_COLOR} strokeWidth={2} fill="url(#balFill)" name="balance" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
