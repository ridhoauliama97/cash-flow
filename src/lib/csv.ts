import Papa from "papaparse";
import {
  CURRENCIES,
  type CurrencyCode,
  type TransactionDraft,
  type TransactionType,
} from "@/types";
import { shiftDays, todayISO } from "@/lib/utils";

export interface CsvParseResult {
  transactions: TransactionDraft[];
  skipped: number;
  errors: string[];
}

const CATEGORY_HINTS: Array<[RegExp, string, TransactionType]> = [
  [/consult|service|retainer|project fee/i, "Client Services", "revenue"],
  [/design|logo|brand/i, "Design Services", "revenue"],
  [/develop|code|app|website/i, "Development", "revenue"],
  [/license|saas|software|subscription/i, "Software & Licenses", "revenue"],
  [/course|training|workshop/i, "Courses & Training", "revenue"],
  [/affiliate|referral/i, "Affiliate Income", "revenue"],
  [
    /ad\s*revenue|adsense|advertis(?:ing|ement)\s+(?:revenue|income|payout)/i,
    "Advertising",
    "revenue",
  ],
  [/rent|lease/i, "Rent & Facilities", "expense"],
  [/salary|payroll|wage/i, "Salaries & Payroll", "expense"],
  [
    /software|saas|subscription|hosting|cloud/i,
    "Software & Subscriptions",
    "expense",
  ],
  [
    /marketing|google\s*ads|facebook\s*ads|ad\s*campaign|advertis|spend/i,
    "Marketing & Ads",
    "expense",
  ],
  [/travel|flight|hotel/i, "Travel", "expense"],
  [/office|supplies|equipment/i, "Office & Supplies", "expense"],
  [/contractor|freelance/i, "Contractors", "expense"],
  [/tax|insurance/i, "Taxes & Insurance", "expense"],
  [/utility|electric|internet|phone/i, "Utilities", "expense"],
  [/bank|fee|transfer|commission/i, "Bank & Transfer Fees", "expense"],
];

/** Infer a transaction type + category from a description. */
export function inferCategory(description: string): {
  category: string;
  type: TransactionType;
} {
  for (const [re, category, type] of CATEGORY_HINTS) {
    if (re.test(description)) return { category, type };
  }
  return { category: "Other", type: "revenue" };
}

function parseCurrency(raw: string): CurrencyCode | null {
  const v = raw.trim().toUpperCase();
  if (CURRENCIES.includes(v as CurrencyCode)) return v as CurrencyCode;
  // Symbol-based detection
  if (v === "$") return "USD";
  if (v === "€") return "EUR";
  if (v === "£") return "GBP";
  if (v === "¥") return "JPY";
  if (v.startsWith("C$") || v === "CAD") return "CAD";
  if (v.startsWith("A$") || v === "AUD") return "AUD";
  if (v.startsWith("RP") || v === "IDR") return "IDR";
  return null;
}

/**
 * Parse a user-typed amount, tolerating localized formats:
 * "15.000" (IDR thousands), "1.234,56" (European), "1,5" (decimal comma),
 * "$1,250.50" (US) — with mixed separators the LAST one is the decimal.
 */
function toNumber(raw: string): number | null {
  if (!raw || raw.trim() === "") return null;
  let v = raw.trim().replace(/[^\d.,-]/g, "");
  const lastDot = v.lastIndexOf(".");
  const lastComma = v.lastIndexOf(",");
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastDot > lastComma) v = v.replace(/,/g, ""); // dot is decimal (US)
    else v = v.replace(/\./g, "").replace(/,/, "."); // comma is decimal (EU)
  } else if (lastComma !== -1) {
    v = /^\d{3}$/.test(v.slice(lastComma + 1)) ? v.replace(/,/g, "") : v.replace(/,/, ".");
  } else if (lastDot !== -1 && !/^\d{1,2}$/.test(v.slice(lastDot + 1))) {
    v = v.replace(/\./g, ""); // dot groups thousands ("15.000")
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const HEADER_ALIASES: Record<string, keyof TransactionDraft> = {
  date: "date",
  transactiondate: "date",
  createdat: "date",
  description: "description",
  notes: "description",
  memo: "description",
  name: "description",
  amount: "amount",
  value: "amount",
  total: "amount",
  currency: "currency",
  category: "category",
  type: "type",
  product: "product",
  client: "client",
  customer: "client",
  region: "region",
  department: "department",
  project: "project",
  paymentmethod: "paymentMethod",
  method: "paymentMethod",
};

/**
 * Parse CSV rows into transaction drafts. Auto-detects headers,
 * converts amounts/currencies, and infers categories/types.
 */
export function parseTransactionsCsv(text: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, ""),
  });

  if (parsed.errors.length > 0) {
    return {
      transactions: [],
      skipped: 0,
      errors: parsed.errors.map((e) => `Row ${e.row}: ${e.message}`),
    };
  }

  const transactions: TransactionDraft[] = [];
  let skipped = 0;
  const errors: string[] = [];

  parsed.data.forEach((row, i) => {
    const mapped = {} as Record<keyof TransactionDraft, string | undefined>;
    for (const [key, value] of Object.entries(row)) {
      const field = HEADER_ALIASES[key];
      if (field) mapped[field] = value;
    }

    const amount = toNumber(mapped.amount ?? "");
    const currency = mapped.currency ? parseCurrency(mapped.currency) : null;
    const typeRaw = (mapped.type ?? "").trim().toLowerCase();

    if (amount === null || amount <= 0) {
      skipped++;
      errors.push(`Row ${i + 2}: missing or invalid amount — skipped`);
      return;
    }

    const inferred = inferCategory(mapped.description ?? mapped.category ?? "");
    const type: TransactionType =
      typeRaw === "expense" ||
      typeRaw === "expenses" ||
      typeRaw === "cost" ||
      typeRaw === "out"
        ? "expense"
        : typeRaw === "revenue" ||
            typeRaw === "income" ||
            typeRaw === "sale" ||
            typeRaw === "in"
          ? "revenue"
          : inferred.type;

    const description = (
      mapped.description ??
      mapped.category ??
      "Imported transaction"
    ).trim();
    const rawDate = (mapped.date ?? "").trim();
    const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? rawDate
      : rawDate.length === 10 && /^\d{2}[/-]\d{2}[/-]\d{4}$/.test(rawDate)
        ? `${rawDate.slice(6, 10)}-${rawDate.slice(0, 2)}-${rawDate.slice(3, 5)}`
        : todayISO();

    transactions.push({
      date,
      type,
      description: description || "Imported transaction",
      amount,
      currency: currency ?? "USD",
      category: (mapped.category ?? inferred.category).trim() || "Other",
      product: mapped.product || undefined,
      client: mapped.client || undefined,
      region: mapped.region || undefined,
      department: mapped.department || undefined,
      project: mapped.project || undefined,
      paymentMethod: mapped.paymentMethod || undefined,
    });
  });

  return { transactions, skipped, errors };
}

/** Build a CSV template string users can download before importing. */
export function csvTemplate(): string {
  return [
    "date,type,description,amount,currency,category,client,region,project,department",
    `2026-08-01,revenue,"Monthly retainer — Acme Inc",2500,USD,"Client Services",Acme,US,"Website Retainer",Product`,
    `2026-08-03,expense,"Figma subscription",15,USD,"Software & Subscriptions",,,,Engineering`,
    `2026-08-05,revenue,"Design sprint",1800,EUR,"Design Services",Beta GmbH,EU,"Brand Refresh",Design`,
    `2026-08-07,expense,"AWS hosting",120,USD,"Software & Subscriptions",,,,Engineering`,
  ].join("\n");
}

/** Reference demo date window used by the demo-data generator. */
export const DEMO_END = todayISO();
export const DEMO_START = shiftDays(DEMO_END, -365);
