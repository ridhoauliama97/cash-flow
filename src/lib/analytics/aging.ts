import type { Invoice } from "@/types";
import { daysBetween } from "@/lib/utils";

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

const overdue = (i: Invoice): number =>
  Math.max(0, i.baseAmount - i.paidAmount);

/**
 * Group invoices by aging period (current, 1-30, 31-60, 61-90, 90+ days overdue).
 * `current` = not yet due.
 */
export function agingBuckets(invoices: Invoice[], today: string): AgingSummary {
  const buckets: AgingBucket[] = [
    { key: "current", label: "Current", invoices: [], total: 0 },
    { key: "days30", label: "1–30 days", invoices: [], total: 0 },
    { key: "days60", label: "31–60 days", invoices: [], total: 0 },
    { key: "days90", label: "61–90 days", invoices: [], total: 0 },
    { key: "days90plus", label: "90+ days", invoices: [], total: 0 },
  ];

  let totalOutstanding = 0;
  let totalOverdue = 0;
  let overdueCount = 0;
  const atRisk: Invoice[] = [];

  for (const i of invoices) {
    if (i.status === "paid") continue;
    const outstanding = overdue(i);
    if (outstanding <= 0) continue;
    totalOutstanding += outstanding;

    const overdueDays = daysBetween(i.dueDate, today);
    let bucket: AgingBucket;
    if (overdueDays <= 0) bucket = buckets[0];
    else if (overdueDays <= 30) bucket = buckets[1];
    else if (overdueDays <= 60) bucket = buckets[2];
    else if (overdueDays <= 90) bucket = buckets[3];
    else bucket = buckets[4];

    bucket.invoices.push(i);
    bucket.total += outstanding;

    if (overdueDays > 0) {
      totalOverdue += outstanding;
      overdueCount += 1;
      atRisk.push(i);
    }
  }

  atRisk.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return { buckets, totalOutstanding, totalOverdue, overdueCount, atRisk };
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
