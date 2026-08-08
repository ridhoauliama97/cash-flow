import { FileDown } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";
import { AccessDenied } from "@/components/shared/access-denied";
import { hasPageAccess } from "@/lib/rbac";

export const metadata = { title: "Schedules — Cash Flow" };

export default async function SchedulesPage() {
  if (!(await hasPageAccess("schedule"))) return <AccessDenied />;
  return (
    <ComingSoon
      title="Schedules"
      description="Jadwal pengiriman laporan berkala belum tersedia di Fase 1."
      icon={FileDown}
    />
  );
}
