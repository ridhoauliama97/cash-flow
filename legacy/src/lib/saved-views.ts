import type { DashboardFilters } from "@/types";

export interface SavedView {
  id: string;
  name: string;
  filters: DashboardFilters;
  createdAt: string;
}

const STORAGE_KEY = "cash-flow:saved-views";

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSavedView(name: string, filters: DashboardFilters): SavedView {
  return {
    id: genId(),
    name: name.trim(),
    filters: { ...filters },
    createdAt: new Date().toISOString(),
  };
}

/** Structural equality for flat filter objects (JSON order is stable by construction). */
export function filtersEqual(a: DashboardFilters, b: DashboardFilters): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function loadSavedViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is SavedView =>
        !!v &&
        typeof (v as SavedView).id === "string" &&
        typeof (v as SavedView).name === "string" &&
        typeof (v as SavedView).filters === "object" &&
        (v as SavedView).filters !== null,
    );
  } catch {
    return [];
  }
}

export function persistSavedViews(views: SavedView[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch {
    // Storage unavailable (private mode / quota) — views stay in memory only.
  }
}

/** Add or replace a view with the same name (case-insensitive), newest wins. */
export function upsertSavedView(views: SavedView[], view: SavedView): SavedView[] {
  const rest = views.filter((v) => v.name.toLowerCase() !== view.name.toLowerCase());
  return [...rest, view];
}
