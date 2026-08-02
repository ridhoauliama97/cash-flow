import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts"
import type { CurrencyCode } from "@/types"
import type { MonthPoint } from "@/lib/analytics/kpis"
import { ChartTooltipBody, type TooltipRow } from "@/components/charts/chart-tooltip"
import { formatMoney } from "@/lib/format"
import { useTheme } from "@/hooks/use-theme"
import { POSITIVE_COLOR, NEGATIVE_COLOR } from "@/lib/chart-colors"

/**
 * Revenue vs expenses area chart over time (months).
 */
export function AreaTrend({
  data,
  currency,
  height = 300,
}: {
  data: MonthPoint[]
  currency: CurrencyCode
  height?: number
}) {
  const { resolvedTheme } = useTheme()
  const gridColor = resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
  const tickColor = resolvedTheme === "dark" ? "var(--muted-foreground)" : "var(--muted-foreground)"

  const tooltipContent = ({ active, payload, label }: TooltipContentProps) => {
    const rows: TooltipRow[] = (payload ?? []).map((p) => ({
      name: p.name === "revenue" ? "Revenue" : "Expenses",
      value: Number(p.value),
      color: p.name === "revenue" ? POSITIVE_COLOR : NEGATIVE_COLOR,
    }))
    return <ChartTooltipBody active={active} label={label} rows={rows} currency={currency} />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={POSITIVE_COLOR} stopOpacity={0.35} />
            <stop offset="100%" stopColor={POSITIVE_COLOR} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={NEGATIVE_COLOR} stopOpacity={0.3} />
            <stop offset="100%" stopColor={NEGATIVE_COLOR} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: tickColor }}
          axisLine={false}
          tickLine={false}
          width={70}
          tickFormatter={(v: number) => formatMoney(v, currency, true)}
        />
        <Tooltip content={tooltipContent} />
        <Area type="monotone" dataKey="revenue" stroke={POSITIVE_COLOR} strokeWidth={2} fill="url(#revFill)" name="revenue" />
        <Area type="monotone" dataKey="expenses" stroke={NEGATIVE_COLOR} strokeWidth={2} fill="url(#expFill)" name="expenses" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
