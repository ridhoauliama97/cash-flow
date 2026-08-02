import { Bar, BarChart, CartesianGrid, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, type RectangleProps, type TooltipContentProps } from "recharts"
import type { CurrencyCode } from "@/types"
import type { WaterfallPoint } from "@/lib/analytics/waterfall"
import { formatMoney } from "@/lib/format"
import { useTheme } from "@/hooks/use-theme"
import { POSITIVE_COLOR, NEGATIVE_COLOR, NEUTRAL_COLOR } from "@/lib/chart-colors"

interface BarPayload {
  payload?: WaterfallPoint
}

function WaterfallBar(props: RectangleProps & BarPayload) {
  const point = props.payload
  if (!point) return null
  const color = point.isTotal ? NEUTRAL_COLOR : point.value >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR
  return <Rectangle {...props} fill={color} radius={[4, 4, 0, 0]} />
}

/**
 * Cash-flow waterfall chart (Recharts v3 range bars).
 */
export function WaterfallChart({
  data,
  currency,
  height = 320,
}: {
  data: WaterfallPoint[]
  currency: CurrencyCode
  height?: number
}) {
  const { resolvedTheme } = useTheme()
  const gridColor = resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
  const tickColor = resolvedTheme === "dark" ? "var(--muted-foreground)" : "var(--muted-foreground)"

  const tooltipContent = ({ active, payload }: TooltipContentProps) => {
    const item = payload?.[0]
    if (!active || !item) return null
    const point = item.payload as WaterfallPoint | undefined
    if (!point) return null
    return (
      <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
        <p className="mb-1 text-xs font-medium text-muted-foreground">{point.label}</p>
        <p className="text-sm font-medium tabular-nums">{formatMoney(point.value, currency)}</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
        <Bar dataKey="range" shape={WaterfallBar} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
