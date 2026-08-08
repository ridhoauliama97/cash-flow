"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar, type TopbarUser } from "@/components/layout/topbar";

export function AppShell({
  user,
  children,
}: {
  user: TopbarUser;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} onMenuClick={() => setMenuOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
