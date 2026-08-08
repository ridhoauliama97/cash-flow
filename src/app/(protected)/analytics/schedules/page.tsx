import { FileDown } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";

export const metadata = { title: "Schedules — Cash Flow" };

export default function SchedulesPage() {
  return (
    <ComingSoon
      title="Schedules"
      description="Jadwal pengiriman laporan berkala belum tersedia di Fase 1."
      icon={FileDown}
    />
  );
}
