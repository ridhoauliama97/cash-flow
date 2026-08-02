import { AlertTriangle, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function EmptyState({
  title = "No data",
  description = "Try adjusting your filters, or add data to get started.",
  onAction,
  actionLabel = "Add data",
  icon,
  className,
}: {
  title?: string
  description?: string
  onAction?: () => void
  actionLabel?: string
  icon?: "search" | "warning"
  className?: string
}) {
  const Icon = icon === "warning" ? AlertTriangle : SearchX
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center", className)}>
      <Icon className="size-8 text-muted-foreground/50" />
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {onAction && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
