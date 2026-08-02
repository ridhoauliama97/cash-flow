import { useCallback, useState } from "react";
import type { DashboardFilters } from "@/types";
import {
  createSavedView,
  filtersEqual,
  loadSavedViews,
  persistSavedViews,
  upsertSavedView,
  type SavedView,
} from "@/lib/saved-views";

/**
 * Persisted filter presets ("saved views") stored in localStorage,
 * shared across every page that renders a FilterBar.
 */
export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>(() => loadSavedViews());

  const saveCurrent = useCallback((name: string, filters: DashboardFilters) => {
    if (!name.trim()) return;
    setViews((prev) => {
      const next = upsertSavedView(prev, createSavedView(name, filters));
      persistSavedViews(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setViews((prev) => {
      const next = prev.filter((v) => v.id !== id);
      persistSavedViews(next);
      return next;
    });
  }, []);

  const activeViewId = useCallback(
    (filters: DashboardFilters) => views.find((v) => filtersEqual(v.filters, filters))?.id ?? null,
    [views],
  );

  return { views, saveCurrent, remove, activeViewId };
}
