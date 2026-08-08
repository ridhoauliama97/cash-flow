import type { Transaction } from "@/types";

/**
 * Recurring-revenue analytics (MRR / ARR and new vs. expansion vs.
 * contraction vs. churn) derived from the transaction ledger.
 *
 * A transaction counts as recurring when its product name matches a
 * subscription-like hint (retainer, SaaS plan, support contract, …).
 * Keep the hints broad enough that an explicit product field is not
 * required, but they only ever apply to revenue transactions.
 */

export interface MrrPoint {
  key: string; // YYYY-MM
  label: string;
  mrr: number; // recurring revenue booked in the month
  arr: number; // mrr × 12
  clients: number; // distinct clients contributing recurring revenue
}

export interface MrrDeltaPoint {
  key: string;
  label: string;
  new: number; // MRR from clients with no recurring revenue before
  expansion: number; // MRR increase from existing recurring clients
  contraction: number; // MRR decrease from existing recurring clients
  churn: number; // MRR lost from clients with no recurring revenue this month
}

export interface MrrSummary {
  mrr: number;
  arr: number;
  growthPct: number | null; // % vs previous month
  clientCount: number;
}

const RECURRING_HINTS: RegExp[] = [
  /subscription/i,
  /saas/i,
  /retainer/i,
  /maintenance/i,
  /support\s*plan/i,
  /license/i,
  /monthly\s*(fee|plan|service)/i,
];

/** Whether a product name looks like a recurring (subscription) product. */
export function isRecurringProduct(name: string | null | undefined): boolean {
  if (!name) return false;
  return RECURRING_HINTS.some((re) => re.test(name));
}

/** Revenue transactions that belong to recurring products. */
export function recurringRevenue(txs: Transaction[]): Transaction[] {
  return txs.filter((t) => t.type === "revenue" && isRecurringProduct(t.product));
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y ?? 2000, (m ?? 1) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
  });
}

/** Monthly MRR/ARR series from recurring revenue transactions. */
export function mrrByMonth(txs: Transaction[], months = 12): MrrPoint[] {
  const map = new Map<string, { mrr: number; clients: Set<string> }>();
  for (const t of recurringRevenue(txs)) {
    const key = t.date.slice(0, 7);
    const entry = map.get(key) ?? { mrr: 0, clients: new Set<string>() };
    entry.mrr += t.baseAmount;
    if (t.client) entry.clients.add(t.client);
    map.set(key, entry);
  }
  return [...map.entries()]
    .toSorted((a, b) => a[0].localeCompare(b[0]))
    .slice(-months)
    .map(([key, v]) => ({
      key,
      label: monthLabel(key),
      mrr: v.mrr,
      arr: v.mrr * 12,
      clients: v.clients.size,
    }));
}

/**
 * New / expansion / contraction / churn decomposition of MRR, month by
 * month, based on per-client recurring revenue deltas.
 */
export function mrrDeltaByMonth(txs: Transaction[], months = 12): MrrDeltaPoint[] {
  // per-client monthly recurring revenue
  const byClient = new Map<string, Map<string, number>>();
  for (const t of recurringRevenue(txs)) {
    if (!t.client) continue;
    const key = t.date.slice(0, 7);
    const clientMonths = byClient.get(t.client) ?? new Map<string, number>();
    clientMonths.set(key, (clientMonths.get(key) ?? 0) + t.baseAmount);
    byClient.set(t.client, clientMonths);
  }
  if (byClient.size === 0) return [];

  const monthKeys = [...new Set([...byClient.values()].flatMap((m) => [...m.keys()]))].toSorted();
  const last = new Map<string, number>();
  const points: MrrDeltaPoint[] = [];

  for (const key of monthKeys) {
    let nw = 0;
    let expansion = 0;
    let contraction = 0;
    let churn = 0;
    for (const [client, months] of byClient) {
      const now = months.get(key) ?? 0;
      const prev = last.get(client) ?? 0;
      if (prev === 0 && now > 0) nw += now;
      else if (prev > 0 && now > prev) expansion += now - prev;
      else if (prev > 0 && now < prev) {
        if (now > 0) contraction += prev - now;
        else churn += prev;
      }
    }
    for (const [client, months] of byClient) last.set(client, months.get(key) ?? 0);
    points.push({ key, label: monthLabel(key), new: nw, expansion, contraction, churn });
  }
  return points.slice(-months);
}

/** Latest MRR, ARR, month-over-month growth and recurring client count. */
export function mrrSummary(txs: Transaction[]): MrrSummary {
  const points = mrrByMonth(txs, 2);
  const latest = points[points.length - 1];
  const prev = points[points.length - 2];
  const mrr = latest?.mrr ?? 0;
  const growthPct =
    prev && prev.mrr > 0 ? ((mrr - prev.mrr) / prev.mrr) * 100 : null;
  return { mrr, arr: mrr * 12, growthPct, clientCount: latest?.clients ?? 0 };
}
