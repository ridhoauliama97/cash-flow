/**
 * Core domain types for the Cash Flow Dashboard.
 * These types are the shared contract between the data layer,
 * analytics library, and UI components.
 */

export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "IDR",
] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  IDR: "Indonesian Rupiah",
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
  IDR: "Rp",
};

export const TRANSACTION_TYPES = ["revenue", "expense"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const ACCOUNTING_BASIS = ["cash", "accrual"] as const;
export type AccountingBasis = (typeof ACCOUNTING_BASIS)[number];

export interface Transaction {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  type: TransactionType;
  description: string;
  amount: number; // amount in original currency
  currency: CurrencyCode;
  baseAmount: number; // amount converted to home currency
  category: string;
  product?: string;
  client?: string;
  region?: string;
  department?: string;
  project?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
}

export type TransactionDraft = Omit<
  Transaction,
  "id" | "baseAmount" | "createdAt"
>;

export const INVOICE_STATUSES = ["unpaid", "partial", "paid"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface Invoice {
  id: string;
  number: string;
  client: string;
  issueDate: string;
  dueDate: string;
  amount: number; // original currency
  currency: CurrencyCode;
  baseAmount: number; // converted to home currency
  paidAmount: number; // in base currency
  status: InvoiceStatus;
  project?: string;
  createdAt: string;
}

export type InvoiceDraft = Omit<
  Invoice,
  "id" | "baseAmount" | "createdAt" | "status" | "paidAmount"
>;

export interface Budget {
  id: string;
  month: string; // YYYY-MM
  category: string;
  amount: number; // home currency
}

export const SCHEDULE_FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number];

export const SCHEDULE_FORMATS = ["pdf", "csv", "both"] as const;
export type ScheduleFormat = (typeof SCHEDULE_FORMATS)[number];

export interface ReportSchedule {
  id: string;
  name: string;
  frequency: ScheduleFrequency;
  format: ScheduleFormat;
  recipients: string; // comma-separated emails
  enabled: boolean;
  lastSentAt: string | null;
  nextRunAt: string; // ISO datetime
}

export type ScheduleDraft = Omit<
  ReportSchedule,
  "id" | "lastSentAt" | "nextRunAt"
>;

export interface Profile {
  id: string;
  name: string;
  company: string;
  homeCurrency: CurrencyCode;
  openingBalance: number; // starting cash position in home currency
}

/** Normalized exchange rates: rate[code] = units of `code` per 1 unit of home currency. */
export type Rates = Record<CurrencyCode, number>;

export interface CachedRates {
  base: CurrencyCode;
  rates: Rates;
  fetchedAt: string;
  source: "live" | "fallback";
}

/** A rate that failed to load (e.g. API key invalid or offline). */
export interface RateStatus {
  ok: boolean;
  error?: string;
}

/** Filters shared across dashboard views. */
export interface DashboardFilters {
  dateFrom: string | null;
  dateTo: string | null;
  type: TransactionType | "all";
  category: string | null;
  product: string | null;
  client: string | null;
  region: string | null;
  department: string | null;
  project: string | null;
  basis: AccountingBasis | "all";
  search: string;
}

export const EMPTY_FILTERS: DashboardFilters = {
  dateFrom: null,
  dateTo: null,
  type: "all",
  category: null,
  product: null,
  client: null,
  region: null,
  department: null,
  project: null,
  basis: "all",
  search: "",
};

/** Period presets for comparison analytics. */
export type PeriodKey =
  | "7d"
  | "30d"
  | "90d"
  | "this_month"
  | "this_quarter"
  | "this_year";

/** The complete local dataset (also mirrors Supabase tables). */
export interface Database {
  profile: Profile;
  transactions: Transaction[];
  invoices: Invoice[];
  budgets: Budget[];
  schedules: ReportSchedule[];
  rates: CachedRates;
}
