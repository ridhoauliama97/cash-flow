"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarMenuItemData {
  to: string;
  label: string;
  icon: LucideIcon;
  permission: readonly [module: string, action: string];
}

export function SidebarMenu({
  items,
  onClose,
  className,
}: {
  items: SidebarMenuItemData[];
  onClose: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("space-y-1", className)}>
      {items.map((item) => (
        <SidebarMenuItem
          key={item.to}
          item={item}
          active={
            item.to === "/"
              ? pathname === "/"
              : pathname.startsWith(item.to)
          }
          onClose={onClose}
        />
      ))}
    </nav>
  );
}

export function SidebarMenuItem({
  item,
  active,
  onClose,
}: {
  item: SidebarMenuItemData;
  active: boolean;
  onClose: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.to}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function SidebarSubMenu({
  items,
  allowed,
  onClose,
  className,
}: {
  items: SidebarMenuItemData[];
  allowed: string[];
  onClose: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <div className={cn("space-y-1", className)}>
      {items
        .filter((item) => allowed.includes(item.permission.join("/")))
        .map((item) => (
          <SidebarSubMenuItem
            key={item.to}
            item={item}
            active={pathname.startsWith(item.to)}
            onClose={onClose}
          />
        ))}
    </div>
  );
}

export function SidebarSubMenuItem({
  item,
  active,
  onClose,
}: {
  item: SidebarMenuItemData;
  active: boolean;
  onClose: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.to}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-md py-1.5 pl-11 pr-3 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {item.label}
    </Link>
  );
}
