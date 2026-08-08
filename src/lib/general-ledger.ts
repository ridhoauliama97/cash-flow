// Buku Besar (General Ledger) — agregasi saldo per akun, PURE (tanpa DB/React).
// Unit-test di general-ledger.test.ts. Server actions (src/lib/actions/
// general-ledger.ts) mengambil journal_entries lalu memanggil fungsi di sini;
// halaman hanya menampilkan hasil, tidak pernah menghitung ulang.

export interface GlRow {
  accountId: string;
  code: string;
  name: string;
  type: string;
  parentId: string | null;
  debit: number;
  credit: number;
  /** debit - credit; negatif = akun bersaldo kredit (mis. pendapatan). */
  balance: number;
}

export interface GlTotals {
  debit: number;
  credit: number;
}

/** Satu baris journal_entries (sudah dinormalisasi ke number oleh action). */
export interface GlEntry {
  account_id: string;
  debit: number;
  credit: number;
}

/** Data akun dari chart_of_accounts (snake_case sesuai kolom DB). */
export interface GlAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  parent_id: string | null;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Kelompokkan journal entries per akun lalu gabungkan dengan data akun.
 * - Akun TANPA entri tidak muncul (hanya akun yang punya jurnal).
 * - Entri dengan account_id yang tidak ada di `accounts` dilewati (data
 *   korup / akun terfilter RLS) — tidak bisa ditampilkan tanpa nama.
 * - Hasil diurutkan berdasarkan kode akun (localeCompare, sama dengan
 *   buildCoaTree).
 */
export function computeGlRows(
  entries: ReadonlyArray<GlEntry>,
  accounts: ReadonlyArray<GlAccount>,
): GlRow[] {
  const totalsByAccount = new Map<string, { debit: number; credit: number }>();
  for (const e of entries) {
    const cur = totalsByAccount.get(e.account_id) ?? { debit: 0, credit: 0 };
    cur.debit += e.debit;
    cur.credit += e.credit;
    totalsByAccount.set(e.account_id, cur);
  }

  const accountById = new Map(accounts.map((a) => [a.id, a] as const));

  const rows: GlRow[] = [];
  for (const [accountId, totals] of totalsByAccount) {
    const account = accountById.get(accountId);
    if (!account) continue;
    rows.push({
      accountId,
      code: account.code,
      name: account.name,
      type: account.type,
      parentId: account.parent_id,
      debit: totals.debit,
      credit: totals.credit,
      balance: totals.debit - totals.credit,
    });
  }
  rows.sort((a, b) => a.code.localeCompare(b.code));
  return rows;
}

/**
 * Total debit & kredit semua baris. Dibulatkan ke 2 desimal (floating-safe,
 * sama seperti isBalanced di services/ledger.ts) supaya cek keseimbangan
 * `debit === credit` di UI tidak terganggu noise floating point.
 */
export function glTotals(rows: ReadonlyArray<GlRow>): GlTotals {
  const debit = round2(rows.reduce((sum, r) => sum + r.debit, 0));
  const credit = round2(rows.reduce((sum, r) => sum + r.credit, 0));
  return { debit, credit };
}
