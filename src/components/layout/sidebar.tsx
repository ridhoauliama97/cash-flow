"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownUp,
  BarChart3,
  Building2,
  CalendarClock,
  CalendarRange,
  FileDown,
  FileText,
  FolderTree,
  LayoutDashboard,
  LineChart,
  PiggyBank,
  Settings,
  TrendingUp,
  Truck,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const NAV_ITEMS = [
  {
    to: "/",
    label: "Overview",
    icon: LayoutDashboard,
    permission: ["dashboard", "read"] as const,
  },
  {
    to: "/analytics/revenue",
    label: "Revenue",
    icon: BarChart3,
    permission: ["analytics", "read"] as const,
  },
  {
    to: "/analytics/expenses",
    label: "Expenses",
    icon: Wallet,
    permission: ["analytics", "read"] as const,
  },
  {
    to: "/analytics/profitability",
    label: "Profitability",
    icon: TrendingUp,
    permission: ["analytics", "read"] as const,
  },
  {
    to: "/analytics/cash-flow",
    label: "Cash Flow",
    icon: LineChart,
    permission: ["analytics", "read"] as const,
  },
  {
    to: "/analytics/receivables",
    label: "Receivable & Payable",
    icon: PiggyBank,
    permission: ["analytics", "read"] as const,
  },
  {
    to: "/transactions",
    label: "Transactions",
    icon: ArrowDownUp,
    permission: ["transaction", "read"] as const,
  },
  {
    to: "/master/chart-of-accounts",
    label: "Master Data",
    icon: FolderTree,
    permission: ["master-data", "read"] as const,
  },
  {
    to: "/analytics/forecast",
    label: "Forecast",
    icon: CalendarClock,
    permission: ["analytics", "read"] as const,
  },
  {
    to: "/reports/general-ledger",
    label: "Reports & Export",
    icon: FileText,
    permission: ["report", "read"] as const,
  },
  {
    to: "/analytics/import",
    label: "Import Data",
    icon: Upload,
    permission: ["import", "read"] as const,
  },
  {
    to: "/analytics/schedules",
    label: "Schedules",
    icon: FileDown,
    permission: ["schedule", "read"] as const,
  },
  {
    to: "/settings/users",
    label: "Settings",
    icon: Settings,
    permission: ["user", "read"] as const,
  },
  {
    to: "/settings/periods",
    label: "Periode",
    icon: CalendarRange,
    permission: ["period", "read"] as const,
  },
];

const MASTER_SUB = [
  { to: "/master/customers", label: "Customers", icon: Users },
  { to: "/master/suppliers", label: "Suppliers", icon: Truck },
  { to: "/master/cost-centers", label: "Cost Centers", icon: Building2 },
];

type NavPermission = readonly [module: string, action: string];

function hasPermission(allowed: string[], permission: NavPermission) {
  return allowed.includes(permission.join("/"));
}

export function Sidebar({
  open,
  onClose,
  allowed,
}: {
  open: boolean;
  onClose: () => void;
  allowed: string[];
}) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 no-print lg:hidden"
          onClick={onClose}
        />
      )}
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
            <p className="text-xs text-muted-foreground">
              Finance &amp; Accounting
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.filter(({ permission }) =>
            hasPermission(allowed, permission),
          ).map(({ to, label, icon: Icon }) => {
            const active =
              to === "/" ? pathname === "/" : pathname.startsWith(to);
            const subActive =
              to === "/master/chart-of-accounts" &&
              MASTER_SUB.some((s) => pathname.startsWith(s.to));

            return (
              <div key={to}>
                <Link
                  href={to}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active || subActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
                {to === "/master/chart-of-accounts" &&
                  MASTER_SUB.filter(() =>
                    hasPermission(allowed, ["master-data", "read"]),
                  ).map((sub) => (
                    <Link
                      key={sub.to}
                      href={sub.to}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-md py-1.5 pl-11 pr-3 text-sm font-medium transition-colors",
                        pathname.startsWith(sub.to)
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <sub.icon className="size-3.5 shrink-0" />
                      {sub.label}
                    </Link>
                  ))}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
