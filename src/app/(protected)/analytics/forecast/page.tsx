import { CalendarClock } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";
import { AccessDenied } from "@/components/shared/access-denied";
import { hasPageAccess } from "@/lib/rbac";

export const metadata = { title: "Forecast — Cash Flow" };

export default async function ForecastPage() {
  if (!(await hasPageAccess("analytics"))) return <AccessDenied />;
  return (
    <ComingSoon
      title="Forecast"
      description="Proyeksi arus kas ke depan belum tersedia di Fase 1."
      icon={CalendarClock}
    />
  );
}
