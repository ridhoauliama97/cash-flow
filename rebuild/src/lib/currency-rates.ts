// Kurs valuta asing — adaptasi server-side dari src/lib/currency.ts (app Vite lama).
// Perbedaan: tanpa localStorage (cache in-memory module-level, TTL ~1 jam),
// tanpa CachedRates/RateStatus (cukup Rates), fetch live memakai env server.
// Konvensi: rates[code] = unit `code` per 1 unit base (sama seperti app lama).

import { CURRENCIES, type Currency } from "@/types/ledger";

const API_BASE = "https://api.currencyapi.com/v3/latest";

export type Rates = Record<Currency, number>;

/**
 * Static fallback rates (approx. per 1 USD).
 * Dipakai bila API live tidak tersedia atau CURRENCYAPI_KEY tidak dikonfigurasi,
 * sehingga transaksi multi-currency tetap bisa dibuat offline.
 * Nilai EUR/GBP/JPY/AUD/IDR sama dengan app lama; SGD aproksimasi.
 */
export const FALLBACK_RATES_PER_USD: Rates = {
  IDR: 15_800,
  USD: 1,
  EUR: 0.9234,
  GBP: 0.7782,
  JPY: 157.24,
  AUD: 1.5093,
  SGD: 1.3342, // approx
};

/**
 * Turunkan tabel per-1-unit-home dari tabel berbasis USD:
 * rate[code] untuk home = base[code] / base[home].
 */
export function ratesForHome(base: Rates, home: Currency): Rates {
  const homeUnit = base[home] ?? 1;
  return CURRENCIES.reduce((acc, code) => {
    acc[code] = (base[code] ?? 1) / homeUnit;
    return acc;
  }, {} as Rates);
}

/** Convert amount dari `from` ke `to` memakai tabel per-home rates. */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Rates,
): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  // amount * (1/fromRate) = unit home; unit home * toRate = unit to
  return (amount / fromRate) * toRate;
}

/**
 * Fetch live rates dari currencyapi.com v3 untuk `base`.
 * Kembalikan null bila key tidak ada / request gagal / respons tidak valid —
 * TIDAK pernah melempar error jaringan: caller memakai fallback.
 * v3 response shape: { data: { USD: { code, value }, ... } } dengan
 * `value` = unit `code` per 1 `base_currency`.
 */
export async function fetchLiveRates(
  base: Currency = "USD",
): Promise<Rates | null> {
  const apiKey = process.env.CURRENCYAPI_KEY;
  if (!apiKey) return null;

  const url = `${API_BASE}?apikey=${encodeURIComponent(apiKey)}&base_currency=${base}&currencies=${CURRENCIES.join(",")}`;

  // 10s timeout agar request macet tidak pernah memblokir; no-store agar
  // Next.js tidak meng-cache hasil kurs antar permintaan.
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  }).catch(() => null);
  if (!res || !res.ok) return null;

  const json = (await res.json().catch(() => null)) as {
    data?: Partial<Record<Currency, { code?: string; value?: number }>>;
  } | null;
  const data = json?.data;
  if (!data || typeof data[base]?.value !== "number") return null;

  const rates = CURRENCIES.reduce((acc, code) => {
    const value = data[code]?.value;
    acc[code] = typeof value === "number" && value > 0 ? value : 1;
    return acc;
  }, {} as Rates);
  rates[base] = 1;
  return rates;
}

const CACHE_TTL_MS = 3_600_000; // 1 jam

let cache: { base: Currency; rates: Rates; fetchedAt: number } | null = null;

/**
 * Kurs untuk `base`: coba live (bila CURRENCYAPI_KEY ada), fallback ke
 * FALLBACK_RATES_PER_USD. Hasil di-cache in-memory selama ~1 jam.
 */
export async function ensureRates(base: Currency = "USD"): Promise<Rates> {
  if (cache && cache.base === base && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rates;
  }
  const live = await fetchLiveRates(base);
  if (live) {
    cache = { base, rates: live, fetchedAt: Date.now() };
    return live;
  }
  const rates =
    base === "USD"
      ? FALLBACK_RATES_PER_USD
      : ratesForHome(FALLBACK_RATES_PER_USD, base);
  cache = { base, rates, fetchedAt: Date.now() };
  return rates;
}
