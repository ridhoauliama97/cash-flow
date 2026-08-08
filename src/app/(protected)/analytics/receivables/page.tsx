import { PiggyBank } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";

export const metadata = { title: "Receivable & Payable — Cash Flow" };

export default function ReceivablesPage() {
  return (
    <ComingSoon
      title="Receivable & Payable"
      description="Modul piutang/hutang pelanggan & pemasok belum tersedia di Fase 1 — data pelanggan dan pemasok sudah dikelola di Master Data."
      icon={PiggyBank}
    />
  );
}
