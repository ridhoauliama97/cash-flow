// Validasi Supplier — PURE (tanpa DB/React), unit-test di suppliers.test.ts.
// Server actions memakai fungsi ini sebelum menulis ke DB.

export interface SupplierRow {
  id: string;
  name: string;
  contactInfo: string | null;
}

export interface SupplierInput {
  name: string;
  contactInfo: string;
}

/** Kembalikan pesan error, atau null bila valid. */
export function validateSupplier(input: SupplierInput): string | null {
  if (!input.name.trim()) return "Nama supplier wajib diisi";
  // contact_info opsional — string kosong dibiarkan lolos, aksi server
  // mengubahnya menjadi NULL saat menulis ke DB.
  return null;
}
