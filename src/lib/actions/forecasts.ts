"use server";

import { revalidatePath } from "next/cache";
import {
  requirePermission,
  requireCanModifyData,
  PermissionError,
} from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface ForecastRow {
  id: string;
  year: number;
  month: number;
  category: string;
  description: string | null;
  amount: number;
  currency: string;
}

export interface ForecastInput {
  year: number;
  month: number;
  category: string;
  description?: string | null;
  amount: number;
  currency?: string;
}

const PATH = "/analytics/forecast";

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}

function guardErr(e: unknown): string {
  if (e instanceof PermissionError) return e.message;
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("23505"))
    return "Forecast untuk bulan/kategori ini sudah ada";
  return msg;
}

export async function listForecasts(): Promise<ActionResult<ForecastRow[]>> {
  try {
    await requirePermission("dashboard", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("forecasts")
        .select("id, year, month, category, description, amount, currency")
        .order("year")
        .order("month"),
    );
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      data: (data ?? []).map((r) => ({
        id: r.id,
        year: r.year,
        month: r.month,
        category: r.category,
        description: r.description,
        amount: Number(r.amount),
        currency: r.currency,
      })),
    };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function createForecast(
  input: ForecastInput,
): Promise<ActionResult> {
  try {
    await requirePermission("dashboard", "create");
    if (input.month < 1 || input.month > 12) {
      return { ok: false, error: "Bulan harus 1–12" };
    }
    if (!["revenue", "expense", "profit"].includes(input.category)) {
      return {
        ok: false,
        error: "Kategori harus revenue, expense, atau profit",
      };
    }

    const { error } = await db().then((s) =>
      s.from("forecasts").upsert(
        {
          year: input.year,
          month: input.month,
          category: input.category,
          description: input.description?.trim() || null,
          amount: input.amount,
          currency: input.currency ?? "IDR",
        } as never,
        { onConflict: "year,month,category" },
      ),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function updateForecast(
  id: string,
  input: ForecastInput,
): Promise<ActionResult> {
  try {
    await requirePermission("dashboard", "update");
    if (input.month < 1 || input.month > 12) {
      return { ok: false, error: "Bulan harus 1–12" };
    }
    if (!["revenue", "expense", "profit"].includes(input.category)) {
      return {
        ok: false,
        error: "Kategori harus revenue, expense, atau profit",
      };
    }

    const { error } = await db().then((s) =>
      s
        .from("forecasts")
        .update({
          year: input.year,
          month: input.month,
          category: input.category,
          description: input.description?.trim() || null,
          amount: input.amount,
          currency: input.currency ?? "IDR",
        } as never)
        .eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function deleteForecast(id: string): Promise<ActionResult> {
  try {
    await requirePermission("dashboard", "delete");
    const { data, error: fetchErr } = await db().then((s) =>
      s.from("forecasts").select("id, created_by").eq("id", id),
    );
    if (fetchErr) return { ok: false, error: fetchErr.message };
    const row = (data?.[0] ?? null) as {
      id: string;
      created_by: string;
    } | null;
    if (!row) return { ok: false, error: "Forecast tidak ditemukan" };
    await requireCanModifyData(row.created_by);
    const { error } = await db().then((s) =>
      s.from("forecasts").delete().eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
