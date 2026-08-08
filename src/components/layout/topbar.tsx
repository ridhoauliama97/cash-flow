"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TopbarUser {
  name: string | null;
  email: string;
}

export function Topbar({
  onMenuClick,
  user,
}: {
  onMenuClick: () => void;
  user: TopbarUser;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur no-print lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
        <div className="hidden sm:block">
          <p className="text-sm font-medium leading-tight">Cash Flow</p>
          <p className="text-xs text-muted-foreground">
            {user.name ?? user.email}
          </p>
        </div>
      </div>
    </header>
  );
}
