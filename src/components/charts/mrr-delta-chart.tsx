import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts"
import type { CurrencyCode } from "@/types"
import { ChartTooltipBody, type TooltipRow } from "@/components/charts/chart-tooltip"
import { formatMoney } from "@/lib/format"
import { useTheme } from "@/hooks/use-theme"
import { CHART_COLORS, NEGATIVE_COLOR, POSITIVE_COLOR } from "@/lib/chart-colors"
import type { MrrDeltaPoint } from "@/lib/analytics/mrr"

const KEYS = [
  { key: "new", label: "New", color: POSITIVE_COLOR },
  { key: "expansion", label: "Expansion", color: CHART_COLORS[1] },
  { key: "contraction", label: "Contraction", color: CHART_COLORS[3] },
  { key: "churn", label: "Churn", color: NEGATIVE_COLOR },
] as const

/**
 * Stacked bar chart of the MRR movement decomposition
 * (new / expansion / contraction / churn per month).
 */
export function MrrDeltaChart({
  data,
  currency,
  height = 300,
}: {
  data: MrrDeltaPoint[]
  currency: CurrencyCode
  height?: number
}) {
  const { resolvedTheme } = useTheme()
  const gridColor = resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
  const tickColor = resolvedTheme === "dark" ? "var(--muted-foreground)" : "var(--muted-foreground)"

  const tooltipContent = ({ active, payload, label }: TooltipContentProps) => {
    const rows: TooltipRow[] = (payload ?? []).map((p) => {
      const meta = KEYS.find((k) => k.key === p.dataKey)
      return { name: meta?.label ?? String(p.dataKey), value: Number(p.value), color: meta?.color ?? "var(--muted-foreground)" }
    })
    return <ChartTooltipBody active={active} label={label} rows={rows} currency={currency} />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="18%">
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={52} />
        <YAxis
          tick={{ fontSize: 11, fill: tickColor }}
          axisLine={false}
          tickLine={false}
          width={70}
          tickFormatter={(v: number) => formatMoney(v, currency, true)}
        />
        <Tooltip content={tooltipContent} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />
        {KEYS.map(({ key, label, color }) => (
          <Bar key={key} dataKey={key} stackId="mrr" name={label} fill={color} radius={key === "churn" ? [2, 2, 0, 0] : [0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
