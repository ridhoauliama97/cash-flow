"use server";

import { revalidatePath } from "next/cache";
import {
  PermissionError,
  requireCanModifyData,
  requirePermission,
} from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const PATH = "/analytics/import";

export interface ImportBatchRow {
  id: string;
  filename: string;
  status: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  errorLog: string | null;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
}

interface DbRow {
  id: string;
  filename: string;
  status: string;
  total_rows: number;
  success_rows: number;
  error_rows: number;
  error_log: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

function toRow(r: DbRow): ImportBatchRow {
  return {
    id: r.id,
    filename: r.filename,
    status: r.status,
    totalRows: r.total_rows,
    successRows: r.success_rows,
    errorRows: r.error_rows,
    errorLog: r.error_log,
    createdBy: r.created_by,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  };
}

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}

function guardErr(e: unknown): string {
  if (e instanceof PermissionError) return e.message;
  return e instanceof Error ? e.message : String(e);
}

export interface ImportError {
  row: number;
  message: string;
}

export interface ProcessResult {
  batchId: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
}

export async function listImportBatches(): Promise<
  ActionResult<ImportBatchRow[]>
> {
  try {
    await requirePermission("import", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("import_batches")
        .select(
          "id, filename, status, total_rows, success_rows, error_rows, error_log, created_by, created_at, completed_at",
        )
        .order("created_at", { ascending: false }),
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []).map((r) => toRow(r as DbRow)) };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function validateRow(
  values: string[],
  rowNum: number,
):
  | {
      type: string;
      date: Date;
      description: string;
      amount: number;
      currency: string;
    }
  | string {
  const [dateStr, type, description, amountStr, currency] = values;

  if (!dateStr) return `Baris ${rowNum}: tanggal kosong`;
  const date = new Date(dateStr);
  if (isNaN(date.getTime()))
    return `Baris ${rowNum}: format tanggal tidak valid "${dateStr}"`;

  const normalizedType = type?.toLowerCase();
  if (normalizedType !== "income" && normalizedType !== "expense") {
    return `Baris ${rowNum}: type harus income/expense, dapat "${type}"`;
  }

  const amount = Number(amountStr?.replace(/[.,]/g, ""));
  if (isNaN(amount) || amount < 0) {
    return `Baris ${rowNum}: jumlah tidak valid "${amountStr}"`;
  }

  return {
    type: normalizedType,
    date,
    description: description || "Imported transaction",
    amount,
    currency: currency || "IDR",
  };
}

export async function processImport(
  filename: string,
  content: string,
): Promise<ActionResult<ProcessResult>> {
  try {
    const user = await requirePermission("import", "create");

    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return { ok: false, error: "CSV kosong atau hanya berisi header" };
    }

    const headers = parseCsvLine(lines[0]!).map((h) => h.toLowerCase());
    const dateIdx = headers.indexOf("date");
    const typeIdx = headers.indexOf("type");
    const descIdx = headers.indexOf("description");
    const amountIdx = headers.indexOf("amount");
    const currencyIdx = headers.indexOf("currency");

    if (dateIdx === -1 || typeIdx === -1 || amountIdx === -1) {
      return {
        ok: false,
        error: "Header CSV harus mengandung minimal: date, type, amount",
      };
    }

    const { data: batchData, error: batchError } = await db().then((s) =>
      s
        .from("import_batches")
        .insert({
          filename,
          status: "processing",
          created_by: user.id,
        } as never)
        .select("id")
        .single(),
    );
    if (batchError) return { ok: false, error: guardErr(batchError) };

    const batchId = batchData!.id as string;
    const errors: ImportError[] = [];
    let successCount = 0;

    const dataLines = lines.slice(1);

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2;
      const values = parseCsvLine(dataLines[i]!);

      const getValue = (idx: number) =>
        idx >= 0 && idx < values.length ? values[idx]! : "";
      const rowValues = [
        getValue(dateIdx),
        getValue(typeIdx),
        getValue(descIdx),
        getValue(amountIdx),
        getValue(currencyIdx),
      ];

      const result = validateRow(rowValues, rowNum);
      if (typeof result === "string") {
        errors.push({ row: rowNum, message: result });
        continue;
      }

      const { type, date, description, amount, currency } = result;

      const { error: txError } = await db().then((s) =>
        s.from("transactions").insert({
          type,
          date: date.toISOString(),
          description,
          amount,
          currency,
          base_amount: amount,
          rate_snapshot: 1,
          created_by: user.id,
          status: "draft",
          source: "import",
        } as never),
      );

      if (txError) {
        errors.push({ row: rowNum, message: txError.message });
      } else {
        successCount++;
      }
    }

    const totalRows = dataLines.length;
    const errorCount = errors.length;
    const finalStatus = errorCount === totalRows ? "failed" : "completed";

    const { error: updateError } = await db().then((s) =>
      s
        .from("import_batches")
        .update({
          status: finalStatus,
          total_rows: totalRows,
          success_rows: successCount,
          error_rows: errorCount,
          error_log: errors.length > 0 ? JSON.stringify(errors) : null,
          completed_at: new Date().toISOString(),
        } as never)
        .eq("id", batchId),
    );
    if (updateError) return { ok: false, error: guardErr(updateError) };

    revalidatePath(PATH);
    return {
      ok: true,
      data: {
        batchId,
        totalRows,
        successRows: successCount,
        errorRows: errorCount,
      },
    };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function deleteImportBatch(id: string): Promise<ActionResult> {
  try {
    await requirePermission("import", "delete");
    const { data, error } = await db().then((s) =>
      s.from("import_batches").select("id, created_by").eq("id", id),
    );
    if (error) return { ok: false, error: error.message };
    const row = (data?.[0] ?? null) as {
      id: string;
      created_by: string;
    } | null;
    if (!row) return { ok: false, error: "Batch import tidak ditemukan" };
    await requireCanModifyData(row.created_by);
    const { error: delError } = await db().then((s) =>
      s.from("import_batches").delete().eq("id", id),
    );
    if (delError) return { ok: false, error: guardErr(delError) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
