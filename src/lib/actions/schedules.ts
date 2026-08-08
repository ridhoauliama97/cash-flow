"use server";

import { revalidatePath } from "next/cache";
import {
  requirePermission,
  requireCanModifyData,
} from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { guardErr } from "@/lib/utils/guard-err";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type ScheduleRow = {
  id: string;
  name: string;
  reportType: string;
  frequency: string;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  timeOfDay: string;
  recipients: string[];
  format: string;
  enabled: boolean;
  lastSentAt: string | null;
  createdBy: string;
  createdAt: string;
};

interface DbRow {
  id: string;
  name: string;
  report_type: string;
  frequency: string;
  day_of_month: number | null;
  day_of_week: number | null;
  time_of_day: string;
  recipients: string[];
  format: string;
  enabled: boolean;
  last_sent_at: string | null;
  created_by: string;
  created_at: string;
}

function toRow(r: DbRow): ScheduleRow {
  return {
    id: r.id,
    name: r.name,
    reportType: r.report_type,
    frequency: r.frequency,
    dayOfMonth: r.day_of_month,
    dayOfWeek: r.day_of_week,
    timeOfDay: r.time_of_day,
    recipients: r.recipients ?? [],
    format: r.format,
    enabled: r.enabled,
    lastSentAt: r.last_sent_at,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

const PATH = "/analytics/schedules";

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}


export async function listSchedules(): Promise<ActionResult<ScheduleRow[]>> {
  try {
    await requirePermission("schedule", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("schedules")
        .select(
          "id, name, report_type, frequency, day_of_month, day_of_week, time_of_day, recipients, format, enabled, last_sent_at, created_by, created_at",
        )
        .order("name"),
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []).map(toRow) };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export type ScheduleInput = {
  name: string;
  reportType: string;
  frequency: string;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  timeOfDay: string;
  recipients: string[];
  format: string;
  enabled: boolean;
};

function validateSchedule(input: ScheduleInput): string | null {
  if (!input.name.trim()) return "Nama jadwal wajib diisi";
  if (!input.reportType) return "Tipe laporan wajib dipilih";
  if (!input.frequency) return "Frekuensi wajib dipilih";
  if (!input.timeOfDay) return "Jam kirim wajib diisi";
  if (
    input.frequency === "monthly" &&
    (input.dayOfMonth === null || input.dayOfMonth < 1 || input.dayOfMonth > 31)
  )
    return "Tanggal bulanan harus 1-31";
  if (input.frequency === "weekly" && input.dayOfWeek === null)
    return "Hari mingguan wajib dipilih";
  if (!["pdf", "csv", "xlsx"].includes(input.format))
    return "Format tidak valid";
  return null;
}

export async function createSchedule(
  input: ScheduleInput,
  userId: string,
): Promise<ActionResult> {
  try {
    await requirePermission("schedule", "create");
    const err = validateSchedule(input);
    if (err) return { ok: false, error: err };

    const { error } = await db().then((s) =>
      s.from("schedules").insert({
        id: crypto.randomUUID(),
        name: input.name.trim(),
        report_type: input.reportType,
        frequency: input.frequency,
        day_of_month: input.dayOfMonth,
        day_of_week: input.dayOfWeek,
        time_of_day: input.timeOfDay,
        recipients: input.recipients,
        format: input.format,
        enabled: input.enabled,
        created_by: userId,
      } as never),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function updateSchedule(
  id: string,
  input: ScheduleInput,
): Promise<ActionResult> {
  try {
    await requirePermission("schedule", "update");
    const err = validateSchedule(input);
    if (err) return { ok: false, error: err };

    const { error } = await db().then((s) =>
      s
        .from("schedules")
        .update({
          name: input.name.trim(),
          report_type: input.reportType,
          frequency: input.frequency,
          day_of_month: input.dayOfMonth,
          day_of_week: input.dayOfWeek,
          time_of_day: input.timeOfDay,
          recipients: input.recipients,
          format: input.format,
          enabled: input.enabled,
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

export async function deleteSchedule(
  id: string,
  createdBy: string,
): Promise<ActionResult> {
  try {
    await requirePermission("schedule", "delete");
    await requireCanModifyData(createdBy);
    const { error } = await db().then((s) =>
      s.from("schedules").delete().eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function toggleSchedule(
  id: string,
  enabled: boolean,
): Promise<ActionResult> {
  try {
    await requirePermission("schedule", "update");
    const { error } = await db().then((s) =>
      s
        .from("schedules")
        .update({ enabled } as never)
        .eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
