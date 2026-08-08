"use client";

import { useState } from "react";
import {
  ArrowDownUp,
  BarChart3,
  Building2,
  CalendarClock,
  CalendarRange,
  ClipboardCheck,
  FileDown,
  FileText,
  FolderTree,
  LayoutDashboard,
  LineChart,
  Package,
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
import {
  SidebarMenu,
  SidebarSubMenu,
  type SidebarMenuItemData,
} from "@/components/ui/sidebar-menu";

const NAV_ITEMS: SidebarMenuItemData[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, permission: ["dashboard", "read"] },
  { to: "/analytics/revenue", label: "Revenue", icon: BarChart3, permission: ["analytics", "read"] },
  { to: "/analytics/expenses", label: "Expenses", icon: Wallet, permission: ["analytics", "read"] },
  { to: "/analytics/profitability", label: "Profitability", icon: TrendingUp, permission: ["analytics", "read"] },
  { to: "/analytics/cash-flow", label: "Cash Flow", icon: LineChart, permission: ["analytics", "read"] },
  { to: "/analytics/receivables", label: "Receivable & Payable", icon: PiggyBank, permission: ["analytics", "read"] },
  { to: "/transactions", label: "Transactions", icon: ArrowDownUp, permission: ["transaction", "read"] },
  { to: "/approvals", label: "Approvals", icon: ClipboardCheck, permission: ["transaction", "approve"] },
  { to: "/master/chart-of-accounts", label: "Master Data", icon: FolderTree, permission: ["master-data", "read"] },
  { to: "/analytics/forecast", label: "Forecast", icon: CalendarClock, permission: ["analytics", "read"] },
  { to: "/reports/journal", label: "Journal / General Ledger", icon: FileText, permission: ["ledger", "read"] },
  { to: "/analytics/import", label: "Import Data", icon: Upload, permission: ["import", "read"] },
  { to: "/analytics/schedules", label: "Schedules", icon: FileDown, permission: ["schedule", "read"] },
  { to: "/settings/users", label: "Settings", icon: Settings, permission: ["user", "read"] },
  { to: "/settings/periods", label: "Periode", icon: CalendarRange, permission: ["period", "read"] },
];

const MASTER_SUB: SidebarMenuItemData[] = [
  { to: "/master/customers", label: "Customers", icon: Users, permission: ["master-data", "read"] },
  { to: "/master/suppliers", label: "Suppliers", icon: Truck, permission: ["master-data", "read"] },
  { to: "/master/products", label: "Products", icon: Package, permission: ["master-data", "read"] },
  { to: "/settings/departments", label: "Departments", icon: Building2, permission: ["user", "read"] },
  { to: "/settings/divisions", label: "Divisions", icon: FolderTree, permission: ["user", "read"] },
  { to: "/settings/employees", label: "Employees", icon: Users, permission: ["user", "read"] },
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
  const [masterOpen, setMasterOpen] = useState(true);

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

        <div className="flex-1 overflow-y-auto p-3">
          <SidebarMenu
            items={NAV_ITEMS.filter(({ permission }) =>
              hasPermission(allowed, permission),
            )}
            onClose={onClose}
          />

          {hasPermission(allowed, ["master-data", "read"]) && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setMasterOpen(!masterOpen)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-sidebar-accent-foreground"
              >
                <FolderTree className="size-3.5 shrink-0" />
                Master Data
                <span className="ml-auto text-[10px]">{masterOpen ? "▾" : "▸"}</span>
              </button>
              {masterOpen && (
                <SidebarSubMenu
                  items={MASTER_SUB}
                  allowed={allowed}
                  onClose={onClose}
                />
              )}
            </div>
          )}
        </div>

        <div className="border-t border-sidebar-border p-3">
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
