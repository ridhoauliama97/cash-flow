import { Upload } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";
import { AccessDenied } from "@/components/shared/access-denied";
import { hasPageAccess } from "@/lib/rbac";

export const metadata = { title: "Import Data — Cash Flow" };

export default async function ImportPage() {
  if (!(await hasPageAccess("import"))) return <AccessDenied />;
  return (
    <ComingSoon
      title="Import Data"
      description="Import transaksi dari CSV/Excel belum tersedia di Fase 1."
      icon={Upload}
    />
  );
}
