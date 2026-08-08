// RBAC service layer — permission dinamis dari DB (bukan hardcoded).
//
// Resolusi: user_roles -> role_permissions -> permissions (schema accounting).
// Warisan: role level 'kepala' otomatis mewarisi permission semua role level
// 'staff' di divisi yang sama (PRD §2.2). Guard Super Admin di service layer
// meniru trigger DB (protect_super_admin_data) untuk jalur yang tidak lewat DB
// (mis. validasi sebelum update).
//
// Bagian "pure" (computePermissions, canModifyDataFor) unit-testable tanpa DB;
// lapisan DB tipis di bawahnya memakai supabase server client (RLS aktif).

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { AuthUser } from "@/lib/session";

export const ROLE_LEVEL_STAFF = "staff";
export const ROLE_LEVEL_KEPALA = "kepala";
export const ROLE_LEVEL_SUPERADMIN = "superadmin";

export interface RoleRow {
  id: string;
  level: string;
  divisionId: string | null;
}

export interface UserRoleRow {
  roleId: string;
  level: string;
  divisionId: string | null;
}

export interface PermissionRow {
  roleId: string;
  module: string;
  action: string;
}

export interface ResolvedRole extends UserRoleRow {
  name: string;
}

export function permissionKey(module: string, action: string): string {
  return `${module}/${action}`;
}

/**
 * Pure: gabungkan permission langsung + warisan kepala.
 * - Langsung: dari setiap role milik user (via role_permissions).
 * - Warisan: role level 'kepala' mewarisi permission semua role level 'staff'
 *   di divisi yang sama — role staff baru yang dibuat via UI tidak perlu
 *   disinkronkan manual ke role kepala.
 * Mengembalikan Set "module/action".
 */
export function computePermissions(
  userRoles: readonly UserRoleRow[],
  allRoles: readonly RoleRow[],
  allPermissions: readonly PermissionRow[],
): Set<string> {
  const byRole = new Map<string, PermissionRow[]>();
  for (const p of allPermissions) {
    const list = byRole.get(p.roleId) ?? [];
    list.push(p);
    byRole.set(p.roleId, list);
  }

  const out = new Set<string>();
  for (const ur of userRoles) {
    for (const p of byRole.get(ur.roleId) ?? []) {
      out.add(permissionKey(p.module, p.action));
    }
  }

  for (const ur of userRoles) {
    if (ur.level !== ROLE_LEVEL_KEPALA) continue;
    for (const r of allRoles) {
      if (r.level !== ROLE_LEVEL_STAFF) continue;
      if (r.divisionId !== ur.divisionId) continue;
      for (const p of byRole.get(r.id) ?? []) {
        out.add(permissionKey(p.module, p.action));
      }
    }
  }
  return out;
}

/**
 * Pure: pelindung data Super Admin (PRD §2.2, sama dengan trigger DB).
 * Data milik Super Admin hanya bisa diubah/dihapus oleh Super Admin.
 */
export function canModifyDataFor(
  actorId: string,
  ownerId: string,
  superAdminIds: ReadonlySet<string>,
): boolean {
  if (!superAdminIds.has(ownerId)) return true;
  return superAdminIds.has(actorId);
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

async function accounting() {
  const supabase = await createClient();
  return supabase.schema("accounting");
}

/** Role milik user (beserta level + divisi + nama). */
export async function resolveRoles(userId: string): Promise<ResolvedRole[]> {
  const { data, error } = await accounting().then((s) =>
    s
      .from("user_roles")
      .select("role_id, roles!inner(id, name, level, division_id)")
      .eq("user_id", userId),
  );
  if (error) throw new Error(`resolveRoles: ${error.message}`);
  const rows = (data ?? []) as unknown as Array<{
    role_id: string;
    roles: { id: string; name: string; level: string; division_id: string | null };
  }>;
  return rows.map((r) => ({
    roleId: r.role_id,
    name: r.roles.name,
    level: r.roles.level,
    divisionId: r.roles.division_id,
  }));
}

async function getAllRoles(): Promise<RoleRow[]> {
  const { data, error } = await accounting().then((s) =>
    s.from("roles").select("id, level, division_id"),
  );
  if (error) throw new Error(`getAllRoles: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    level: r.level,
    divisionId: r.division_id,
  }));
}

async function getAllPermissions(): Promise<PermissionRow[]> {
  const { data, error } = await accounting().then((s) =>
    s
      .from("role_permissions")
      .select("role_id, permissions!inner(module, action)"),
  );
  if (error) throw new Error(`getAllPermissions: ${error.message}`);
  const rows = (data ?? []) as unknown as Array<{
    role_id: string;
    permissions: { module: string; action: string };
  }>;
  return rows.map((r) => ({
    roleId: r.role_id,
    module: r.permissions.module,
    action: r.permissions.action,
  }));
}

/** Semua permission efektif user ("module/action"), langsung + warisan. */
export async function getEffectivePermissions(
  userId: string,
): Promise<Set<string>> {
  const [userRoles, allRoles, allPermissions] = await Promise.all([
    resolveRoles(userId),
    getAllRoles(),
    getAllPermissions(),
  ]);
  return computePermissions(userRoles, allRoles, allPermissions);
}

/** Cek permission dinamis dari DB. */
export async function hasPermission(
  userId: string,
  module: string,
  action: string,
): Promise<boolean> {
  const effective = await getEffectivePermissions(userId);
  return effective.has(permissionKey(module, action));
}

/**
 * Guard untuk server actions & API routes: wajib login + punya permission,
 * else throw PermissionError (403). Mengembalikan AuthUser pemanggil.
 */
export async function requirePermission(
  module: string,
  action: string,
): Promise<AuthUser> {
  const user = await requireUser();
  if (!(await hasPermission(user.id, module, action))) {
    throw new PermissionError(`Permission denied: ${module}/${action}`);
  }
  return user;
}

/**
 * Guard untuk halaman server-component (menu access): true kalau user punya
 * akses, false kalau tidak (tanpa throw — caller render <AccessDenied />).
 * Error lain (mis. koneksi DB) tetap dilempar.
 */
export async function hasPageAccess(
  module: string,
  action = "read",
): Promise<boolean> {
  try {
    await requirePermission(module, action);
    return true;
  } catch (e) {
    if (e instanceof PermissionError) return false;
    throw e;
  }
}

/** User id pemilik role level 'superadmin' (dari DB, tidak hardcoded). */
export async function getSuperAdminUserIds(): Promise<Set<string>> {
  const { data, error } = await accounting().then((s) =>
    s
      .from("user_roles")
      .select("user_id, roles!inner(level)")
      .eq("roles.level", ROLE_LEVEL_SUPERADMIN),
  );
  if (error) throw new Error(`getSuperAdminUserIds: ${error.message}`);
  return new Set((data ?? []).map((r) => r.user_id as string));
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  return (await getSuperAdminUserIds()).has(userId);
}

/**
 * Guard service layer untuk data milik Super Admin: throw kalau aktor
 * bukan Super Admin dan pemilik data adalah Super Admin.
 */
export async function requireCanModifyData(ownerId: string): Promise<AuthUser> {
  const user = await requireUser();
  const superAdminIds = await getSuperAdminUserIds();
  if (!canModifyDataFor(user.id, ownerId, superAdminIds)) {
    throw new PermissionError(
      "Data milik Super Admin tidak dapat diubah/dihapus oleh role lain",
    );
  }
  return user;
}
