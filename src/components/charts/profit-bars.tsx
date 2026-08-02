import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type BarShapeProps, type TooltipContentProps } from "recharts"
import type { CurrencyCode } from "@/types"
import type { DimensionProfit } from "@/lib/analytics/profitability"
import { ChartTooltipBody, type TooltipRow } from "@/components/charts/chart-tooltip"
import { formatMoney } from "@/lib/format"
import { NEGATIVE_COLOR, POSITIVE_COLOR } from "@/lib/chart-colors"

/** Vertical bar whose fill follows the sign of the net profit. */
function NetBar({ x, y, width, height, payload }: BarShapeProps) {
  const net = Number((payload as DimensionProfit | undefined)?.net ?? 0)
  const color = net >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR
  return (
    <rect
      x={x}
      y={Math.min(y, y + (height ?? 0))}
      width={width}
      height={Math.abs(height ?? 0)}
      rx={4}
      fill={color}
    />
  )
}

/**
 * Net profit per dimension, colored by sign (recharts v3 `shape` prop).
 */
export function ProfitBars({
  data,
  currency,
  height = 260,
}: {
  data: DimensionProfit[]
  currency: CurrencyCode
  height?: number
}) {
  const gridColor = "var(--border)"
  const tickColor = "var(--muted-foreground)"

  const tooltipContent = ({ active, payload, label }: TooltipContentProps) => {
    const rows: TooltipRow[] = (payload ?? []).map((p) => ({
      name: "Net profit",
      value: Number(p.value),
      color: Number(p.value) >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR,
    }))
    return <ChartTooltipBody active={active} label={label} rows={rows} currency={currency} />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} interval={0} />
        <YAxis
          tick={{ fontSize: 11, fill: tickColor }}
          axisLine={false}
          tickLine={false}
          width={70}
          tickFormatter={(v: number) => formatMoney(v, currency, true)}
        />
        <Tooltip content={tooltipContent} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
        <Bar dataKey="net" shape={NetBar} name="net" />
      </BarChart>
    </ResponsiveContainer>
  )
}
