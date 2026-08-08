// Master data types — NO TS enums (erasableSyntaxOnly): const arrays + unions.
// Nilai disimpan sebagai string di DB; validasi di aplikasi.

export const ACCOUNT_TYPES = [
  "Asset",
  "Liability",
  "Equity",
  "Revenue",
  "Expense",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function isAccountType(v: string): v is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(v);
}
