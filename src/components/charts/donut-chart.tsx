import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipContentProps } from "recharts"
import type { CurrencyCode } from "@/types"
import { ChartTooltipBody, type TooltipRow } from "@/components/charts/chart-tooltip"
import { CHART_COLORS } from "@/lib/chart-colors"

export interface DonutDatum {
  name: string
  value: number
}

/**
 * Donut chart with legend list and totals.
 */
export function DonutChart({
  data,
  currency,
  centerLabel,
  centerValue,
}: {
  data: DonutDatum[]
  currency: CurrencyCode
  centerLabel?: string
  centerValue?: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)

  const tooltipContent = ({ active, payload }: TooltipContentProps) => {
    const rows: TooltipRow[] = (payload ?? []).map((p) => ({
      name: String(p.name),
      value: Number(p.value),
      color: CHART_COLORS[data.findIndex((d) => d.name === p.name) % CHART_COLORS.length],
    }))
    return <ChartTooltipBody active={active} rows={rows} currency={currency} />
  }

  if (total === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No data in this period
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative shrink-0">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={80}
              cornerRadius={4}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={tooltipContent} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">{centerLabel ?? "Total"}</span>
          <span className="text-sm font-semibold tabular-nums">{centerValue}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="truncate text-muted-foreground">{d.name}</span>
            <span className="ml-auto shrink-0 font-medium tabular-nums">{((d.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
