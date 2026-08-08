"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { guardErr } from "@/lib/utils/guard-err";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface DepartmentRow {
  id: string;
  name: string;
  divisionId: string | null;
  divisionName: string | null;
  employeeCount: number;
}

export interface DepartmentInput {
  name: string;
  divisionId: string | null;
}

const PATH = "/settings/departments";

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}


export async function listDepartments(): Promise<
  ActionResult<DepartmentRow[]>
> {
  try {
    await requirePermission("user", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("departments")
        .select("id, name, division_id, divisions(name), employees(id)")
        .order("name"),
    );
    if (error) return { ok: false, error: error.message };
    const rows = (data ?? []) as unknown as Array<{
      id: string;
      name: string;
      division_id: string | null;
      divisions: { name: string } | null;
      employees: Array<{ id: string }> | null;
    }>;
    return {
      ok: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        divisionId: r.division_id,
        divisionName: r.divisions?.name ?? null,
        employeeCount: (r.employees ?? []).length,
      })),
    };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

function validateDepartment(input: DepartmentInput): string | null {
  const name = input.name.trim();
  if (!name) return "Nama departemen wajib diisi";
  if (name.length > 100) return "Nama departemen maksimal 100 karakter";
  return null;
}

export async function createDepartment(
  input: DepartmentInput,
): Promise<ActionResult> {
  try {
    await requirePermission("user", "create");
    const invalid = validateDepartment(input);
    if (invalid) return { ok: false, error: invalid };

    const { error } = await db().then((s) =>
      s.from("departments").insert({
        name: input.name.trim(),
        division_id: input.divisionId,
      } as never),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function updateDepartment(
  id: string,
  input: DepartmentInput,
): Promise<ActionResult> {
  try {
    await requirePermission("user", "update");
    const invalid = validateDepartment(input);
    if (invalid) return { ok: false, error: invalid };

    const { error } = await db().then((s) =>
      s
        .from("departments")
        .update({
          name: input.name.trim(),
          division_id: input.divisionId,
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

export async function deleteDepartment(id: string): Promise<ActionResult> {
  try {
    await requirePermission("user", "delete");

    const { data: members } = await db().then((s) =>
      s.from("employees").select("id").eq("department_id", id),
    );
    if (members && members.length > 0) {
      return {
        ok: false,
        error:
          "Departemen masih dipakai oleh karyawan — lepas dulu karyawan dari departemen",
      };
    }

    const { error } = await db().then((s) =>
      s.from("departments").delete().eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
