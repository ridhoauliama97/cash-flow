import { describe, expect, it } from "vitest";
import type { DashboardFilters } from "@/types";
import { createSavedView, filtersEqual, loadSavedViews, persistSavedViews, upsertSavedView } from "@/lib/saved-views";

const base: DashboardFilters = {
  type: "all",
  category: null,
  product: null,
  client: null,
  region: null,
  department: null,
  project: null,
  basis: "all",
  dateFrom: null,
  dateTo: null,
  search: "",
};

function stubStorage(): void {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe("saved-views", () => {
  it("createSavedView stores a copy of filters with trimmed name and id", () => {
    const v = createSavedView("  Top clients  ", { ...base, client: "Acme", basis: "accrual" });
    expect(v.name).toBe("Top clients");
    expect(v.id).toBeTruthy();
    expect(v.filters).toEqual({ ...base, client: "Acme", basis: "accrual" });
  });

  it("filtersEqual compares structurally", () => {
    expect(filtersEqual(base, { ...base })).toBe(true);
    expect(filtersEqual(base, { ...base, search: "x" })).toBe(false);
    expect(filtersEqual({ ...base, category: null }, { ...base, category: null })).toBe(true);
  });

  it("persist + load round-trips through localStorage", () => {
    stubStorage();
    persistSavedViews([createSavedView("A", base)]);
    const loaded = loadSavedViews();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("A");
  });

  it("loadSavedViews tolerates corrupt JSON and non-array payloads", () => {
    stubStorage();
    localStorage.setItem("cash-flow:saved-views", "{not json");
    expect(loadSavedViews()).toEqual([]);
    localStorage.setItem("cash-flow:saved-views", JSON.stringify({ nope: true }));
    expect(loadSavedViews()).toEqual([]);
  });

  it("loadSavedViews drops malformed entries", () => {
    stubStorage();
    localStorage.setItem(
      "cash-flow:saved-views",
      JSON.stringify([{ id: "x", name: "ok", filters: base }, { id: "y", name: 42 }, null]),
    );
    const loaded = loadSavedViews();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("ok");
  });

  it("upsert replaces same-name view (case-insensitive), newest wins", () => {
    const a = createSavedView("West", base);
    const b = createSavedView("west", { ...base, region: "West" });
    const next = upsertSavedView([a], b);
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe(b.id);
    expect(next[0].filters.region).toBe("West");
  });
});
