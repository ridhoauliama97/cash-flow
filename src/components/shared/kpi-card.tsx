import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  trend?: { value: string; positive: boolean; neutral?: boolean }
  hint?: string
  className?: string
}

export function KpiCard({ label, value, sub, icon: Icon, trend, hint, className }: KpiCardProps) {
  const content = (
    <Card className={cn("h-full", className)}>
      <CardContent className="flex flex-col gap-2 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <span className="flex size-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="size-4" />
          </span>
        </div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        <div className="flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
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
          {sub && <span className="text-muted-foreground">{sub}</span>}
        </div>
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

/** Simple labeled stat row for cards. */
export function StatRow({
  label,
  value,
  icon,
  hint,
}: {
  label: ReactNode
  value: ReactNode
  icon?: LucideIcon
  hint?: string
}) {
  const Icon = icon
  const content = (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="size-3.5 shrink-0" />}
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-medium tabular-nums">{value}</span>
    </div>
  )
  if (!hint) return content
  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  )
}
