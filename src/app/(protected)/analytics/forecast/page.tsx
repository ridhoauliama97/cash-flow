import { CalendarClock } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";

export const metadata = { title: "Forecast — Cash Flow" };

export default function ForecastPage() {
  return (
    <ComingSoon
      title="Forecast"
      description="Proyeksi arus kas ke depan belum tersedia di Fase 1."
      icon={CalendarClock}
    />
  );
}
