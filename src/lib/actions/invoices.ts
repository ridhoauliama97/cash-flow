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

export interface InvoiceRow {
  id: string;
  type: string;
  number: string;
  customerId: string | null;
  customerName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  description: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt: string | null;
  createdBy: string;
  createdAt: string;
}

const PATH = "/analytics/receivables";

const INVOICE_STATUSES = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
] as const;

interface DbRow {
  id: string;
  type: string;
  number: string;
  customer_id: string | null;
  customers: { name: string }[] | null;
  supplier_id: string | null;
  suppliers: { name: string }[] | null;
  description: string;
  amount: string | number;
  currency: string;
  status: string;
  due_date: string;
  paid_at: string | null;
  created_by: string;
  created_at: string;
}

const toNumber = (v: string | number): number =>
  typeof v === "number" ? v : Number(v);

function toRow(r: DbRow): InvoiceRow {
  return {
    id: r.id,
    type: r.type,
    number: r.number,
    customerId: r.customer_id,
    customerName: r.customers?.[0]?.name ?? null,
    supplierId: r.supplier_id,
    supplierName: r.suppliers?.[0]?.name ?? null,
    description: r.description,
    amount: toNumber(r.amount),
    currency: r.currency,
    status: r.status,
    dueDate: r.due_date,
    paidAt: r.paid_at,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}

function guardErr(e: unknown): string {
  if (e instanceof PermissionError) return e.message;
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("23505")) return "Nomor invoice sudah ada";
  return msg;
}

export async function listInvoices(): Promise<ActionResult<InvoiceRow[]>> {
  try {
    await requirePermission("analytics", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("invoices")
        .select(
          "id, type, number, customer_id, customers(name), supplier_id, suppliers(name), description, amount, currency, status, due_date, paid_at, created_by, created_at",
        )
        .order("created_at", { ascending: false }),
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []).map((r) => toRow(r as DbRow)) };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

async function generateNextNumber(): Promise<string> {
  const s = await db();
  const { data } = await s
    .from("invoices")
    .select("number")
    .order("created_at", { ascending: false })
    .limit(1);
  const last = (data?.[0] as { number: string } | undefined)?.number;
  if (!last) return "INV-001";
  const match = last.match(/^INV-(\d+)$/);
  if (!match) return "INV-001";
  const next = Number(match[1]) + 1;
  return `INV-${String(next).padStart(3, "0")}`;
}

export async function createInvoice(input: {
  type: string;
  customerId: string | null;
  supplierId: string | null;
  description: string;
  amount: number;
  currency: string;
  dueDate: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("analytics", "create");
    if (!["receivable", "payable"].includes(input.type)) {
      return { ok: false, error: "Type harus receivable atau payable" };
    }
    if (input.type === "receivable" && !input.customerId) {
      return { ok: false, error: "Customer wajib diisi untuk piutang" };
    }
    if (input.type === "payable" && !input.supplierId) {
      return { ok: false, error: "Supplier wajib diisi untuk hutang" };
    }
    if (!input.description.trim()) {
      return { ok: false, error: "Deskripsi wajib diisi" };
    }
    if (input.amount <= 0) {
      return { ok: false, error: "Jumlah harus lebih dari 0" };
    }
    const number = await generateNextNumber();
    const { data, error } = await db().then((s) =>
      s
        .from("invoices")
        .insert({
          type: input.type,
          number,
          customer_id: input.type === "receivable" ? input.customerId : null,
          supplier_id: input.type === "payable" ? input.supplierId : null,
          description: input.description.trim(),
          amount: input.amount,
          currency: input.currency,
          status: "draft",
          due_date: input.dueDate,
          created_by: user.id,
        } as never)
        .select("id")
        .single(),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function updateInvoice(
  id: string,
  input: {
    customerId: string | null;
    supplierId: string | null;
    description: string;
    amount: number;
    currency: string;
    dueDate: string;
  },
): Promise<ActionResult> {
  try {
    await requirePermission("analytics", "update");
    if (!input.description.trim()) {
      return { ok: false, error: "Deskripsi wajib diisi" };
    }
    if (input.amount <= 0) {
      return { ok: false, error: "Jumlah harus lebih dari 0" };
    }
    const { error } = await db().then((s) =>
      s
        .from("invoices")
        .update({
          customer_id: input.customerId,
          supplier_id: input.supplierId,
          description: input.description.trim(),
          amount: input.amount,
          currency: input.currency,
          due_date: input.dueDate,
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

export async function deleteInvoice(id: string): Promise<ActionResult> {
  try {
    await requirePermission("analytics", "delete");
    const { data, error: fetchErr } = await db().then((s) =>
      s.from("invoices").select("id, created_by").eq("id", id),
    );
    if (fetchErr) return { ok: false, error: fetchErr.message };
    const row = (data?.[0] ?? null) as {
      id: string;
      created_by: string;
    } | null;
    if (!row) return { ok: false, error: "Invoice tidak ditemukan" };
    await requireCanModifyData(row.created_by);
    const { error } = await db().then((s) =>
      s.from("invoices").delete().eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function setInvoiceStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    await requirePermission("analytics", "update");
    if (
      !INVOICE_STATUSES.includes(status as (typeof INVOICE_STATUSES)[number])
    ) {
      return { ok: false, error: "Status tidak valid" };
    }
    const update: Record<string, unknown> = { status };
    if (status === "paid") {
      update.paid_at = new Date().toISOString();
    } else {
      update.paid_at = null;
    }
    const { error } = await db().then((s) =>
      s
        .from("invoices")
        .update(update as never)
        .eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
