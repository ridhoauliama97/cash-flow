import { Upload } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";

export const metadata = { title: "Import Data — Cash Flow" };

export default function ImportPage() {
  return (
    <ComingSoon
      title="Import Data"
      description="Import transaksi dari CSV/Excel belum tersedia di Fase 1."
      icon={Upload}
    />
  );
}
