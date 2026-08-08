// RBAC types — NO TS enums (erasableSyntaxOnly): const arrays + union types.
// Nilai disimpan sebagai string di DB; validasi di aplikasi.

export const ROLE_LEVELS = [
  "staff",
  "kepala",
  "direktur",
  "admin",
  "superadmin",
] as const;
export type RoleLevel = (typeof ROLE_LEVELS)[number];

export const PERMISSION_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "approve",
  "print",
  "export",
] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_MODULES = [
  "transaction",
  "ledger",
  "master-data",
  "report",
  "period",
  "user",
] as const;
export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export const DEFAULT_DIVISIONS = [
  "Management",
  "Finance",
  "Accounting",
  "Internal Audit",
] as const;

export const SUPER_ADMIN_ROLE_NAME = "Super Admin";

export function isRoleLevel(v: string): v is RoleLevel {
  return (ROLE_LEVELS as readonly string[]).includes(v);
}

export function isPermissionAction(v: string): v is PermissionAction {
  return (PERMISSION_ACTIONS as readonly string[]).includes(v);
}

export function isPermissionModule(v: string): v is PermissionModule {
  return (PERMISSION_MODULES as readonly string[]).includes(v);
}
