import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Send,
} from "lucide-react"
import { useNotifications } from "@/hooks/use-notifications"
import type { NotificationSeverity } from "@/lib/notifications"
import { formatMoney } from "@/lib/format"
import { useApp } from "@/context/app-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const SEVERITY_META: Record<NotificationSeverity, { icon: typeof AlertTriangle; className: string }> = {
  critical: { icon: AlertTriangle, className: "bg-destructive/10 text-destructive" },
  warning: { icon: Clock3, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  info: { icon: FileCheck2, className: "bg-secondary text-secondary-foreground" },
}

export function NotificationMenu() {
  const { items, unreadCount, isRead, markAllRead, markRead } = useNotifications()
  const { homeCurrency } = useApp()
  const navigate = useNavigate()

  const open = (to: string, id: string) => {
    markRead(id)
    navigate(to)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold leading-none text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="text-sm font-medium">Notifications</p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              <CheckCircle2 className="size-3.5" />
              Mark all read
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <BellOff className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">You're all caught up</p>
            <p className="text-xs text-muted-foreground">No overdue bills, low cash or pending reports.</p>
          </div>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {items.map((n, i) => {
              const Meta = SEVERITY_META[n.severity]
              const Icon = Meta.icon
              const read = isRead(n.id)
              return (
                <li key={n.id}>
                  {i > 0 && <Separator />}
                  <button
                    type="button"
                    onClick={() => open(n.to, n.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent",
                      !read && "bg-accent/40",
                    )}
                  >
                    <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md", Meta.className)}>
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{n.title}</span>
                        {n.severity === "info" && <Send className="size-3 shrink-0 text-muted-foreground" />}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{n.description}</span>
                    </span>
                    {n.kind !== "report-delivered" && n.amount > 0 && (
                      <Badge variant="outline" className="shrink-0 tabular-nums">
                        {formatMoney(n.amount, homeCurrency, true)}
                      </Badge>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
