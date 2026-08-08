import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transaksi" },
  { href: "/master/chart-of-accounts", label: "Master Data" },
  { href: "/reports/general-ledger", label: "Laporan" },
  { href: "/settings/users", label: "Settings" },
] as const;

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-1 p-4">
          <span className="mr-4 text-sm font-semibold tracking-tight">
            Cash Flow &amp; Accounting
          </span>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
