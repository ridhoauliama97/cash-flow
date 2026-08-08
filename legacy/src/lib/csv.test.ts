import { describe, expect, it } from "vitest";
import {
  dedupeTransactions,
  detectColumnMapping,
  parseCsvWithMapping,
  parseTransactionsCsv,
} from "@/lib/csv";
import type { TransactionDraft } from "@/types";

describe("detectColumnMapping", () => {
  it("maps common header aliases", () => {
    const m = detectColumnMapping([
      "Transaction Date",
      "Description",
      "Amount",
      "Currency",
      "Category",
      "Customer",
      "Payment method",
    ]);
    expect(m.date).toBe("transactiondate");
    expect(m.description).toBe("description");
    expect(m.amount).toBe("amount");
    expect(m.currency).toBe("currency");
    expect(m.category).toBe("category");
    expect(m.client).toBe("customer");
    expect(m.paymentMethod).toBe("paymentmethod");
  });

  it("leaves unknown headers unmapped", () => {
    const m = detectColumnMapping(["Foo", "Bar", "Baz"]);
    expect(m.amount).toBeNull();
    expect(m.date).toBeNull();
  });
});

describe("parseCsvWithMapping", () => {
  const csv = [
    "Datum;Betrag;Text",
    "01.08.2026;1200,50;Consulting retainer",
    "03.08.2026;45,00;Bank fee",
  ].join("\n");

  it("honors an explicit column mapping (EU format, semicolon)", () => {
    const m = detectColumnMapping(["Datum", "Betrag", "Text"]);
    // German headers don't match aliases — force the mapping manually.
    m.date = "datum";
    m.amount = "betrag";
    m.description = "text";
    const result = parseCsvWithMapping(csv, m);
    expect(result.errors).toEqual([]);
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toMatchObject({ date: "2026-08-01", amount: 1200.5, description: "Consulting retainer" });
    expect(result.transactions[1].amount).toBe(45);
  });

  it("skips rows with missing, invalid or non-positive amounts", () => {
    const m = detectColumnMapping(["Date", "Amount", "Description"]);
    const result = parseCsvWithMapping("Date,Amount,Description\n2026-08-01,,\n2026-08-02,abc,x\n2026-08-03,-100,y\n2026-08-04,100,z", m);
    expect(result.transactions).toHaveLength(1);
    expect(result.skipped).toBe(3);
    expect(result.errors).toHaveLength(3);
  });

  it("infers type from description when no type column is mapped", () => {
    const m = detectColumnMapping(["Date", "Amount", "Description"]);
    const result = parseCsvWithMapping("Date,Amount,Description\n2026-08-01,500,AWS hosting", m);
    expect(result.transactions[0].type).toBe("expense");
    expect(result.transactions[0].category).toBe("Software & Subscriptions");
  });
});

describe("parseTransactionsCsv", () => {
  it("auto-detects headers like the template", () => {
    const csv = [
      "date,type,description,amount,currency,category",
      "2026-08-01,revenue,\"Monthly retainer\",2500,USD,\"Client Services\"",
      "2026-08-03,expense,Figma subscription,15,USD,\"Software & Subscriptions\"",
    ].join("\n");
    const result = parseTransactionsCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toMatchObject({ date: "2026-08-01", type: "revenue", amount: 2500, currency: "USD" });
  });
});

describe("dedupeTransactions", () => {
  const tx: TransactionDraft = {
    date: "2026-08-01",
    type: "expense",
    description: "Figma subscription",
    amount: 15,
    currency: "USD",
    category: "Software & Subscriptions",
  };

  it("filters rows already present in the dataset", () => {
    const existing = [{ date: "2026-08-01", description: "figma subscription", amount: 15, currency: "USD" as const }];
    const { kept, duplicates } = dedupeTransactions([tx, { ...tx, date: "2026-08-02" }], existing);
    expect(duplicates).toHaveLength(1);
    expect(kept).toHaveLength(1);
    expect(kept[0].date).toBe("2026-08-02");
  });

  it("deduplicates repeated rows within the batch itself", () => {
    const { kept, duplicates } = dedupeTransactions([tx, tx], []);
    expect(kept).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
  });

  it("keeps rows with any differing signature field", () => {
    const existing = [{ date: "2026-08-01", description: "figma subscription", amount: 15, currency: "USD" as const }];
    const variants = [
      { ...tx, amount: 20 },
      { ...tx, currency: "EUR" as const },
      { ...tx, description: "Figma PRO subscription" },
    ];
    const { kept, duplicates } = dedupeTransactions(variants, existing);
    expect(kept).toHaveLength(3);
    expect(duplicates).toHaveLength(0);
  });
});
