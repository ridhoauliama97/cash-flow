import {
  CURRENCIES,
  type CachedRates,
  type CurrencyCode,
  type Rates,
  type RateStatus,
} from "@/types";

const API_BASE = "https://api.currencyapi.com/v3/latest";

/**
 * Static fallback rates (approx. per 1 unit of home currency).
 * Used when the live API is unavailable or no key is configured,
 * so the dashboard remains fully functional offline.
 * Convention: rates[code] = units of `code` per 1 home-currency unit (USD base).
 */
export const FALLBACK_RATES_PER_USD: Rates = {
  USD: 1,
  EUR: 0.9234,
  GBP: 0.7782,
  JPY: 157.24,
  CAD: 1.3672,
  AUD: 1.5093,
  IDR: 15_800,
};

/** Approximate USD-per-1-IDR inverse used to seed demo data. */
export const IDR_PER_USD = 15_800;

/**
 * Derive per-1-home-unit rates from a USD-based rate table.
 * rate[code] for home = baseRate[code] / baseRate[home]
 */
export function ratesForHome(base: Rates, home: CurrencyCode): Rates {
  const homeUnit = base[home] ?? 1;
  return CURRENCIES.reduce((acc, code) => {
    acc[code] = (base[code] ?? 1) / homeUnit;
    return acc;
  }, {} as Rates);
}

/** Convert an amount in `from` currency into `to` currency given per-home rates. */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Rates,
): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  // amount * (1/fromRate) = home units; home units * toRate = to units
  return (amount / fromRate) * toRate;
}

/**
 * Fetch live rates from currencyapi.com v3 for the given home currency.
 * Returns normalized per-1-home-unit rates plus status info.
 * v3 response shape: { data: { USD: { code, value }, ... } } where
 * `value` = units of `code` per 1 `base_currency`.
 */
export async function fetchLiveRates(
  apiKey: string,
  home: CurrencyCode,
): Promise<{ rates: Rates; source: "live" | "fallback"; error?: string }> {
  const currencies = CURRENCIES.join(",");
  const url = `${API_BASE}?apikey=${encodeURIComponent(apiKey)}&base_currency=${home}&currencies=${currencies}`;

  // 10s timeout so a hung request never blocks app load.
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!res || !res.ok) {
    return {
      rates: ratesForHome(FALLBACK_RATES_PER_USD, home),
      source: "fallback",
      error: `Rate request failed (${res?.status ?? "network"})`,
    };
  }

  const json = (await res.json().catch(() => null)) as {
    data?: Partial<Record<CurrencyCode, { code?: string; value?: number }>>;
  } | null;
  const data = json?.data;
  if (!data || typeof data[home]?.value !== "number") {
    return {
      rates: ratesForHome(FALLBACK_RATES_PER_USD, home),
      source: "fallback",
      error: "Invalid rate response",
    };
  }

  const rates = CURRENCIES.reduce((acc, code) => {
    const value = data[code]?.value;
    acc[code] = typeof value === "number" && value > 0 ? value : 1;
    return acc;
  }, {} as Rates);
  rates[home] = 1;
  return { rates, source: "live" };
}

/** Build a fallback CachedRates snapshot for a home currency. */
export function fallbackRates(home: CurrencyCode): CachedRates {
  return {
    base: home,
    rates: ratesForHome(FALLBACK_RATES_PER_USD, home),
    fetchedAt: new Date().toISOString(),
    source: "fallback",
  };
}

export function isRatesStale(
  cached: CachedRates | null,
  maxAgeHours = 24,
): boolean {
  if (!cached) return true;
  const age = Date.now() - new Date(cached.fetchedAt).getTime();
  return age > maxAgeHours * 3_600_000;
}

export interface RateResult {
  rates: Rates;
  status: RateStatus;
}

/**
 * Ensure current rates for `home`: use cache when fresh, otherwise
 * fetch live (if key present) and fall back to static rates.
 */
export async function ensureRates(
  cached: CachedRates | null,
  home: CurrencyCode,
  apiKey: string | undefined,
  force = false,
): Promise<RateResult> {
  if (!force && cached && cached.base === home && !isRatesStale(cached)) {
    return { rates: cached.rates, status: { ok: true } };
  }
  if (apiKey) {
    const live = await fetchLiveRates(apiKey, home);
    if (live.source === "live") {
      return { rates: live.rates, status: { ok: true } };
    }
    return { rates: live.rates, status: { ok: false, error: live.error } };
  }
  return {
    rates: ratesForHome(FALLBACK_RATES_PER_USD, home),
    status: {
      ok: false,
      error: "No API key configured — using static fallback rates",
    },
  };
}
