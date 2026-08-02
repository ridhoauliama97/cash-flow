import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts"
import type { CurrencyCode } from "@/types"
import type { MonthPoint } from "@/lib/analytics/kpis"
import { ChartTooltipBody, type TooltipRow } from "@/components/charts/chart-tooltip"
import { formatMoney } from "@/lib/format"
import { NEUTRAL_COLOR, NEGATIVE_COLOR, POSITIVE_COLOR } from "@/lib/chart-colors"

/**
 * Monthly revenue vs expenses bars with a net-profit line on top.
 */
export function ProfitTrend({
  data,
  currency,
  height = 300,
}: {
  data: MonthPoint[]
  currency: CurrencyCode
  height?: number
}) {
  const gridColor = "var(--border)"
  const tickColor = "var(--muted-foreground)"

  const tooltipContent = ({ active, payload, label }: TooltipContentProps) => {
    const rows: TooltipRow[] = (payload ?? []).map((p) => {
      if (p.name === "net") {
        return { name: "Net profit", value: Number(p.value), color: NEUTRAL_COLOR }
      }
      return {
        name: p.name === "revenue" ? "Revenue" : "Expenses",
        value: Number(p.value),
        color: p.name === "revenue" ? POSITIVE_COLOR : NEGATIVE_COLOR,
      }
    })
    return <ChartTooltipBody active={active} label={label} rows={rows} currency={currency} />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
        <Bar dataKey="revenue" fill={POSITIVE_COLOR} radius={[4, 4, 0, 0]} name="revenue" />
        <Bar dataKey="expenses" fill={NEGATIVE_COLOR} radius={[4, 4, 0, 0]} name="expenses" />
        <Line
          type="monotone"
          dataKey="net"
          stroke={NEUTRAL_COLOR}
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 0, fill: NEUTRAL_COLOR }}
          activeDot={{ r: 4 }}
          name="net"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
