import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { CurrencyCode, Invoice, Transaction } from "@/types";
import { byDimension, sumByType } from "@/lib/analytics/kpis";
import type { PeriodRange } from "@/lib/analytics/periods";
import { formatMoney } from "@/lib/format";

export interface ReportRow {
  label: string;
  amount: number | null;
  indent?: boolean;
}

export interface ReportSection {
  title: string;
  rows: ReportRow[];
}

export interface FinancialReport {
  title: string;
  periodLabel: string;
  currency: CurrencyCode;
  company: string;
  generatedAt: string;
  sections: ReportSection[];
  totals: ReportRow[];
}

/** Profit & Loss statement for a period. */
export function buildProfitLoss(
  txs: Transaction[],
  range: PeriodRange,
  currency: CurrencyCode,
  company: string,
): FinancialReport {
  const period = txs.filter((t) => t.date >= range.from && t.date <= range.to);
  const revenue = byDimension(
    period.filter((t) => t.type === "revenue"),
    "category",
    50,
  );
  const expenses = byDimension(
    period.filter((t) => t.type === "expense"),
    "category",
    50,
  );
  const totals = sumByType(period);

  return {
    title: "Profit & Loss Statement",
    periodLabel: `${range.from} → ${range.to}`,
    currency,
    company,
    generatedAt: new Date().toISOString(),
    sections: [
      {
        title: "Revenue",
        rows: revenue.map((r) => ({ label: r.name, amount: r.value })),
      },
      {
        title: "Expenses",
        rows: expenses.map((r) => ({ label: r.name, amount: -r.value })),
      },
    ],
    totals: [
      { label: "Total revenue", amount: totals.revenue },
      { label: "Total expenses", amount: -totals.expenses },
      { label: "Net income", amount: totals.net },
    ],
  };
}

export interface BalanceSheetData {
  assetsCash: number;
  assetsReceivable: number;
  equityOpening: number;
  equityRetained: number;
  liabilities: number;
}

/** Balance sheet as of a date: Assets = Cash + AR; Equity = Opening + Retained. */
export function balanceSheetData(
  txs: Transaction[],
  invoices: Invoice[],
  openingBalance: number,
  asOf: string,
): BalanceSheetData {
  const upto = txs.filter((t) => t.date <= asOf);
  const totals = sumByType(upto);
  const receivable = invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + Math.max(0, i.baseAmount - i.paidAmount), 0);

  const assetsCash = openingBalance + totals.net;
  const assetsReceivable = receivable;
  const equityOpening = openingBalance;
  const equityRetained = totals.net;

  return {
    assetsCash,
    assetsReceivable,
    equityOpening,
    equityRetained,
    liabilities: 0,
  };
}

export function buildBalanceSheet(
  balance: BalanceSheetData,
  asOf: string,
  currency: CurrencyCode,
  company: string,
): FinancialReport {
  const totalAssets = balance.assetsCash + balance.assetsReceivable;
  const totalEquity =
    balance.equityOpening + balance.equityRetained + balance.liabilities;

  return {
    title: "Balance Sheet",
    periodLabel: `As of ${asOf}`,
    currency,
    company,
    generatedAt: new Date().toISOString(),
    sections: [
      {
        title: "Assets",
        rows: [
          { label: "Cash & bank", amount: balance.assetsCash },
          { label: "Accounts receivable", amount: balance.assetsReceivable },
        ],
      },
      {
        title: "Equity & Liabilities",
        rows: [
          { label: "Opening capital", amount: balance.equityOpening },
          { label: "Retained earnings", amount: balance.equityRetained },
          { label: "Liabilities", amount: balance.liabilities },
        ],
      },
    ],
    totals: [
      { label: "Total assets", amount: totalAssets },
      { label: "Total equity & liabilities", amount: totalEquity },
    ],
  };
}

/** Cash flow statement for a period (operating activity). */
export function buildCashFlowStatement(
  txs: Transaction[],
  range: PeriodRange,
  openingBalance: number,
  currency: CurrencyCode,
  company: string,
): FinancialReport {
  const period = txs.filter((t) => t.date >= range.from && t.date <= range.to);
  const inflows = byDimension(
    period.filter((t) => t.type === "revenue"),
    "category",
    50,
  );
  const outflows = byDimension(
    period.filter((t) => t.type === "expense"),
    "category",
    50,
  );
  const totals = sumByType(period);
  const closing = openingBalance + totals.net;

  return {
    title: "Cash Flow Statement",
    periodLabel: `${range.from} → ${range.to}`,
    currency,
    company,
    generatedAt: new Date().toISOString(),
    sections: [
      {
        title: "Operating activities — inflows",
        rows: inflows.map((r) => ({ label: r.name, amount: r.value })),
      },
      {
        title: "Operating activities — outflows",
        rows: outflows.map((r) => ({ label: r.name, amount: -r.value })),
      },
    ],
    totals: [
      { label: "Opening balance", amount: openingBalance },
      { label: "Net operating cash flow", amount: totals.net },
      { label: "Closing balance", amount: closing },
    ],
  };
}

/** Escape a text cell against CSV formula injection (Excel/Sheets). */
function csvSafe(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

/** Flatten a report into CSV rows (label + amount per line). */
export function reportToCsv(report: FinancialReport): string {
  const lines: string[] = [];
  lines.push(`${csvSafe(report.title)} — ${csvSafe(report.company)}`);
  lines.push(`Period: ${csvSafe(report.periodLabel)} | Currency: ${report.currency}`);
  lines.push("");
  for (const section of report.sections) {
    lines.push(csvSafe(section.title));
    lines.push("Item,Amount");
    for (const row of section.rows) {
      lines.push(`${csvSafe(row.label)},${row.amount ?? ""}`);
    }
    lines.push("");
  }
  lines.push("Totals");
  lines.push("Item,Amount");
  for (const row of report.totals)
    lines.push(`${csvSafe(row.label)},${row.amount ?? ""}`);
  return lines.join("\n");
}

/** Download any string as a file (Excel-friendly CSV). */
export function downloadFile(
  content: string,
  filename: string,
  mime = "text/csv;charset=utf-8",
): void {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadReportCsv(report: FinancialReport): void {
  const slug = report.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  downloadFile(
    reportToCsv(report),
    `${slug}-${report.periodLabel.replace(/\s+/g, "-")}.csv`,
  );
}

/** Generate a professional PDF of a financial report. */
export function downloadReportPdf(report: FinancialReport): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(report.title, 40, 48);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(
    `${report.company}  •  Period: ${report.periodLabel}  •  ${report.currency}`,
    40,
    64,
  );
  doc.setTextColor(0);

  let y = 84;
  for (const section of report.sections) {
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = 48;
    }
    autoTable(doc, {
      startY: y,
      head: [[section.title, ""]],
      body: section.rows.map((r) => [
        (r.indent ? "    " : "") + r.label,
        r.amount === null ? "—" : formatMoney(r.amount, report.currency),
      ]),
      theme: "grid",
      headStyles: { fillColor: [22, 101, 52], fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    });
    const lastTable = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
    y = (lastTable?.finalY ?? y) + 18;
  }

  autoTable(doc, {
    startY: y,
    head: [["Totals", ""]],
    body: report.totals.map((r) => [
      r.label,
      r.amount === null ? "—" : formatMoney(r.amount, report.currency),
    ]),
    theme: "grid",
    headStyles: { fillColor: [31, 41, 55], fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 4, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" } },
  });

  doc.save(`${report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
}
