// Helper format numerik & tanggal untuk UI — PURE (tanpa React/DB),
// dipakai bersama oleh dialog & tabel transaksi.

const idrFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

/** Format angka gaya Indonesia: 1.580.000,5 (tanpa simbol mata uang). */
export function formatAmount(n: number): string {
  return idrFormatter.format(n);
}

/** Format angka dengan prefiks "Rp ". */
export function formatIDR(n: number): string {
  return `Rp ${formatAmount(n)}`;
}

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Format tanggal ISO (dari kolom TIMESTAMP) jadi tanggal Indonesia.
 * Ambil bagian tanggal (YYYY-MM-DD) dari string mentah lalu format sebagai
 * UTC agar tidak bergeser oleh timezone server/client.
 */
export function formatDate(iso: string): string {
  const datePart = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return iso;
  const [y, m, d] = datePart.split("-").map(Number);
  return dateFormatter.format(new Date(Date.UTC(y, m - 1, d)));
}

/** Tanggal lokal hari ini sebagai "YYYY-MM-DD" (default input type=date). */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
