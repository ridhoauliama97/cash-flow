import { useId } from "react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"

/**
 * Tiny sparkline for KPI cards (dashboard-01 style): no axes, gradient fill.
 */
export function Sparkline({
  data,
  color = "var(--chart-1)",
  height = 36,
  className,
}: {
  data: number[]
  color?: string
  height?: number
  className?: string
}) {
  const id = useId().replace(/[:]/g, "")
  const points = data.map((v, i) => ({ i, v }))

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${id})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
