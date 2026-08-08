// Validasi Customer — PURE (tanpa DB/React), unit-test di customers.test.ts.
// Server actions memakai fungsi ini sebelum menulis ke DB.

export interface CustomerRow {
  id: string;
  name: string;
  contactInfo: string | null;
}

export interface CustomerInput {
  name: string;
  contactInfo: string | null;
}

/** Kembalikan pesan error, atau null bila valid. */
export function validateCustomer(input: CustomerInput): string | null {
  if (!input.name.trim()) return "Nama customer wajib diisi";
  return null;
}
