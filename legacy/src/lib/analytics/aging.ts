import type { Bill, Invoice } from "@/types";
import { daysBetween, shiftDays } from "@/lib/utils";

export interface AgingBucket {
  key: "current" | "days30" | "days60" | "days90" | "days90plus";
  label: string;
  invoices: Invoice[];
  total: number; // outstanding base currency
}

export interface AgingSummary {
  buckets: AgingBucket[];
  totalOutstanding: number;
  totalOverdue: number; // outstanding beyond due date
  overdueCount: number;
  atRisk: Invoice[]; // overdue invoices needing follow-up
}

interface AgedLike {
  dueDate: string;
  baseAmount: number;
  paidAmount: number;
  status: string;
}

const AGING_KEYS = ["current", "days30", "days60", "days90", "days90plus"] as const;
const AGING_LABELS = ["Current", "1–30 days", "31–60 days", "61–90 days", "90+ days"];

/** Shared aging logic for invoices (AR) and bills (AP). */
function aging<T extends AgedLike>(
  items: T[],
  today: string,
): {
  buckets: Array<{ key: string; label: string; items: T[]; total: number }>;
  totalOutstanding: number;
  totalOverdue: number;
  overdueCount: number;
  atRisk: T[];
} {
  const buckets: Array<{ key: string; label: string; items: T[]; total: number }> =
    AGING_KEYS.map((key, i) => ({ key, label: AGING_LABELS[i]!, items: [], total: 0 }));

  let totalOutstanding = 0;
  let totalOverdue = 0;
  let overdueCount = 0;
  const atRisk: T[] = [];

  for (const item of items) {
    if (item.status === "paid") continue;
    const outstanding = Math.max(0, item.baseAmount - item.paidAmount);
    if (outstanding <= 0) continue;
    totalOutstanding += outstanding;

    const days = daysBetween(item.dueDate, today);
    let bucket: number;
    if (days <= 0) bucket = 0;
    else if (days <= 30) bucket = 1;
    else if (days <= 60) bucket = 2;
    else if (days <= 90) bucket = 3;
    else bucket = 4;

    const target = buckets[bucket]!;
    target.items.push(item);
    target.total += outstanding;

    if (days > 0) {
      totalOverdue += outstanding;
      overdueCount += 1;
      atRisk.push(item);
    }
  }

  atRisk.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return { buckets, totalOutstanding, totalOverdue, overdueCount, atRisk };
}

/**
 * Group invoices by aging period (current, 1-30, 31-60, 61-90, 90+ days overdue).
 * `current` = not yet due.
 */
export function agingBuckets(invoices: Invoice[], today: string): AgingSummary {
  const result = aging(invoices, today);
  return {
    buckets: result.buckets.map((b) => ({
      key: b.key as AgingBucket["key"],
      label: b.label,
      invoices: b.items as Invoice[],
      total: b.total,
    })),
    totalOutstanding: result.totalOutstanding,
    totalOverdue: result.totalOverdue,
    overdueCount: result.overdueCount,
    atRisk: result.atRisk as Invoice[],
  };
}

export interface BillAgingBucket {
  key: string;
  label: string;
  bills: Bill[];
  total: number;
}

export interface BillAgingSummary {
  buckets: BillAgingBucket[];
  totalOutstanding: number;
  totalOverdue: number;
  overdueCount: number;
  atRisk: Bill[];
}

/** Aging summary for bills (accounts payable). */
export function billAgingBuckets(bills: Bill[], today: string): BillAgingSummary {
  const result = aging(bills, today);
  return {
    buckets: result.buckets.map((b) => ({
      key: b.key,
      label: b.label,
      bills: b.items as Bill[],
      total: b.total,
    })),
    totalOutstanding: result.totalOutstanding,
    totalOverdue: result.totalOverdue,
    overdueCount: result.overdueCount,
    atRisk: result.atRisk as Bill[],
  };
}

/** Total outstanding per client, sorted by amount descending. */
export function outstandingByClient(
  invoices: Invoice[],
): Array<{ client: string; total: number; oldest: string; count: number }> {
  const map = new Map<
    string,
    { total: number; oldest: string; count: number }
  >();
  for (const i of invoices) {
    const outstanding =
      i.status === "paid" ? 0 : Math.max(0, i.baseAmount - i.paidAmount);
    if (outstanding <= 0) continue;
    const entry = map.get(i.client) ?? {
      total: 0,
      oldest: i.dueDate,
      count: 0,
    };
    entry.total += outstanding;
    entry.count += 1;
    if (i.dueDate < entry.oldest) entry.oldest = i.dueDate;
    map.set(i.client, entry);
  }
  return [...map.entries()]
    .map(([client, v]) => ({ client, ...v }))
    .toSorted((a, b) => b.total - a.total);
}

/** Number of days an invoice is overdue (negative = not yet due). */
export function overdueDays(i: Invoice, today: string): number {
  return daysBetween(i.dueDate, today);
}

/**
 * Expected collections: outstanding invoices due within `horizonDays`
 * (including already-overdue ones, since payment is expected soon).
 */
export function expectedCollections(
  invoices: Invoice[],
  today: string,
  horizonDays = 30,
): number {
  const horizon = shiftDays(today, horizonDays);
  let total = 0;
  for (const i of invoices) {
    if (i.status === "paid") continue;
    const outstanding = Math.max(0, i.baseAmount - i.paidAmount);
    if (outstanding <= 0) continue;
    if (i.dueDate <= horizon) total += outstanding;
  }
  return total;
}

/** Outstanding bills (accounts payable), mirroring the invoice helpers. */
export function outstandingBills(bills: Bill[]): number {
  return bills.reduce(
    (sum, b) => (b.status === "paid" ? sum : sum + Math.max(0, b.baseAmount - b.paidAmount)),
    0,
  );
}

/**
 * Expected payouts: outstanding bills due within `horizonDays`
 * (including already-overdue ones, since payment is imminent).
 */
export function expectedPayments(bills: Bill[], today: string, horizonDays = 30): number {
  const horizon = shiftDays(today, horizonDays);
  let total = 0;
  for (const b of bills) {
    if (b.status === "paid") continue;
    const outstanding = Math.max(0, b.baseAmount - b.paidAmount);
    if (outstanding <= 0) continue;
    if (b.dueDate <= horizon) total += outstanding;
  }
  return total;
}
