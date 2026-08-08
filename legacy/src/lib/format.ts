import { CURRENCY_SYMBOLS, type CurrencyCode } from "@/types";

/** Compact money format for a currency. */
export function formatMoney(
  amount: number,
  currency: CurrencyCode,
  compact = false,
): string {
  if (!Number.isFinite(amount)) return "—";
  const abs = Math.abs(amount);
  const symbol = CURRENCY_SYMBOLS[currency];

  if (compact && abs >= 1_000_000)
    return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  if (compact && abs >= 1_000)
    return `${symbol}${(amount / 1_000).toFixed(1)}K`;

  const digits = currency === "IDR" || currency === "JPY" ? 0 : 2;
  if (currency === "IDR") {
    return `${symbol}${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  if (currency === "JPY") {
    return `${symbol}${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/** Signed money for deltas (e.g. "+Rp 1.2M" / "−Rp 300K"). */
export function formatSigned(
  amount: number,
  currency: CurrencyCode,
  compact = false,
): string {
  if (amount > 0) return `+${formatMoney(amount, currency, compact)}`;
  if (amount < 0) return `−${formatMoney(Math.abs(amount), currency, compact)}`;
  return formatMoney(0, currency, compact);
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

/** Unsigned percentage (for values that are not deltas). */
export function formatPercentPlain(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDurationDays(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${(days / 365).toFixed(1)} years`;
}
