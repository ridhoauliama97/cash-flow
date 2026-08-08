import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatIDR } from "@/lib/format";
import type { MonthlySummary } from "@/lib/actions/analytics";

export type AnalyticsMode =
  | "revenue"
  | "expenses"
  | "profitability"
  | "cash-flow";

const MODE_META: Record<
  AnalyticsMode,
  {
    title: string;
    subtitle: string;
    columns: Array<{ key: "income" | "expense" | "net"; label: string }>;
    cards: Array<{ key: "income" | "expense" | "net"; label: string }>;
    empty: string;
  }
> = {
  revenue: {
    title: "Revenue",
    subtitle: "Pendapatan per bulan (transaksi income, IDR)",
    columns: [{ key: "income", label: "Pendapatan" }],
    cards: [
      { key: "income", label: "Total Pendapatan" },
      { key: "expense", label: "Total Beban" },
      { key: "net", label: "Laba Bersih" },
    ],
    empty: "Belum ada transaksi income.",
  },
  expenses: {
    title: "Expenses",
    subtitle: "Pengeluaran per bulan (transaksi expense, IDR)",
    columns: [{ key: "expense", label: "Beban" }],
    cards: [
      { key: "expense", label: "Total Beban" },
      { key: "income", label: "Total Pendapatan" },
      { key: "net", label: "Laba Bersih" },
    ],
    empty: "Belum ada transaksi expense.",
  },
  profitability: {
    title: "Profitability",
    subtitle: "Pendapatan vs beban per bulan — laba bersih (IDR)",
    columns: [
      { key: "income", label: "Pendapatan" },
      { key: "expense", label: "Beban" },
      { key: "net", label: "Laba Bersih" },
    ],
    cards: [
      { key: "net", label: "Laba Bersih" },
      { key: "income", label: "Total Pendapatan" },
      { key: "expense", label: "Total Beban" },
    ],
    empty: "Belum ada transaksi — buat transaksi income/expense dulu.",
  },
  "cash-flow": {
    title: "Cash Flow",
    subtitle: "Arus kas per bulan — netto masuk/keluar (IDR)",
    columns: [
      { key: "income", label: "Arus Masuk" },
      { key: "expense", label: "Arus Keluar" },
      { key: "net", label: "Netto" },
    ],
    cards: [
      { key: "net", label: "Arus Kas Bersih" },
      { key: "income", label: "Total Masuk" },
      { key: "expense", label: "Total Keluar" },
    ],
    empty: "Belum ada transaksi kas.",
  },
};

export function MonthlyTable({
  mode,
  data,
}: {
  mode: AnalyticsMode;
  data: MonthlySummary;
}) {
  const meta = MODE_META[mode];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          {meta.title}
        </h1>
        <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {meta.cards.map((card) => (
          <div key={card.key} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p
              className={`text-xl font-semibold ${
                card.key === "net"
                  ? data.totals.net >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                  : ""
              }`}
            >
              {formatIDR(data.totals[card.key])}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bulan</TableHead>
              {meta.columns.map((c) => (
                <TableHead key={c.key} className="text-right">
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={meta.columns.length + 1}
                  className="py-10 text-center text-muted-foreground"
                >
                  {meta.empty}
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="font-medium capitalize">
                    {row.label}
                  </TableCell>
                  {meta.columns.map((c) => (
                    <TableCell key={c.key} className="text-right tabular-nums">
                      {formatIDR(row[c.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
