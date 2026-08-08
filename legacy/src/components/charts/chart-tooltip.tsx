import type { CurrencyCode } from "@/types"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface TooltipRow {
  name: string
  value: number
  color: string
}

/**
 * Shared chart tooltip body — styled like shadcn, currency-aware.
 */
export function ChartTooltipBody({
  label,
  rows,
  currency,
  active,
}: {
  label?: string | number
  rows: TooltipRow[]
  currency: CurrencyCode
  active?: boolean
}) {
  if (!active || rows.length === 0) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      {label !== undefined && <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>}
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: r.color }} />
              {r.name}
            </span>
            <span className={cn("font-medium tabular-nums", r.value < 0 && "text-destructive")}>
              {formatMoney(r.value, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
