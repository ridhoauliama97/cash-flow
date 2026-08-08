// Analitik bulanan murni (pure, unit-testable): agregasi transaksi per bulan.

export interface TxnRow {
  date: string;
  type: string; // income | expense
  baseAmount: number; // IDR
}

export interface MonthRow {
  month: string; // "YYYY-MM"
  income: number;
  expense: number;
}

export interface Totals {
  income: number;
  expense: number;
  net: number;
}

/** Format "YYYY-MM" → label Indonesia pendek ("Agu 2026"). */
export function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  const d = new Date(year, (month ?? 1) - 1, 1);
  return d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
}

/**
 * Agregasi transaksi per bulan (income vs expense, dalam IDR).
 * Hanya baris yang sudah di-post (status draft/approved) — caller menyaring.
 * Akun tanpa transaksi tidak muncul; bulan diurutkan ascending.
 */
export function aggregateMonthly(rows: ReadonlyArray<TxnRow>): MonthRow[] {
  const byMonth = new Map<string, MonthRow>();
  for (const row of rows) {
    const ym = row.date.slice(0, 7); // "YYYY-MM" — aman untuk ISO
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    const m = byMonth.get(ym) ?? { month: ym, income: 0, expense: 0 };
    if (row.type === "income") m.income += row.baseAmount;
    else if (row.type === "expense") m.expense += row.baseAmount;
    byMonth.set(ym, m);
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function computeTotals(rows: ReadonlyArray<MonthRow>): Totals {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    income += r.income;
    expense += r.expense;
  }
  return { income, expense, net: income - expense };
}
