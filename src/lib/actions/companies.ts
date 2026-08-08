"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { guardErr } from "@/lib/utils/guard-err";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface CompanyRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxNumber: string | null;
  logo: string | null;
  defaultCompany: boolean;
  isActive: boolean;
}

export interface CompanyInput {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxNumber: string | null;
  logo: string | null;
}

const PATH = "/settings/companies";

async function db() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}


function mapRow(r: {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_number: string | null;
  logo: string | null;
  default_company: boolean;
  is_active: boolean;
}): CompanyRow {
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    phone: r.phone,
    email: r.email,
    website: r.website,
    taxNumber: r.tax_number,
    logo: r.logo,
    defaultCompany: r.default_company,
    isActive: r.is_active,
  };
}

export async function listCompanies(): Promise<ActionResult<CompanyRow[]>> {
  try {
    await requirePermission("user", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("companies")
        .select(
          "id, name, address, phone, email, website, tax_number, logo, default_company, is_active",
        )
        .order("name"),
    );
    if (error) return { ok: false, error: error.message };
    const rows = (data ?? []) as unknown as Array<{
      id: string;
      name: string;
      address: string | null;
      phone: string | null;
      email: string | null;
      website: string | null;
      tax_number: string | null;
      logo: string | null;
      default_company: boolean;
      is_active: boolean;
    }>;
    return { ok: true, data: rows.map(mapRow) };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function getDefaultCompany(): Promise<
  ActionResult<CompanyRow | null>
> {
  try {
    await requirePermission("user", "read");
    const { data, error } = await db().then((s) =>
      s
        .from("companies")
        .select(
          "id, name, address, phone, email, website, tax_number, logo, default_company, is_active",
        )
        .eq("default_company", true)
        .single(),
    );
    if (error) {
      if (error.code === "PGRST116") return { ok: true, data: null };
      return { ok: false, error: error.message };
    }
    return { ok: true, data: mapRow(data as never) };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

function validateCompany(input: CompanyInput): string | null {
  const name = input.name.trim();
  if (!name) return "Nama perusahaan wajib diisi";
  if (name.length > 200) return "Nama perusahaan maksimal 200 karakter";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return "Format email tidak valid";
  }
  return null;
}

export async function createCompany(input: CompanyInput): Promise<ActionResult> {
  try {
    await requirePermission("user", "create");
    const invalid = validateCompany(input);
    if (invalid) return { ok: false, error: invalid };

    const { error } = await db().then((s) =>
      s.from("companies").insert({
        id: crypto.randomUUID(),
        name: input.name.trim(),
        address: input.address || null,
        phone: input.phone || null,
        email: input.email || null,
        website: input.website || null,
        tax_number: input.taxNumber || null,
        logo: input.logo || null,
      } as never),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}

export async function updateCompany(
  id: string,
  input: CompanyInput,
): Promise<ActionResult> {
  try {
    await requirePermission("user", "update");
    const invalid = validateCompany(input);
    if (invalid) return { ok: false, error: invalid };

    const { error } = await db().then((s) =>
      s
        .from("companies")
        .update({
          name: input.name.trim(),
          address: input.address || null,
          phone: input.phone || null,
          email: input.email || null,
          website: input.website || null,
          tax_number: input.taxNumber || null,
          logo: input.logo || null,
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

export async function deleteCompany(id: string): Promise<ActionResult> {
  try {
    await requirePermission("user", "delete");

    const { data: company } = await db().then((s) =>
      s.from("companies").select("default_company").eq("id", id).single(),
    );
    if (company?.default_company) {
      return {
        ok: false,
        error: "Perusahaan default tidak bisa dihapus",
      };
    }

    const { error } = await db().then((s) =>
      s.from("companies").delete().eq("id", id),
    );
    if (error) return { ok: false, error: guardErr(error) };
    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: guardErr(e) };
  }
}
