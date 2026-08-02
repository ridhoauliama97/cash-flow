import Papa from "papaparse";
import {
  CURRENCIES,
  type CurrencyCode,
  type Transaction,
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
  const probe = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return parseCsvWithMapping(text, detectColumnMapping(probe.meta.fields ?? []));
}

export type CsvField =
  | "date"
  | "type"
  | "description"
  | "amount"
  | "currency"
  | "category"
  | "client"
  | "product"
  | "region"
  | "department"
  | "project"
  | "paymentMethod";

export const CSV_FIELDS: CsvField[] = [
  "date",
  "type",
  "description",
  "amount",
  "currency",
  "category",
  "client",
  "product",
  "region",
  "department",
  "project",
  "paymentMethod",
];

export const FIELD_LABELS: Record<CsvField, string> = {
  date: "Date",
  type: "Type",
  description: "Description",
  amount: "Amount",
  currency: "Currency",
  category: "Category",
  client: "Client",
  product: "Product",
  region: "Region",
  department: "Department",
  project: "Project",
  paymentMethod: "Payment method",
};

/** Maps a source CSV header (lowercased, space-stripped) to a target field. */
export interface CsvColumnMapping {
  date: string | null;
  type: string | null;
  description: string | null;
  amount: string | null;
  currency: string | null;
  category: string | null;
  client: string | null;
  product: string | null;
  region: string | null;
  department: string | null;
  project: string | null;
  paymentMethod: string | null;
}

export const EMPTY_MAPPING: CsvColumnMapping = {
  date: null,
  type: null,
  description: null,
  amount: null,
  currency: null,
  category: null,
  client: null,
  product: null,
  region: null,
  department: null,
  project: null,
  paymentMethod: null,
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Best-effort header detection: each header matching a known alias
 * (e.g. "Transaction date", "Memo", "Value") is assigned once.
 */
export function detectColumnMapping(headers: string[]): CsvColumnMapping {
  const mapping: CsvColumnMapping = { ...EMPTY_MAPPING };
  const used = new Set<string>();
  for (const raw of headers) {
    const key = normalizeHeader(raw);
    if (used.has(key)) continue;
    const field = HEADER_ALIASES[key] as CsvField | undefined;
    if (field && mapping[field] === null) {
      mapping[field] = key;
      used.add(key);
    }
  }
  return mapping;
}

/** Normalize raw date strings to YYYY-MM-DD, defaulting to today. */
function normalizeDate(raw: string): string {
  const v = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (v.length === 10 && /^\d{2}[/.-]\d{2}[/.-]\d{4}$/.test(v)) {
    const first = Number(v.slice(0, 2));
    const second = Number(v.slice(3, 5));
    // Day > 12 ⇒ day-first (EU); month > 12 ⇒ month-first (US); otherwise
    // fall back to convention: dot/dash separators are EU, slash is US.
    const dayFirst = first > 12 || (second <= 12 && (v[2] === "." || v[2] === "-"));
    return `${v.slice(6, 10)}-${dayFirst ? v.slice(3, 5) : v.slice(0, 2)}-${dayFirst ? v.slice(0, 2) : v.slice(3, 5)}`;
  }
  return todayISO();
}

/**
 * Parse CSV rows honoring an explicit column mapping. Fields left
 * unmapped fall back to inference (description → category/type) or
 * defaults (date → today, currency → USD).
 */
export function parseCsvWithMapping(text: string, mapping: CsvColumnMapping): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
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
    const get = (field: CsvField): string => {
      const key = mapping[field];
      return key ? (row[key] ?? "") : "";
    };

    const amount = toNumber(get("amount"));
    const currency = get("currency") ? parseCurrency(get("currency")) : null;
    const typeRaw = get("type").trim().toLowerCase();

    if (amount === null || amount <= 0) {
      skipped++;
      errors.push(`Row ${i + 2}: missing or invalid amount — skipped`);
      return;
    }

    const description = (get("description") || get("category") || "Imported transaction").trim();
    const inferred = inferCategory(description || get("category"));
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

    transactions.push({
      date: normalizeDate(get("date")),
      type,
      description: description || "Imported transaction",
      amount,
      currency: currency ?? "USD",
      category: get("category").trim() || inferred.category || "Other",
      product: get("product") || undefined,
      client: get("client") || undefined,
      region: get("region") || undefined,
      department: get("department") || undefined,
      project: get("project") || undefined,
      paymentMethod: get("paymentMethod") || undefined,
    });
  });

  return { transactions, skipped, errors };
}

function draftSignature(d: {
  date: string;
  description: string;
  amount: number;
  currency: string;
}): string {
  return [d.date, d.description.trim().toLowerCase(), d.amount.toFixed(4), d.currency].join("|");
}

export interface DedupeResult {
  kept: TransactionDraft[];
  duplicates: TransactionDraft[];
}

/**
 * Drop rows that already exist (same date, description, amount, currency)
 * either in the imported batch or in the current dataset. Uses an additive
 * seen-set so repeated rows within one file are also deduplicated.
 */
export function dedupeTransactions(
  drafts: TransactionDraft[],
  existing: Array<Pick<Transaction, "date" | "description" | "amount" | "currency">>,
): DedupeResult {
  const seen = new Set<string>(existing.map(draftSignature));
  const kept: TransactionDraft[] = [];
  const duplicates: TransactionDraft[] = [];
  for (const d of drafts) {
    const sig = draftSignature(d);
    if (seen.has(sig)) {
      duplicates.push(d);
    } else {
      seen.add(sig);
      kept.push(d);
    }
  }
  return { kept, duplicates };
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
