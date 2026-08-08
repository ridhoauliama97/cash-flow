// Seed data Fase 1 — idempotent (upsert / createMany skipDuplicates).
// Jalankan: pnpm db:seed   (membaca DATABASE_URL dari .env)
//
// Men-seed:
//   1. 4 division (Management, Finance, Accounting, Internal Audit)
//   2. 6 role Fase 1 + permission matrix (role x permission)
//   3. Chart of accounts default (hierarkis)
//   4. Role "Super Admin" untuk user dari env SEED_ADMIN_EMAIL (jika ada)
//
// Catatan: user profil dibuat otomatis oleh trigger handle_new_user saat login
// (auth.users -> accounting.users). Jika SEED_ADMIN_EMAIL belum pernah login,
// seed akan melewatinya dengan peringatan.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSION_ACTIONS, PERMISSION_MODULES } from "../src/types/rbac";

const DIVISIONS = [
  "Management",
  "Finance",
  "Accounting",
  "Internal Audit",
] as const;

const ROLES = [
  { name: "Super Admin", level: "superadmin", division: null },
  { name: "Admin", level: "admin", division: null },
  { name: "Direktur", level: "direktur", division: "Management" },
  { name: "Asisten Direktur", level: "direktur", division: "Management" },
  { name: "Kepala Finance", level: "kepala", division: "Finance" },
  { name: "Staff Finance", level: "staff", division: "Finance" },
] as const;

type Module = (typeof PERMISSION_MODULES)[number];
type Action = (typeof PERMISSION_ACTIONS)[number];

const ALL: Array<[Module, Action]> = PERMISSION_MODULES.flatMap((m) =>
  PERMISSION_ACTIONS.map((a) => [m, a] as [Module, Action]),
);

// Matriks Fase 1 (lihat docs/permission-matrix.md). Approval level diambil
// dari role.level: kepala -> level 1, direktur -> level 2.
const PERMISSION_MATRIX: Array<{ role: string; permissions: Array<[Module, Action]> }> = [
  { role: "Super Admin", permissions: ALL },
  { role: "Admin", permissions: ALL },
  {
    role: "Direktur",
    permissions: [
      ["dashboard", "read"],
      ["analytics", "read"],
      ["transaction", "read"],
      ["transaction", "approve"],
      ["transaction", "print"],
      ["ledger", "read"],
      ["ledger", "print"],
      ["master-data", "read"],
      ["master-data", "print"],
      ["report", "read"],
      ["report", "print"],
      ["report", "export"],
      ["period", "approve"],
    ],
  },
  {
    role: "Asisten Direktur",
    permissions: [
      ["dashboard", "read"],
      ["analytics", "read"],
      ["transaction", "read"],
      ["transaction", "approve"],
      ["transaction", "print"],
      ["ledger", "read"],
      ["ledger", "print"],
      ["master-data", "read"],
      ["master-data", "print"],
      ["report", "read"],
      ["report", "print"],
      ["report", "export"],
    ],
  },
  {
    role: "Kepala Finance",
    permissions: [
      ["dashboard", "read"],
      ["analytics", "read"],
      ["import", "read"],
      ["schedule", "read"],
      ["transaction", "create"],
      ["transaction", "read"],
      ["transaction", "update"],
      ["transaction", "delete"],
      ["transaction", "approve"],
      ["transaction", "print"],
      ["ledger", "read"],
      ["ledger", "print"],
      ["master-data", "create"],
      ["master-data", "read"],
      ["master-data", "update"],
      ["master-data", "print"],
      ["report", "read"],
      ["report", "print"],
      ["report", "export"],
    ],
  },
  {
    role: "Staff Finance",
    permissions: [
      ["dashboard", "read"],
      ["analytics", "read"],
      ["schedule", "read"],
      ["transaction", "create"],
      ["transaction", "read"],
      ["transaction", "update"],
      ["transaction", "delete"],
      ["transaction", "print"],
      ["ledger", "read"],
      ["master-data", "create"],
      ["master-data", "read"],
      ["master-data", "print"],
      ["report", "read"],
      ["report", "print"],
    ],
  },
];

// Chart of accounts default (parent di-seed duluan, berurutan).
const CHART_OF_ACCOUNTS: Array<{
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  parent: string | null;
}> = [
  { code: "1", name: "Aset", type: "asset", parent: null },
  { code: "1-1000", name: "Kas", type: "asset", parent: "1" },
  { code: "1-2000", name: "Bank", type: "asset", parent: "1" },
  { code: "1-3000", name: "Piutang Usaha", type: "asset", parent: "1" },
  { code: "2", name: "Liabilitas", type: "liability", parent: null },
  { code: "2-1000", name: "Hutang Usaha", type: "liability", parent: "2" },
  { code: "3", name: "Ekuitas", type: "equity", parent: null },
  { code: "3-1000", name: "Modal", type: "equity", parent: "3" },
  { code: "4", name: "Pendapatan", type: "revenue", parent: null },
  { code: "4-1000", name: "Pendapatan Usaha", type: "revenue", parent: "4" },
  { code: "5", name: "Beban", type: "expense", parent: null },
  { code: "5-1000", name: "Beban Operasional", type: "expense", parent: "5" },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL tidak ada — salin .env.example ke .env dulu");
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    // 1. Divisions
    const divisionIds = new Map<string, string>();
    for (const name of DIVISIONS) {
      const d = await prisma.division.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      divisionIds.set(name, d.id);
    }
    console.log(`[seed] divisions: ${DIVISIONS.length} OK`);

    // 2. Roles
    const roleIds = new Map<string, string>();
    for (const r of ROLES) {
      const role = await prisma.role.upsert({
        where: { name: r.name },
        create: {
          name: r.name,
          level: r.level,
          divisionId: r.division ? divisionIds.get(r.division) ?? null : null,
        },
        update: {
          level: r.level,
          divisionId: r.division ? divisionIds.get(r.division) ?? null : null,
        },
      });
      roleIds.set(r.name, role.id);
    }
    console.log(`[seed] roles: ${ROLES.length} OK`);

    // 3. Permissions + role_permissions
    const permRows: Array<[Module, Action]> = [
      ...new Map(ALL.map((p) => [p.join("/"), p] as const)).values(),
    ];
    const permissions = new Map<string, string>();
    for (const [module, action] of permRows) {
      const p = await prisma.permission.upsert({
        where: { module_action: { module, action } },
        create: { module, action },
        update: {},
      });
      permissions.set(`${module}/${action}`, p.id);
    }
    console.log(`[seed] permissions: ${permRows.length} OK`);

    const rolePermData: Array<{ roleId: string; permissionId: string }> = [];
    for (const row of PERMISSION_MATRIX) {
      const roleId = roleIds.get(row.role);
      if (!roleId) continue;
      for (const [module, action] of row.permissions) {
        const permissionId = permissions.get(`${module}/${action}`);
        if (permissionId) {
          rolePermData.push({ roleId, permissionId });
        }
      }
    }
    await prisma.rolePermission.createMany({
      data: rolePermData,
      skipDuplicates: true,
    });
    console.log(`[seed] role_permissions: ${rolePermData.length} rows OK (idempotent)`);

    // 4. Chart of accounts
    const coaIds = new Map<string, string>();
    for (const acc of CHART_OF_ACCOUNTS) {
      const parentId = acc.parent ? coaIds.get(acc.parent) ?? null : null;
      const row = await prisma.chartOfAccount.upsert({
        where: { code: acc.code },
        create: { code: acc.code, name: acc.name, type: acc.type, parentId },
        update: { name: acc.name, type: acc.type, parentId },
      });
      coaIds.set(acc.code, row.id);
    }
    console.log(`[seed] chart_of_accounts: ${CHART_OF_ACCOUNTS.length} OK`);

    // 5. Super Admin assignment (opsional, via SEED_ADMIN_EMAIL)
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    if (adminEmail) {
      const user = await prisma.user.findUnique({ where: { email: adminEmail } });
      const superAdminRoleId = roleIds.get("Super Admin");
      if (user && superAdminRoleId) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: superAdminRoleId } },
          create: { userId: user.id, roleId: superAdminRoleId },
          update: {},
        });
        console.log(`[seed] user ${adminEmail} -> Super Admin OK`);
      } else {
        console.warn(
          `[seed] SKIP: user ${adminEmail} belum ada (login dulu agar profil dibuat, lalu jalankan ulang seed)`,
        );
      }
    }

    const [u, d, r, p, rp, c] = await Promise.all([
      prisma.user.count(),
      prisma.division.count(),
      prisma.role.count(),
      prisma.permission.count(),
      prisma.rolePermission.count(),
      prisma.chartOfAccount.count(),
    ]);
    console.log(
      `[seed] selesai. users=${u} divisions=${d} roles=${r} permissions=${p} role_permissions=${rp} chart_of_accounts=${c}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[seed] GAGAL:", err);
  process.exit(1);
});
