import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/app-context";
import { buildNotifications, type AppNotification } from "@/lib/notifications";
import { todayISO } from "@/lib/utils";
import { readDeliveryLog, type DeliveryLogEntry } from "@/hooks/use-schedule-delivery";

const READ_KEY = "cash-flow:notifications-read";

function readReadIds(): string[] {
  try {
    const raw = localStorage.getItem(READ_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeReadIds(ids: string[]): void {
  localStorage.setItem(READ_KEY, JSON.stringify(ids));
}

function deliveryNotifications(log: DeliveryLogEntry[]): AppNotification[] {
  return log.slice(0, 20).map((e) => ({
    id: e.id,
    kind: "report-delivered",
    severity: "info",
    title: `Report delivered: ${e.name}`,
    description: `${e.format.toUpperCase()} · ${new Date(e.at).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    amount: 0,
    dueDate: null,
    to: "/schedules",
  }));
}

export interface NotificationsState {
  items: AppNotification[];
  unreadCount: number;
  isRead: (id: string) => boolean;
  markAllRead: () => void;
  markRead: (id: string) => void;
}

/**
 * Computed notifications: payment/cash alerts from live data plus the
 * scheduled-report delivery log. Read state persists in localStorage.
 */
export function useNotifications(): NotificationsState {
  const { transactions, invoices, bills, profile } = useApp();
  const [readIds, setReadIds] = useState<string[]>(readReadIds);
  const [deliveryLog, setDeliveryLog] = useState<DeliveryLogEntry[]>(() => readDeliveryLog());

  // Refresh the delivery log when schedules fire (useScheduleDelivery writes
  // localStorage then bumps context state, which re-renders this hook).
  useEffect(() => {
    const refresh = () => setDeliveryLog(readDeliveryLog());
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, []);

  const items = useMemo<AppNotification[]>(() => {
    const alerts = buildNotifications(
      transactions,
      invoices,
      bills,
      profile?.openingBalance ?? 0,
      todayISO(),
    );
    return [...alerts, ...deliveryNotifications(deliveryLog)];
  }, [transactions, invoices, bills, profile, deliveryLog]);

  const unreadCount = useMemo(
    () => items.filter((i) => !readIds.includes(i.id)).length,
    [items, readIds],
  );

  const isRead = (id: string) => readIds.includes(id);

  const markRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeReadIds(next);
      return next;
    });
  };

  const markAllRead = () => {
    const next = items.map((i) => i.id);
    writeReadIds(next);
    setReadIds(next);
  };

  return { items, unreadCount, isRead, markAllRead, markRead };
}
