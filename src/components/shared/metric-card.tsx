import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkline } from "@/components/charts/sparkline"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * KPI metric card with a sparkline footer — the dashboard-01 section-card
 * look. Used on the Overview page.
 */
export function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  sparkline,
  sparklineColor,
  hint,
  className,
}: {
  label: string
  value: string
  sub?: string
  icon?: LucideIcon
  trend?: { value: string; positive: boolean; neutral?: boolean }
  sparkline?: number[]
  sparklineColor?: string
  hint?: string
  className?: string
}) {
  const content = (
    <Card
      className={cn(
        "h-full bg-gradient-to-b from-primary/5 via-card/5 to-card/5 ring-1 ring-ring/5",
        className,
      )}
    >
      <CardContent className="flex flex-col gap-2.5 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          {Icon && (
            <span className="flex size-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <Icon className="size-4" />
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
          {trend && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
                trend.neutral
                  ? "bg-muted text-muted-foreground"
                  : trend.positive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 text-destructive",
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} color={sparklineColor} className="mt-1" />
        )}
      </CardContent>
    </Card>
  )

  if (!hint) return content
  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  )
}
