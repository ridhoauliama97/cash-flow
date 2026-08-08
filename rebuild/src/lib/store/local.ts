/**
 * Mode demo: persistence generik di localStorage (versi prefix).
 * Entity CRUD spesifik menyusul di task master data (11–14) &
 * transaksi (15–16) — pola lama: src/lib/store/local.ts (app Vite).
 */
const DB_KEY = "cashflow-rebuild:v1";

export function readLocal<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(`${DB_KEY}:${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeLocal<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${DB_KEY}:${key}`, JSON.stringify(value));
}

export function removeLocal(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${DB_KEY}:${key}`);
}

export function clearLocal(): void {
  if (typeof window === "undefined") return;
  Object.keys(window.localStorage)
    .filter((k) => k.startsWith(DB_KEY))
    .forEach((k) => window.localStorage.removeItem(k));
}
