# RBAC — Desain Permission Dinamis

Bagaimana permission bekerja di Fase 1: **dinamis dari DB**, bukan hardcoded di
kode. Role baru / permission baru bisa dibuat dari UI Admin tanpa mengubah kode.

## Model data (schema `accounting`)

```
users ──< user_roles >── roles ──< role_permissions >── permissions
(id = auth.users.id)          (level, division_id)      (module, action)
```

- `permissions` unik per `(module, action)` — modul & aksi bebas string,
  tidak dibatasi enum (role baru bisa pakai kombinasi baru).
- `role.level`: `staff | kepala | direktur | admin | superadmin`.
- `role.division_id`: divisi role (Kepala Finance → Finance, dst).

## Alur resolusi (`src/lib/rbac.ts`)

```
hasPermission(userId, module, action)
  └─ getEffectivePermissions(userId)         3 query supabase (RLS aktif)
       ├─ resolveRoles(userId)               user_roles → roles
       ├─ getAllRoles()                      roles (id, level, division_id)
       └─ getAllPermissions()                role_permissions → permissions
       └─ computePermissions(...)            murni (tanpa DB)
            = permission LANGSUNG semua role user
            ∪ warisan: role level 'kepala' mewarisi permission role level
              'staff' di divisi yang sama
```

Bagian murni (`computePermissions`, `canModifyDataFor`) di-unit-test di
`src/lib/rbac.test.ts` — lapisan DB tipis tidak perlu di-test (hanya query).

## Warisan kepala → staff divisi sama (PRD §2.2)

Role `kepala` otomatis mendapat semua permission role `staff` **di divisi yang
sama** — tanpa perlu menduplikasi di matriks. Contoh: bila Admin membuat role
"Staff Finance Junior" (level staff, divisi Finance) via UI, **Kepala Finance
langsung** mewarisi permission-nya. Staff divisi lain tidak memengaruhi.

> Matriks seed Fase 1 memang menulis permission Kepala Finance secara eksplisit
> (superset staff) — warisan tetap diberlakukan sebagai jaring pengaman untuk
> role baru.

## API service layer

| Fungsi | Kegunaan |
| ------ | -------- |
| `hasPermission(userId, module, action)` | cek boolean dari DB |
| `requirePermission(module, action)` | guard server action / API route — wajib login + permission, else `PermissionError` |
| `requireCanModifyData(ownerId)` | guard update/delete — proteksi data milik Super Admin |
| `resolveRoles(userId)` | role user (level, divisi, nama) untuk UI / logika |
| `isSuperAdmin(userId)` | cek super admin |

Contoh server action:

```ts
"use server";
export async function createTransaction(input: Input) {
  const user = await requirePermission("transaction", "create");
  // ... buat transaksi (createdBy = user.id)
}
```

## Proteksi Super Admin (dua lapis)

1. **Trigger DB** (`accounting.protect_super_admin_data`, migration 0004):
   UPDATE/DELETE pada `transactions.created_by` / `users.id` milik Super Admin
   hanya oleh Super Admin — berlaku walau RLS di-bypass (service key).
2. **Service layer** (`requireCanModifyData`): guard sebelum operasi tulis,
   semantik sama (satu sumber aturan: `canModifyDataFor`).

## Interaksi dengan RLS

Query di service layer lewat supabase-js (anon key + cookie session) → berjalan
sebagai `authenticated` dengan RLS aktif. Policy Fase 1: semua tabel RBAC
select untuk authenticated; write hanya admin (`accounting.is_admin()`).
`requirePermission` adalah lapisan wewenang **aplikasi** di atas RLS (RLS tidak
mengetahui modul/aksi).

## Menambah role/permission baru (tanpa ubah kode)

1. Insert `permissions(module, action)` baru (bila belum ada).
2. Insert `roles` baru + `role_permissions`.
3. Assign ke user via `user_roles` (UI Admin Fase 2).
4. Role `kepala` dengan divisi → warisan staff otomatis.

## Test (`src/lib/rbac.test.ts`)

- Matriks Fase 1: setiap role punya persis permission matriks (`it.each`).
- Asisten Direktur: tanpa `user.*`, tanpa `period.approve`, punya approve lvl 2.
- Warisan kepala: lintas divisi terisolasi, union tanpa duplikat.
- `canModifyDataFor`: data Super Admin hanya bisa diubah sesama Super Admin.
