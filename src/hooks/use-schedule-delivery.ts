import { useEffect } from "react";
import { toast } from "sonner";
import { useApp } from "@/context/app-context";

export interface DeliveryLogEntry {
  id: string;
  name: string;
  format: string;
  at: string; // ISO datetime
}

const DELIVERY_LOG_KEY = "cash-flow:delivery-log";
const MAX_LOG_ENTRIES = 50;

export function readDeliveryLog(): DeliveryLogEntry[] {  try {
    const raw = localStorage.getItem(DELIVERY_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DeliveryLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendDeliveryLog(entry: DeliveryLogEntry): void {
  const log = [entry, ...readDeliveryLog()].slice(0, MAX_LOG_ENTRIES);
  localStorage.setItem(DELIVERY_LOG_KEY, JSON.stringify(log));
}

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
        const at = new Date().toISOString();
        appendDeliveryLog({ id: `delivered-${Date.now()}`, name: s.name, format: s.format, at });
        void upsertSchedule({
          ...s,
          lastSentAt: at,
          nextRunAt: nextRunFrom(s.frequency, new Date()),
        });
      }
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [schedules, upsertSchedule]);
}
