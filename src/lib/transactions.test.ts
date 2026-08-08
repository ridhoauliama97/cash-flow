// Unit test bagian PURE transaksi kas manual: konversi kurs + validasi draft.
// Tanpa DB/React — pola sama dengan src/lib/coa.test.ts (impor modul
// "@/lib/currency-rates" & "@/lib/services/transactions", tidak menyentuh UI).

import { describe, expect, it } from "vitest";
import {
  convert,
  FALLBACK_RATES_PER_USD,
  ratesForHome,
} from "@/lib/currency-rates";
import {
  validateTransactionDraft,
  type TransactionDraft,
} from "@/lib/services/transactions";

// Tabel per-1-IDR (sama seperti service: ratesForHome(ensureRates("USD"), "IDR")).
const idrRates = ratesForHome(FALLBACK_RATES_PER_USD, "IDR");

describe("convert (multi-currency)", () => {
  it("converts USD → IDR (1 USD = 15.800 IDR)", () => {
    expect(convert(100, "USD", "IDR", idrRates)).toBeCloseTo(1_580_000, 0);
  });

  it("converts EUR → IDR via per-home rates (1 EUR ≈ 17.110,68 IDR)", () => {
    // old-app math: amount / rates[from] * rates[to] = 100 / (0.9234/15800) * 1
    expect(convert(100, "EUR", "IDR", idrRates)).toBeCloseTo(1_711_067.8, 0);
  });

  it("converts JPY → IDR via per-home rates (1 JPY ≈ 100,48 IDR)", () => {
    expect(convert(1000, "JPY", "IDR", idrRates)).toBeCloseTo(100_483.3, 0);
  });

  it("round-trips USD → IDR → USD back to the original amount", () => {
    const back = convert(
      convert(100, "USD", "IDR", idrRates),
      "IDR",
      "USD",
      idrRates,
    );
    expect(back).toBeCloseTo(100, 6);
  });
});

describe("convert (short-circuit)", () => {
  it("returns the same amount for IDR → IDR", () => {
    expect(convert(7_500_000, "IDR", "IDR", idrRates)).toBe(7_500_000);
  });

  it("returns the same amount for any currency X → X", () => {
    expect(convert(123.45, "EUR", "EUR", idrRates)).toBe(123.45);
    expect(convert(99.99, "JPY", "JPY", idrRates)).toBe(99.99);
    expect(convert(42, "SGD", "SGD", idrRates)).toBe(42);
  });
});

describe("base_amount identity untuk IDR", () => {
  it("base_amount === amount saat currency === IDR (convert identity)", () => {
    const amount = 7_500_000;
    expect(convert(amount, "IDR", "IDR", idrRates)).toBe(amount);
  });
});

describe("validateTransactionDraft", () => {
  const openPeriods = [
    { startDate: "2026-08-01T00:00:00.000Z", endDate: "2026-08-31T23:59:59.999Z" },
  ];
  const costCenterIds = new Set(["cc-ops", "cc-marketing"]);

  const valid: TransactionDraft = {
    type: "income",
    date: "2026-08-15T00:00:00.000Z",
    description: "Penjualan tunai",
    amount: 1_000_000,
    currency: "IDR",
    costCenterId: null,
  };

  it("valid draft passes", () => {
    expect(validateTransactionDraft(valid, { openPeriods, costCenterIds })).toBeNull();
  });

  it("valid draft dengan cost center yang dikenal lolos", () => {
    expect(
      validateTransactionDraft(
        { ...valid, costCenterId: "cc-ops" },
        { openPeriods, costCenterIds },
      ),
    ).toBeNull();
  });

  it("rejects zero amount", () => {
    expect(
      validateTransactionDraft({ ...valid, amount: 0 }, { openPeriods, costCenterIds }),
    ).toMatch(/lebih besar dari 0/);
  });

  it("rejects negative amount", () => {
    expect(
      validateTransactionDraft({ ...valid, amount: -500 }, { openPeriods, costCenterIds }),
    ).toMatch(/lebih besar dari 0/);
  });

  it("rejects unknown currency", () => {
    expect(
      validateTransactionDraft({ ...valid, currency: "XXX" }, { openPeriods, costCenterIds }),
    ).toMatch(/Mata uang/);
  });

  it("rejects empty description", () => {
    expect(
      validateTransactionDraft(
        { ...valid, description: "   " },
        { openPeriods, costCenterIds },
      ),
    ).toMatch(/Deskripsi/);
  });

  it("rejects type di luar TRANSACTION_TYPES_FASE1", () => {
    expect(
      validateTransactionDraft({ ...valid, type: "transfer" }, { openPeriods, costCenterIds }),
    ).toMatch(/Tipe transaksi/);
  });

  it("rejects invalid date string", () => {
    expect(
      validateTransactionDraft({ ...valid, date: "not-a-date" }, { openPeriods, costCenterIds }),
    ).toMatch(/Tanggal/);
  });

  it("rejects date di luar semua open period", () => {
    expect(
      validateTransactionDraft(
        { ...valid, date: "2026-09-01T00:00:00.000Z" },
        { openPeriods, costCenterIds },
      ),
    ).toMatch(/periode akuntansi/);
  });

  it("rejects cost center yang tidak ada di set", () => {
    expect(
      validateTransactionDraft(
        { ...valid, costCenterId: "cc-unknown" },
        { openPeriods, costCenterIds },
      ),
    ).toMatch(/Cost center/);
  });

  it("lolos bila tanggal berada di salah satu dari banyak periode", () => {
    const periods = [
      { startDate: "2026-01-01T00:00:00.000Z", endDate: "2026-01-31T23:59:59.999Z" },
      { startDate: "2026-08-01T00:00:00.000Z", endDate: "2026-08-31T23:59:59.999Z" },
    ];
    expect(validateTransactionDraft(valid, { openPeriods: periods, costCenterIds })).toBeNull();
  });
});
