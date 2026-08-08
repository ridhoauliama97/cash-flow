# Permission Matrix — Fase 1

Matriks role × permission yang di-seed oleh `prisma/seed.ts` (single source of
truth ada di `prisma/seed.ts` — dokumen ini mengikuti). Nilai disimpan sebagai
string di tabel `accounting.permissions` / `accounting.role_permissions`;
validasi dilakukan di aplikasi (RBAC dinamis, bukan hard-coded di kode).

## Modul & aksi

| Modul         | Deskripsi                                         | Aksi |
| ------------- | ------------------------------------------------- | ---- |
| `transaction` | Transaksi kas masuk/keluar                        | create, read, update, delete, approve, print |
| `ledger`      | Jurnal & buku besar                               | create, read, update, delete, print |
| `master-data` | Customer, supplier, cost center, chart of accounts | create, read, update, delete, print |
| `report`      | Laporan keuangan                                  | read, print, export |
| `period`      | Tutup buku & reopen periode                       | approve |
| `user`        | Kelola user, role, permission                     | create, read, update, delete |

> Approval level tidak disimpan sebagai permission terpisah — diturunkan dari
> `role.level`: `kepala` = approval level 1, `direktur` = approval level 2.
> Aksi `transaction.approve` berarti role punya wewenang approve pada level tsb.

## Matriks

| Modul / aksi            | Super Admin | Admin | Direktur | Asisten Dir | Kepala Finance | Staff Finance |
| ----------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| **transaction** create  | ✓   | ✓   |     |     | ✓   | ✓   |
| **transaction** read    | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| **transaction** update  | ✓   | ✓   |     |     | ✓   | ✓   |
| **transaction** delete  | ✓   | ✓   |     |     | ✓   | ✓   |
| **transaction** approve | ✓   | ✓   | ✓ (lvl 2) | ✓ (lvl 2) | ✓ (lvl 1) |     |
| **transaction** print   | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| **ledger** create       | ✓   | ✓   |     |     |     |     |
| **ledger** read         | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| **ledger** update       | ✓   | ✓   |     |     |     |     |
| **ledger** delete       | ✓   | ✓   |     |     |     |     |
| **ledger** print        | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| **master-data** create  | ✓   | ✓   |     |     | ✓   |     |
| **master-data** read    | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| **master-data** update  | ✓   | ✓   |     |     | ✓   |     |
| **master-data** delete  | ✓   | ✓   |     |     |     |     |
| **master-data** print   | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| **report** read         | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| **report** print        | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| **report** export       | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| **period** approve      | ✓   | ✓   | ✓   |     |     |     |
| **user** create         | ✓   | ✓   |     |     |     |     |
| **user** read           | ✓   | ✓   |     |     |     |     |
| **user** update         | ✓   | ✓   |     |     |     |     |
| **user** delete         | ✓   | ✓   |     |     |     |     |

## Aturan tambahan (dari PRD §2)

1. **Asisten Direktur**: akses semua laporan + approve level 2, TANPA
   `period.approve` (tidak bisa approve reopen periode) dan TANPA `user.*`
   (tidak mengelola user).
2. **Kelola user/role/permission** (`user.*`): hanya Admin dan Super Admin.
3. **Data milik Super Admin** tidak bisa diubah/dihapus oleh role lain —
   ditegakkan di level database oleh trigger `accounting.protect_super_admin_data()`
   (migration 0004): UPDATE/DELETE pada `transactions.created_by` atau `users.id`
   milik Super Admin hanya diizinkan untuk Super Admin itu sendiri (berlaku juga
   saat RLS di-bypass).
4. **Kepala Finance** mewarisi semua permission Staff Finance + `approve`
   (level 1) + `delete` transaksi + `report.export` (lihat matriks).
5. Edit/update transaksi yang sudah di-approve harus dicek di aplikasi (status),
   bukan hanya permission.

## Catatan seed

- Seed idempotent: menambahkan permission/role baru yang hilang; TIDAK menghapus
  permission yang sudah dihapus dari matriks (perubahan matrix = jalankan ulang
  seed setelah merapikan baris lama, atau kelola via UI Admin).
- Role user ditentukan per user (`accounting.user_roles`), diatur via UI Admin
  atau SQL. User profil dibuat otomatis oleh trigger `handle_new_user` saat
  login pertama.
