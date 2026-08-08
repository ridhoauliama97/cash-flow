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
      ["period", "read"],
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
      ["period", "read"],
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
    let adminUserId: string | undefined;
    if (adminEmail) {
      const user = await prisma.user.findUnique({ where: { email: adminEmail } });
      const superAdminRoleId = roleIds.get("Super Admin");
      if (user && superAdminRoleId) {
        adminUserId = user.id;
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

    // 6. Cost centers (idempotent by unique code)
    const costCenterIds = new Map<string, string>();
    const COST_CENTERS = [
      { code: "CC-ADM", name: "Administrasi Umum" },
      { code: "CC-MKT", name: "Marketing & Sales" },
      { code: "CC-PROD", name: "Produksi" },
    ];
    for (const cc of COST_CENTERS) {
      const row = await prisma.costCenter.upsert({
        where: { code: cc.code },
        create: { code: cc.code, name: cc.name },
        update: { name: cc.name },
      });
      costCenterIds.set(cc.code, row.id);
    }
    console.log(`[seed] cost_centers: ${COST_CENTERS.length} OK`);

    // 7. Customers (idempotent: cek dulu sebelum insert)
    const customerIds = new Map<string, string>();
    const custCount = await prisma.customer.count();
    if (custCount === 0) {
      const CUSTOMERS = [
        { name: "PT Maju Jaya", contactInfo: "021-555-0101" },
        { name: "CV Berkah Abadi", contactInfo: "0812-3456-7890" },
        { name: "UD Sumber Rezeki", contactInfo: "031-777-0202" },
      ];
      for (const c of CUSTOMERS) {
        const row = await prisma.customer.create({ data: c });
        customerIds.set(c.name, row.id);
      }
      console.log(`[seed] customers: ${CUSTOMERS.length} OK`);
    } else {
      const all = await prisma.customer.findMany({ select: { id: true, name: true } });
      for (const c of all) customerIds.set(c.name, c.id);
      console.log(`[seed] customers: skip (already ${custCount} rows)`);
    }

    // 8. Suppliers (idempotent: cek dulu)
    const supplierIds = new Map<string, string>();
    const suppCount = await prisma.supplier.count();
    if (suppCount === 0) {
      const SUPPLIERS = [
        { name: "PT Sumber Pangan", contactInfo: "022-888-0303" },
        { name: "CV Teknik Mandiri", contactInfo: "0813-9876-5432" },
      ];
      for (const s of SUPPLIERS) {
        const row = await prisma.supplier.create({ data: s });
        supplierIds.set(s.name, row.id);
      }
      console.log(`[seed] suppliers: ${SUPPLIERS.length} OK`);
    } else {
      const all = await prisma.supplier.findMany({ select: { id: true, name: true } });
      for (const s of all) supplierIds.set(s.name, s.id);
      console.log(`[seed] suppliers: skip (already ${suppCount} rows)`);
    }

    // 9. Accounting period — tahun berjalan (idempotent: cek count)
    let periodId: string | undefined;
    const periodCount = await prisma.accountingPeriod.count();
    const currentYear = new Date().getFullYear();
    if (periodCount === 0) {
      const period = await prisma.accountingPeriod.create({
        data: {
          startDate: new Date(`${currentYear}-01-01`),
          endDate: new Date(`${currentYear}-12-31`),
          status: "open",
        },
      });
      periodId = period.id;
      console.log(`[seed] accounting_period: FY${currentYear} OK`);
    } else {
      const first = await prisma.accountingPeriod.findFirst({ select: { id: true } });
      periodId = first?.id;
      console.log(`[seed] accounting_period: skip (already ${periodCount} rows)`);
    }

    // 10. Sample transactions (idempotent — cek count)
    const txCount = await prisma.transaction.count();
    if (txCount === 0 && adminUserId && periodId) {
      const samples = [
        { type: "income", date: new Date(`${currentYear}-06-15`), description: "Pendapatan jasa konsultasi", amount: 15_000_000 },
        { type: "income", date: new Date(`${currentYear}-07-10`), description: "Penjualan produk digital", amount: 8_500_000 },
        { type: "expense", date: new Date(`${currentYear}-06-20`), description: "Sewa kantor bulanan", amount: 5_000_000 },
        { type: "expense", date: new Date(`${currentYear}-07-05`), description: "Langganan SaaS tools", amount: 1_200_000 },
        { type: "income", date: new Date(`${currentYear}-07-25`), description: "Proyek pengembangan web", amount: 25_000_000 },
        { type: "expense", date: new Date(`${currentYear}-08-01`), description: "Gaji karyawan Juli", amount: 12_000_000 },
        { type: "income", date: new Date(`${currentYear}-08-10`), description: "Kontrak maintenance tahunan", amount: 30_000_000 },
        { type: "expense", date: new Date(`${currentYear}-08-12`), description: "Pembelian peralatan IT", amount: 7_500_000 },
      ];
      const ccAdm = costCenterIds.get("CC-ADM");
      const ccMkt = costCenterIds.get("CC-MKT");
      for (const s of samples) {
        await prisma.transaction.create({
          data: {
            type: s.type,
            date: s.date,
            description: s.description,
            amount: s.amount,
            currency: "IDR",
            baseAmount: s.amount,
            rateSnapshot: 1,
            costCenterId: s.type === "income" ? ccMkt : ccAdm,
            createdBy: adminUserId,
            status: "approved",
            source: "manual",
            accountingPeriodId: periodId,
          },
        });
      }
      console.log(`[seed] transactions: ${samples.length} OK`);
    } else {
      console.log(`[seed] transactions: skip (already ${txCount} rows, or missing admin/period)`);
    }

    // 11. Sample invoices (idempotent — cek count)
    const invCount = await prisma.invoice.count();
    if (invCount === 0 && adminUserId) {
      const cust1 = customerIds.get("PT Maju Jaya");
      const cust2 = customerIds.get("CV Berkah Abadi");
      const supp1 = supplierIds.get("PT Sumber Pangan");
      if (cust1 && cust2 && supp1) {
        await prisma.invoice.createMany({
          data: [
            { type: "receivable", number: "INV-001", customerId: cust1, description: "Jasa konsultasi Q2", amount: 15_000_000, currency: "IDR", status: "sent", dueDate: new Date(`${currentYear}-07-15`), createdBy: adminUserId },
            { type: "receivable", number: "INV-002", customerId: cust2, description: "Pengembangan web", amount: 25_000_000, currency: "IDR", status: "paid", dueDate: new Date(`${currentYear}-08-15`), paidAt: new Date(`${currentYear}-08-01`), createdBy: adminUserId },
            { type: "payable", number: "INV-003", supplierId: supp1, description: "Bahan baku produksi", amount: 3_500_000, currency: "IDR", status: "overdue", dueDate: new Date(`${currentYear}-07-01`), createdBy: adminUserId },
          ],
        });
        console.log(`[seed] invoices: 3 OK`);
      } else {
        console.log(`[seed] invoices: skip (missing customer/supplier reference)`);
      }
    } else {
      console.log(`[seed] invoices: skip (already ${invCount} rows)`);
    }

    // 12. Sample forecasts — bulan berjalan (idempotent)
    const fcCount = await prisma.forecast.count();
    if (fcCount === 0 && adminUserId) {
      const now = new Date();
      await prisma.forecast.createMany({
        data: [
          { year: currentYear, month: now.getMonth() + 1, category: "revenue", description: "Proyeksi pendapatan bulan ini", amount: 50_000_000, currency: "IDR", createdBy: adminUserId },
          { year: currentYear, month: now.getMonth() + 1, category: "expense", description: "Proyeksi pengeluaran operasional", amount: 28_000_000, currency: "IDR", createdBy: adminUserId },
          { year: currentYear, month: now.getMonth() + 1, category: "profit", description: "Estimasi profit bersih", amount: 22_000_000, currency: "IDR", createdBy: adminUserId },
        ],
      });
      console.log(`[seed] forecasts: 3 OK`);
    } else {
      console.log(`[seed] forecasts: skip (already ${fcCount} rows)`);
    }

    // 13. Sample schedule (idempotent)
    const schCount = await prisma.schedule.count();
    if (schCount === 0 && adminUserId) {
      await prisma.schedule.create({
        data: {
          name: "Laporan Bulanan",
          reportType: "general-ledger",
          frequency: "monthly",
          dayOfMonth: 1,
          timeOfDay: "08:00",
          recipients: ["finance@example.com"],
          format: "pdf",
          enabled: true,
          createdBy: adminUserId,
        },
      });
      console.log(`[seed] schedules: 1 OK`);
    } else {
      console.log(`[seed] schedules: skip (already ${schCount} rows)`);
    }

    const [u, d, r, p, rp, c, cc, cust, supp, tx, inv, fc, sch] = await Promise.all([
      prisma.user.count(),
      prisma.division.count(),
      prisma.role.count(),
      prisma.permission.count(),
      prisma.rolePermission.count(),
      prisma.chartOfAccount.count(),
      prisma.costCenter.count(),
      prisma.customer.count(),
      prisma.supplier.count(),
      prisma.transaction.count(),
      prisma.invoice.count(),
      prisma.forecast.count(),
      prisma.schedule.count(),
    ]);
    console.log(
      `[seed] selesai. users=${u} divisions=${d} roles=${r} permissions=${p} role_permissions=${rp} coa=${c} cost_centers=${cc} customers=${cust} suppliers=${supp} transactions=${tx} invoices=${inv} forecasts=${fc} schedules=${sch}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[seed] GAGAL:", err);
  process.exit(1);
});
