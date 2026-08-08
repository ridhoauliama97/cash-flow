import type { Transaction } from "@/types";
import { byMonth } from "@/lib/analytics/kpis";

export interface BurnMetrics {
  grossBurn: number; // average monthly expenses over the window
  netBurn: number; // average monthly net flow over the window (negative = cash consumed)
  cashPosition: number; // opening balance + all net flow
  runwayMonths: number | null; // cash position / gross burn (null when no expenses)
  runwayDays: number | null;
  windowMonths: number; // number of months actually covered by the window
}

const DAYS_PER_MONTH = 30.44;

/**
 * Burn rate and runway estimates.
 * - Gross burn: average monthly expenses (cash consumed by operations).
 * - Net burn: average monthly net flow; negative when spending exceeds income.
 * - Runway: how long the current cash position lasts at the gross burn rate.
 */
export function burnMetrics(
  txs: Transaction[],
  openingBalance: number,
  months = 6,
): BurnMetrics {
  const points = byMonth(txs).slice(-months);
  const windowMonths = Math.max(1, points.length);
  const gross = points.reduce((s, p) => s + p.expenses, 0) / windowMonths;
  const net = points.reduce((s, p) => s + p.net, 0) / windowMonths;

  let netFlow = 0;
  for (const t of txs) {
    netFlow += t.type === "revenue" ? t.baseAmount : -t.baseAmount;
  }
  const cashPosition = openingBalance + netFlow;

  const runwayMonths = gross > 0 ? cashPosition / gross : null;
  const runwayDays =
    runwayMonths === null ? null : Math.floor(runwayMonths * DAYS_PER_MONTH);

  return { grossBurn: gross, netBurn: net, cashPosition, runwayMonths, runwayDays, windowMonths };
}
