// Ledger types — NO TS enums (erasableSyntaxOnly): const arrays + unions.
// Nilai disimpan sebagai string/number di DB; validasi di aplikasi.

export const CURRENCIES = ["IDR", "USD", "EUR", "GBP", "JPY", "AUD", "SGD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/// Fase 1: hanya income/expense (sale/purchase menyusul di fase berikutnya).
export const TRANSACTION_TYPES_FASE1 = ["income", "expense"] as const;
export type TransactionTypeFase1 = (typeof TRANSACTION_TYPES_FASE1)[number];

export const TRANSACTION_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_SOURCES = ["manual"] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export const PERIOD_STATUSES = ["open", "closed"] as const;
export type PeriodStatus = (typeof PERIOD_STATUSES)[number];

export const APPROVAL_LEVELS = [1, 2] as const;
export type ApprovalLevel = (typeof APPROVAL_LEVELS)[number];

export const APPROVAL_STATUSES = ["approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export function isCurrency(v: string): v is Currency {
  return (CURRENCIES as readonly string[]).includes(v);
}

export function isTransactionTypeFase1(v: string): v is TransactionTypeFase1 {
  return (TRANSACTION_TYPES_FASE1 as readonly string[]).includes(v);
}
