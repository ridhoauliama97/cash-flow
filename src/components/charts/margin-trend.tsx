import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts"
import { formatPercentPlain } from "@/lib/format"
import { POSITIVE_COLOR } from "@/lib/chart-colors"
import { cn } from "@/lib/utils"

export interface MarginPoint {
  label: string
  margin: number | null
}

/**
 * Net margin (%) per month as a line chart.
 */
export function MarginTrend({
  data,
  height = 300,
}: {
  data: MarginPoint[]
  height?: number
}) {
  const gridColor = "var(--border)"
  const tickColor = "var(--muted-foreground)"

  const tooltipContent = ({ payload, label }: TooltipContentProps) => {
    const rows = (payload ?? [])
      .filter((p) => p.value !== null && p.value !== undefined)
      .map((p) => ({
        name: "Net margin",
        value: Number(p.value),
        color: POSITIVE_COLOR,
      }))
    if (rows.length === 0) return null
    return (
      <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex flex-col gap-1">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full" style={{ backgroundColor: r.color }} />
                {r.name}
              </span>
              <span className={cn("font-medium tabular-nums", r.value < 0 && "text-destructive")}>
                {formatPercentPlain(r.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: tickColor }}
          axisLine={false}
          tickLine={false}
          width={45}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip content={tooltipContent} />
        <Line
          type="monotone"
          dataKey="margin"
          stroke={POSITIVE_COLOR}
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 0, fill: POSITIVE_COLOR }}
          activeDot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
