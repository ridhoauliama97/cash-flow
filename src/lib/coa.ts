// Validasi Chart of Accounts — PURE (tanpa DB/React), unit-test di coa.test.ts.
// Server actions memakai fungsi ini sebelum menulis ke DB.

import { ACCOUNT_TYPES, type AccountType } from "@/types/master-data";

export interface CoaRow {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId: string | null;
}

export interface CoaInput {
  code: string;
  name: string;
  type: string;
  parentId: string | null;
}

export interface CoaNode extends CoaRow {
  children: CoaNode[];
}

export const COA_CODE_RE = /^[0-9][0-9-]*$/;

/** Kembalikan pesan error, atau null bila valid. */
export function validateCoa(input: CoaInput): string | null {
  const code = input.code.trim();
  if (!code) return "Kode akun wajib diisi";
  if (!COA_CODE_RE.test(code)) return "Kode akun hanya boleh angka dan tanda minus";
  if (!input.name.trim()) return "Nama akun wajib diisi";
  if (!ACCOUNT_TYPES.includes(input.type as AccountType)) {
    return `Tipe akun harus salah satu dari: ${ACCOUNT_TYPES.join(", ")}`;
  }
  return null;
}

/**
 * Deteksi cycle saat mengubah parent: naik dari parent baru; bila sampai ke
 * akun itu sendiri (id) sebelum null, terjadi cycle.
 */
export function detectCoaCycle(
  rows: ReadonlyArray<Pick<CoaRow, "id" | "parentId">>,
  id: string,
  newParentId: string | null,
): boolean {
  if (!newParentId) return false;
  const byId = new Map(rows.map((r) => [r.id, r]));
  let cur = byId.get(newParentId);
  const visited = new Set<string>();
  while (cur) {
    if (cur.id === id) return true;
    if (visited.has(cur.id)) return true; // data korup — amankan
    visited.add(cur.id);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return false;
}

/** Bangun hierarki (sorted: parent sebelum child, children recursive). */
export function buildCoaTree(
  rows: ReadonlyArray<CoaRow>,
  sortBy: (a: CoaRow, b: CoaRow) => number = (a, b) => a.code.localeCompare(b.code),
): CoaNode[] {
  const byId = new Map<string, CoaNode>();
  for (const r of rows) byId.set(r.id, { ...r, children: [] });

  const roots: CoaNode[] = [];
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parentId && byId.has(r.parentId)) {
      byId.get(r.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sort = (nodes: CoaNode[]) => {
    nodes.sort(sortBy);
    for (const n of nodes) sort(n.children);
    return nodes;
  };
  return sort(roots);
}
