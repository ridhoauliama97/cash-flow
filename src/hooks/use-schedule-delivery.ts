import { useEffect } from "react";
import { toast } from "sonner";
import { useApp } from "@/context/app-context";

function nextRunFrom(frequency: string, from: Date): string {
  const d = new Date(from);
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d.toISOString();
}

/**
 * Client-side report delivery checker. While the app is open, schedules
 * whose nextRunAt has passed are "delivered" (demo: toast + receipt
 * shown) and their next run is scheduled. In production, a Supabase
 * Edge Function (supabase/functions/report-delivery) performs real email
 * delivery — this hook keeps the UI honest in demo mode.
 */
export function useScheduleDelivery(): void {
  const { schedules, upsertSchedule } = useApp();

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const due = schedules.filter(
        (s) => s.enabled && new Date(s.nextRunAt).getTime() <= now,
      );
      if (due.length === 0) return;
      for (const s of due) {
        toast.info(`Report delivered: ${s.name} (${s.format.toUpperCase()})`, {
          description: `Sent to ${s.recipients}. Next run: ${nextRunFrom(s.frequency, new Date()).slice(0, 10)}`,
        });
        void upsertSchedule({
          ...s,
          lastSentAt: new Date().toISOString(),
          nextRunAt: nextRunFrom(s.frequency, new Date()),
        });
      }
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [schedules, upsertSchedule]);
}
