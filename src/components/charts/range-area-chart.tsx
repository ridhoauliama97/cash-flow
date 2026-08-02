import { useId, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import type { CurrencyCode, Transaction } from "@/types"
import { dailyBalances } from "@/lib/analytics/kpis"
import { formatMoney } from "@/lib/format"
import { shiftDays, todayISO } from "@/lib/utils"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { NEGATIVE_COLOR, POSITIVE_COLOR } from "@/lib/chart-colors"

const RANGES = [
  { key: "7d", days: 7, label: "Last 7 days" },
  { key: "30d", days: 30, label: "Last 30 days" },
  { key: "90d", days: 90, label: "Last 90 days" },
] as const

type RangeKey = (typeof RANGES)[number]["key"]

const chartConfig = {
  inflow: { label: "Revenue", color: POSITIVE_COLOR },
  outflow: { label: "Expenses", color: NEGATIVE_COLOR },
} satisfies ChartConfig

/**
 * Interactive revenue vs expenses chart — dashboard-01 style: daily data,
 * a 7/30/90-day toggle in the card header and a theme-aware ChartContainer.
 */
export function RangeAreaChart({
  transactions,
  openingBalance,
  currency,
  height = 280,
}: {
  transactions: Transaction[]
  openingBalance: number
  currency: CurrencyCode
  height?: number
}) {
  const [range, setRange] = useState<RangeKey>("90d")
  const gradId = useId().replace(/[:]/g, "")

  const data = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days ?? 90
    const today = todayISO()
    return dailyBalances(transactions, openingBalance, shiftDays(today, -(days - 1)), today)
  }, [transactions, openingBalance, range])

  const dateLabel = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-sm text-muted-foreground">Daily revenue vs expenses</p>
          <p className="text-xs text-muted-foreground/70">
            {RANGES.find((r) => r.key === range)?.label.toLowerCase()} · {formatMoney(openingBalance, currency, true)} opening
          </p>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={range}
          onValueChange={(v) => v && setRange(v as RangeKey)}
          className="hidden sm:flex"
        >
          {RANGES.map((r) => (
            <ToggleGroupItem key={r.key} value={r.key} className="px-3">
              {r.key}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`${gradId}in`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-inflow)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-inflow)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`${gradId}out`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-outflow)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-outflow)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={dateLabel}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={64}
            tickFormatter={(v: number) => formatMoney(v, currency, true)}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => (typeof value === "string" ? dateLabel(value) : value)}
                formatter={(value) => formatMoney(Number(value), currency)}
                indicator="dot"
              />
            }
          />
          <Area
            type="natural"
            dataKey="inflow"
            stroke="var(--color-inflow)"
            strokeWidth={2}
            fill={`url(#${gradId}in)`}
            name="inflow"
          />
          <Area
            type="natural"
            dataKey="outflow"
            stroke="var(--color-outflow)"
            strokeWidth={2}
            fill={`url(#${gradId}out)`}
            name="outflow"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
