import { PiggyBank } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";
import { AccessDenied } from "@/components/shared/access-denied";
import { hasPageAccess } from "@/lib/rbac";

export const metadata = { title: "Receivable & Payable — Cash Flow" };

export default async function ReceivablesPage() {
  if (!(await hasPageAccess("analytics"))) return <AccessDenied />;
  return (
    <ComingSoon
      title="Receivable & Payable"
      description="Modul piutang/hutang pelanggan & pemasok belum tersedia di Fase 1 — data pelanggan dan pemasok sudah dikelola di Master Data."
      icon={PiggyBank}
    />
  );
}
