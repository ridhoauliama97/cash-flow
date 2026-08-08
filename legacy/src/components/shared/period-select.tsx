import { CalendarDays, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { PeriodKey } from "@/types"

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "this_month", label: "This month" },
  { key: "this_quarter", label: "This quarter" },
  { key: "this_year", label: "This year" },
]

export function PeriodSelect({
  value,
  onChange,
}: {
  value: PeriodKey
  onChange: (key: PeriodKey) => void
}) {
  const current = PERIODS.find((p) => p.key === value) ?? PERIODS[3]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <CalendarDays className="size-3.5" />
          {current.label}
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {PERIODS.map((p) => (
          <DropdownMenuItem key={p.key} onSelect={() => onChange(p.key)}>
            {p.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
