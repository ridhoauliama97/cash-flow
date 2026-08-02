import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApp } from "@/context/app-context"
import { GlobalSearch } from "@/components/shared/global-search"
import { ModeBadge } from "@/components/layout/mode-badge"
import { NotificationMenu } from "@/components/shared/notification-menu"

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile } = useApp()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur lg:px-6 no-print">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
        <div className="hidden sm:block">
          <p className="text-sm font-medium leading-tight">{profile?.company ?? "My Company"}</p>
          <p className="text-xs text-muted-foreground">{profile?.name ?? ""}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <GlobalSearch />
        <ModeBadge />
        <NotificationMenu />
      </div>
    </header>
  )
}
