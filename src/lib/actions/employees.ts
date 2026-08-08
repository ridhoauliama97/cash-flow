"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, PermissionError } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface EmployeeRow {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  divisionId: string | null;
  divisionName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  position: string | null;
  hireDate: string | null;
  isActive: boolean;
}

export interface EmployeeInput {
  name: string;
  email: string | null;
  userId: string | null;
  divisionId: string | null;
  departmentId: string | null;
  position: string | null;
  hireDate: string | null;
  isActive: boolean;
}

const PATH = "/settings/employees";

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}

function guardErr(e: unknown): string {
  if (e instanceof PermissionError) return e.message;
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("23505")) return "Data sudah ada";
  if (msg.includes("23503")) return "Referensi tidak valid";
  return msg;
}

function toRow(r: DbRow): EmployeeRow {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    email: r.email,
    divisionId: r.division_id,
    divisionName: r.divisions?.name ?? null,
    departmentId: r.department_id,
    departmentName: r.departments?.name ?? null,
    position: r.position,
    hireDate: r.hire_date,
    isActive: r.is_active,
  };
}

interface DbRow {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  division_id: string | null;
  divisions: { name: string } | null;
  department_id: string | null;
  departments: { name: string } | null;
  position: string | null;
  hire_date: string | null;
  is_active: boolean;
}

function validateEmployee(input: EmployeeInput): string | null {
  if (!input.name.trim()) return "Nama karyawan wajib diisi";
  if (input.name.trim().length > 200)
    return "Nama karyawan maksimal 200 karakter";
  return null;
}

export async function listEmployees(): Promise<ActionResult<EmployeeRow[]>> {
  try {
    await requirePermission("user", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("employees")
        .select(
          "id, user_id, name, email, division_id, divisions(name), department_id, departments(name), position, hire_date, is_active",
        )
        .order("name"),
    );
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      data: (data ?? []).map((r) => toRow(r as unknown as DbRow)),
    };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function createEmployee(
  input: EmployeeInput,
): Promise<ActionResult> {
  try {
    await requirePermission("user", "create");
    const invalid = validateEmployee(input);
    if (invalid) return { ok: false, error: invalid };

    const { error } = await db().then((s) =>
      s.from("employees").insert({
        name: input.name.trim(),
        email: input.email?.trim() || null,
        user_id: input.userId || null,
        division_id: input.divisionId || null,
        department_id: input.departmentId || null,
        position: input.position?.trim() || null,
        hire_date: input.hireDate || null,
        is_active: input.isActive,
      } as never),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function updateEmployee(
  id: string,
  input: EmployeeInput,
): Promise<ActionResult> {
  try {
    await requirePermission("user", "update");
    const invalid = validateEmployee(input);
    if (invalid) return { ok: false, error: invalid };

    const { error } = await db().then((s) =>
      s
        .from("employees")
        .update({
          name: input.name.trim(),
          email: input.email?.trim() || null,
          user_id: input.userId || null,
          division_id: input.divisionId || null,
          department_id: input.departmentId || null,
          position: input.position?.trim() || null,
          hire_date: input.hireDate || null,
          is_active: input.isActive,
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

export async function deleteEmployee(id: string): Promise<ActionResult> {
  try {
    await requirePermission("user", "delete");
    const { error } = await db().then((s) =>
      s.from("employees").delete().eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
