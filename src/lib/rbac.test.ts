import { describe, expect, it } from "vitest";
import {
  canModifyDataFor,
  computePermissions,
  permissionKey,
  type PermissionRow,
  type RoleRow,
  type UserRoleRow,
} from "./rbac";

// ============================================================================
// Data uji: matriks Fase 1 (sama dengan prisma/seed.ts — source of truth)
// ============================================================================

type PermMap = Record<string, string[]>;

const MODULES = ["transaction", "ledger", "master-data", "report", "period", "user"];
const ACTIONS = ["create", "read", "update", "delete", "approve", "print", "export"];

const allOf = (modules: string[], actions: string[]): PermMap =>
  Object.fromEntries(modules.map((m) => [m, actions]));

const merge = (...maps: PermMap[]): PermMap => {
  const out: PermMap = {};
  for (const m of maps) {
    for (const [k, v] of Object.entries(m)) out[k] = [...(out[k] ?? []), ...v];
  }
  return out;
};

const MATRIX: Record<string, PermMap> = {
  "Super Admin": allOf(MODULES, ACTIONS),
  Admin: allOf(MODULES, ACTIONS),
  Direktur: merge(
    allOf(["transaction", "ledger", "master-data", "report"], ["read", "approve", "print"]),
    { transaction: ["approve"], period: ["approve"], report: ["export"] },
  ),
  "Asisten Direktur": merge(
    allOf(["transaction", "ledger", "master-data", "report"], ["read", "approve", "print"]),
    { transaction: ["approve"], report: ["export"] },
  ),
  "Kepala Finance": merge(
    allOf(["transaction"], ["create", "read", "update", "delete", "approve", "print"]),
    {
      ledger: ["read", "print"],
      "master-data": ["create", "read", "update", "print"],
      report: ["read", "print", "export"],
    },
  ),
  "Staff Finance": merge(
    allOf(["transaction"], ["create", "read", "update", "delete", "print"]),
    {
      ledger: ["read"],
      "master-data": ["create", "read", "print"],
      report: ["read", "print"],
    },
  ),
};

const ROLES: RoleRow[] = [
  { id: "r-super", level: "superadmin", divisionId: null },
  { id: "r-admin", level: "admin", divisionId: null },
  { id: "r-dir", level: "direktur", divisionId: "d-management" },
  { id: "r-asdir", level: "direktur", divisionId: "d-management" },
  { id: "r-kepala", level: "kepala", divisionId: "d-finance" },
  { id: "r-staff", level: "staff", divisionId: "d-finance" },
];

const ROLE_IDS: Record<string, string> = {
  "Super Admin": "r-super",
  Admin: "r-admin",
  Direktur: "r-dir",
  "Asisten Direktur": "r-asdir",
  "Kepala Finance": "r-kepala",
  "Staff Finance": "r-staff",
};

const roleId = (name: string): string => ROLE_IDS[name];

function permsForRole(name: string): PermissionRow[] {
  const id = roleId(name);
  return Object.entries(MATRIX[name]).flatMap(([module, actions]) =>
    actions.map((action) => ({ roleId: id, module, action })),
  );
}

const ALL_PERMISSIONS: PermissionRow[] = Object.keys(MATRIX).flatMap(permsForRole);

const userRole = (name: string): UserRoleRow => {
  const r = ROLES.find((x) => x.id === roleId(name));
  return { roleId: r!.id, level: r!.level, divisionId: r!.divisionId };
};

function effectiveFor(names: string[]): Set<string> {
  return computePermissions(
    names.map(userRole),
    ROLES,
    ALL_PERMISSIONS,
  );
}

const has = (set: Set<string>, module: string, action: string) =>
  set.has(permissionKey(module, action));

// ============================================================================
// Matriks Fase 1 (6 role × module × action)
// ============================================================================

describe("matriks permission Fase 1", () => {
  it.each(Object.keys(MATRIX))("%s punya permission sesuai matriks", (roleName) => {
    const effective = effectiveFor([roleName]);
    for (const [module, actions] of Object.entries(MATRIX[roleName])) {
      for (const action of actions) {
        expect(has(effective, module, action)).toBe(true);
      }
    }
  });

  it("role tanpa user_roles tidak punya permission apa pun", () => {
    const effective = computePermissions([], ROLES, ALL_PERMISSIONS);
    expect(effective.size).toBe(0);
  });

  it("Staff Finance tidak bisa approve", () => {
    const effective = effectiveFor(["Staff Finance"]);
    expect(has(effective, "transaction", "approve")).toBe(false);
  });

  it("Asisten Direktur: approve transaksi + akses laporan, TANPA kelola user dan TANPA reopen periode", () => {
    const effective = effectiveFor(["Asisten Direktur"]);
    expect(has(effective, "transaction", "approve")).toBe(true);
    expect(has(effective, "report", "read")).toBe(true);
    expect(has(effective, "report", "export")).toBe(true);
    expect(has(effective, "user", "create")).toBe(false);
    expect(has(effective, "user", "read")).toBe(false);
    expect(has(effective, "period", "approve")).toBe(false);
  });

  it("Direktur bisa approve reopen periode, Asisten Direktur tidak", () => {
    expect(has(effectiveFor(["Direktur"]), "period", "approve")).toBe(true);
    expect(has(effectiveFor(["Asisten Direktur"]), "period", "approve")).toBe(false);
  });

  it("hanya Admin / Super Admin yang punya permission kelola user", () => {
    for (const roleName of ["Admin", "Super Admin"]) {
      const effective = effectiveFor([roleName]);
      expect(has(effective, "user", "create")).toBe(true);
      expect(has(effective, "user", "delete")).toBe(true);
    }
    for (const roleName of ["Direktur", "Asisten Direktur", "Kepala Finance", "Staff Finance"]) {
      const effective = effectiveFor([roleName]);
      expect(has(effective, "user", "read")).toBe(false);
    }
  });
});

// ============================================================================
// Warisan kepala -> staff divisi yang sama
// ============================================================================

describe("warisan permission kepala", () => {
  it("kepala mewarisi permission staff di divisi yang sama", () => {
    // Role kepala yang TIDAK diberi permission staff secara eksplisit
    const roles: RoleRow[] = [
      { id: "k", level: "kepala", divisionId: "finance" },
      { id: "s", level: "staff", divisionId: "finance" },
    ];
    const perms: PermissionRow[] = [
      { roleId: "s", module: "transaction", action: "create" },
      { roleId: "s", module: "transaction", action: "read" },
      { roleId: "k", module: "transaction", action: "approve" },
    ];
    const effective = computePermissions(
      [{ roleId: "k", level: "kepala", divisionId: "finance" }],
      roles,
      perms,
    );
    expect(has(effective, "transaction", "create")).toBe(true);
    expect(has(effective, "transaction", "read")).toBe(true);
    expect(has(effective, "transaction", "approve")).toBe(true);
  });

  it("kepala TIDAK mewarisi staff di divisi lain", () => {
    const roles: RoleRow[] = [
      { id: "k", level: "kepala", divisionId: "finance" },
      { id: "s", level: "staff", divisionId: "sales" },
    ];
    const perms: PermissionRow[] = [
      { roleId: "s", module: "transaction", action: "create" },
    ];
    const effective = computePermissions(
      [{ roleId: "k", level: "kepala", divisionId: "finance" }],
      roles,
      perms,
    );
    expect(has(effective, "transaction", "create")).toBe(false);
  });

  it("user dengan role staff + kepala dapat union tanpa duplikat", () => {
    const roles: RoleRow[] = [
      { id: "k", level: "kepala", divisionId: "finance" },
      { id: "s", level: "staff", divisionId: "finance" },
    ];
    const perms: PermissionRow[] = [
      { roleId: "s", module: "transaction", action: "read" },
      { roleId: "k", module: "transaction", action: "read" },
      { roleId: "k", module: "transaction", action: "approve" },
    ];
    const effective = computePermissions(
      [
        { roleId: "k", level: "kepala", divisionId: "finance" },
        { roleId: "s", level: "staff", divisionId: "finance" },
      ],
      roles,
      perms,
    );
    expect(effective.size).toBe(2);
    expect(has(effective, "transaction", "read")).toBe(true);
    expect(has(effective, "transaction", "approve")).toBe(true);
  });

  it("permission duplikat (langsung + warisan) hanya terhitung sekali", () => {
    const roles: RoleRow[] = [
      { id: "k", level: "kepala", divisionId: "finance" },
      { id: "s", level: "staff", divisionId: "finance" },
    ];
    const perms: PermissionRow[] = [
      { roleId: "s", module: "report", action: "read" },
      { roleId: "k", module: "report", action: "read" },
    ];
    const effective = computePermissions(
      [{ roleId: "k", level: "kepala", divisionId: "finance" }],
      roles,
      perms,
    );
    expect(effective.size).toBe(1);
  });
});

// ============================================================================
// Proteksi data Super Admin
// ============================================================================

describe("canModifyDataFor (proteksi Super Admin)", () => {
  const superAdmin = new Set(["sa-1", "sa-2"]);

  it("Super Admin boleh mengubah datanya sendiri", () => {
    expect(canModifyDataFor("sa-1", "sa-1", superAdmin)).toBe(true);
  });

  it("Super Admin lain boleh mengubah data sesama Super Admin", () => {
    expect(canModifyDataFor("sa-2", "sa-1", superAdmin)).toBe(true);
  });

  it("role lain TIDAK boleh mengubah data milik Super Admin", () => {
    expect(canModifyDataFor("admin-1", "sa-1", superAdmin)).toBe(false);
    expect(canModifyDataFor("staff-1", "sa-1", superAdmin)).toBe(false);
  });

  it("data milik non-Super Admin bebas diubah oleh siapa pun (guard tidak menghalangi)", () => {
    expect(canModifyDataFor("staff-1", "admin-1", superAdmin)).toBe(true);
    expect(canModifyDataFor("admin-1", "staff-1", superAdmin)).toBe(true);
  });
});
