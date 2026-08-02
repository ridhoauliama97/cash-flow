import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts"
import type { CurrencyCode } from "@/types"
import { ChartTooltipBody, type TooltipRow } from "@/components/charts/chart-tooltip"
import { formatMoney } from "@/lib/format"
import { useTheme } from "@/hooks/use-theme"
import { POSITIVE_COLOR, NEUTRAL_COLOR } from "@/lib/chart-colors"

export interface BarCompareDatum {
  name: string
  actual: number
  budget?: number
}

/**
 * Grouped bar chart for comparing two series (e.g. budget vs actual).
 */
export function BarCompare({
  data,
  currency,
  height = 300,
  actualLabel = "Actual",
  budgetLabel = "Budget",
}: {
  data: BarCompareDatum[]
  currency: CurrencyCode
  height?: number
  actualLabel?: string
  budgetLabel?: string
}) {
  const { resolvedTheme } = useTheme()
  const gridColor = resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
  const tickColor = resolvedTheme === "dark" ? "var(--muted-foreground)" : "var(--muted-foreground)"

  const tooltipContent = ({ active, payload, label }: TooltipContentProps) => {
    const rows: TooltipRow[] = (payload ?? []).map((p) => ({
      name: p.dataKey === "actual" ? actualLabel : budgetLabel,
      value: Number(p.value),
      color: p.dataKey === "actual" ? POSITIVE_COLOR : NEUTRAL_COLOR,
    }))
    return <ChartTooltipBody active={active} label={label} rows={rows} currency={currency} />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={52} />
        <YAxis
          tick={{ fontSize: 11, fill: tickColor }}
          axisLine={false}
          tickLine={false}
          width={70}
          tickFormatter={(v: number) => formatMoney(v, currency, true)}
        />
        <Tooltip content={tooltipContent} />
        <Bar dataKey="budget" fill={NEUTRAL_COLOR} fillOpacity={0.35} radius={[3, 3, 0, 0]} name="budget" />
        <Bar dataKey="actual" fill={POSITIVE_COLOR} radius={[3, 3, 0, 0]} name="actual" />
      </BarChart>
    </ResponsiveContainer>
  )
}
