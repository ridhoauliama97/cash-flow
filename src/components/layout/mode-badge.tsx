import { Database, Globe } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useApp } from "@/context/app-context"

/** Shows the current data mode (demo/local vs Supabase) and rate source. */
export function ModeBadge() {
  const { mode, rates, ratesStatus } = useApp()

  const rateLabel = rates?.source === "live" ? "Live rates" : "Fallback rates"
  const rateIcon = <Globe className="size-3" />
  const dataIcon = <Database className="size-3" />

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="gap-1.5">
              {dataIcon}
              {mode === "supabase" ? "Supabase" : "Demo data"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {mode === "supabase"
              ? "Connected to Supabase — data is stored in the cloud."
              : "Running on local demo data. Add VITE_SUPABASE_URL to go live."}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={ratesStatus?.ok === false ? "destructive" : "secondary"} className="gap-1.5">
              {rateIcon}
              {rateLabel}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {ratesStatus?.ok === false
              ? ratesStatus.error ?? "Rates unavailable — using static fallback."
              : "Exchange rates from currencyapi.com, refreshed automatically."}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
