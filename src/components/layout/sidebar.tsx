import {
  ArrowDownUp,
  BarChart3,
  CalendarClock,
  FileDown,
  FileText,
  LayoutDashboard,
  LineChart,
  Moon,
  PiggyBank,
  Settings,
  Sun,
  Upload,
  Wallet,
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/use-theme"

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/revenue", label: "Revenue", icon: BarChart3 },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/cash-flow", label: "Cash Flow", icon: LineChart },
  { to: "/receivables", label: "Receivables", icon: PiggyBank },
  { to: "/transactions", label: "Transactions", icon: ArrowDownUp },
  { to: "/forecast", label: "Forecast", icon: CalendarClock },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/import", label: "Import Data", icon: Upload },
  { to: "/schedules", label: "Schedules", icon: FileDown },
  { to: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { resolvedTheme, setTheme } = useTheme()
  const location = useLocation()

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden no-print" onClick={onClose} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0 no-print",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Cash Flow</p>
            <p className="text-xs text-muted-foreground">Finance Analytics</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
          </Button>
        </div>
      </aside>
    </>
  )
}
