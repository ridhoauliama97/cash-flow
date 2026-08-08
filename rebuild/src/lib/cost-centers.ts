// Validasi Cost Center — PURE (tanpa DB/React), unit-test di cost-centers.test.ts.
// Server actions memakai fungsi ini sebelum menulis ke DB.

export interface CostCenterRow {
  id: string;
  code: string;
  name: string;
  divisionId: string;
}

export interface CostCenterInput {
  code: string;
  name: string;
  divisionId: string;
}

export interface DivisionRow {
  id: string;
  name: string;
}

/** Kembalikan pesan error, atau null bila valid. */
export function validateCostCenter(input: CostCenterInput): string | null {
  if (!input.code.trim()) return "Kode cost center wajib diisi";
  if (!input.name.trim()) return "Nama cost center wajib diisi";
  if (!input.divisionId.trim()) return "Divisi wajib diisi";
  return null;
}
