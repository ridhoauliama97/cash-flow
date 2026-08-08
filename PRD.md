# PRD — Cashflow & Accounting Dashboard

**Stack:** Next.js + Supabase (PostgreSQL) + Prisma + shadcn/ui
**Status:** Draft v1 — dibangun bertahap per fase
**Tipe sistem:** Internal finance & accounting management system (mini-ERP module)

---

## 1. Latar Belakang & Tujuan

Sistem untuk mencatat, mengelola, dan melaporkan seluruh arus kas perusahaan (pendapatan & pengeluaran) secara terstruktur, mengikuti prinsip akuntansi standar (double-entry bookkeeping), dengan alur approval berjenjang dan kontrol akses multi-role.

---

## 2. Role & Hak Akses

### 2.1 Struktur Role

| Role                      | Level         | Deskripsi                                                                                   |
| ------------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| **Super Admin**           | Tertinggi     | Pemilik sistem (developer). Data miliknya tidak bisa diubah/dihapus siapa pun.              |
| **Admin**                 | Tinggi        | Mengelola user, role, dan permission. Tidak bisa mengubah/menghapus data milik Super Admin. |
| **Direktur**              | Manajemen     | Approval tertinggi untuk laporan & transaksi besar; approve reopen periode tutup buku.      |
| **Asisten Direktur**      | Manajemen     | Mendukung Direktur, akses laporan luas (detail wewenang menyusul).                          |
| **Sales**                 | Manajemen     | Input transaksi penjualan ke konsumen.                                                      |
| **Purchasing**            | Manajemen     | Input transaksi pembelian dari supplier.                                                    |
| **Kepala Finance**        | Kepala Divisi | Approval tahap 1 untuk transaksi/laporan finance. Akses lebih luas dari staff finance.      |
| **Staff Finance**         | Anggota       | Input transaksi kas masuk/keluar.                                                           |
| **Kepala Accounting**     | Kepala Divisi | Mengelola buku besar, cost center, tutup buku. Akses lebih luas dari staff accounting.      |
| **Staff Accounting**      | Anggota       | Input jurnal, rekonsiliasi data.                                                            |
| **Kepala Internal Audit** | Kepala Divisi | Akses read-only ke seluruh data untuk keperluan audit. Akses lebih luas dari staff audit.   |
| **Staff Internal Audit**  | Anggota       | Akses read-only sesuai penugasan.                                                           |

> Catatan (keputusan): Role "Management" lain **ditunda**. Fase 1 hanya: Super Admin, Admin, Direktur, Asisten Direktur, Kepala Finance, Staff Finance. Sales, Purchasing, Internal Audit ditambahkan di fase berikutnya. Desain permission dibuat **dinamis** (dikelola dari UI Admin/Super Admin, bukan hard-coded) sehingga menambah role baru tidak perlu ubah kode.

### 2.2 Prinsip Permission

- Setiap role punya kombinasi permission: `create`, `read`, `update`, `delete`, `approve`, `export/print` — per modul (transaksi, master data, laporan, dll).
- Kepala divisi otomatis mewarisi semua permission staff-nya + permission tambahan (approval, lihat laporan divisi).
- **Asisten Direktur**: akses semua laporan + approve transaksi level 2, TAPI tidak bisa approve reopen periode dan tidak bisa mengelola user (khusus Direktur/Admin).
- Hanya **Admin** dan **Super Admin** yang bisa membuat role baru & mengatur permission.
- Data yang dibuat Super Admin **tidak bisa diedit/dihapus** oleh Admin maupun role lain.

---

## 3. Alur Approval

### 3.1 Approval Transaksi/Laporan (umum)

```
Staff input transaksi
        ↓
Kepala Finance approve (tahap 1)
        ↓
Direktur approve (tahap 2)
        ↓
Status: Approved → bisa di-print
```

- Jika ditolak di tahap manapun → status `Rejected`, kembali ke staff dengan catatan revisi.
- Setiap approval tercatat: siapa, kapan, status (approve/reject), catatan (opsional).
- **Threshold nominal bersifat dinamis & configurable** (Settings → Approval Thresholds, bukan hardcoded). Default contoh: transaksi < Rp5jt auto-approve; Rp5jt–Rp50jt cukup approve Kepala; > Rp50jt Kepala + Direktur. Semua ambang bisa diubah tanpa deploy.

### 3.2 Approval Reopen Periode Tutup Buku

```
Kepala divisi ajukan reopen periode
        ↓
Direktur approve
        ↓
Periode terbuka sementara (perlu dicatat: siapa yang reopen, kapan, alasan) — **auto re-close setelah 7 hari** (configurable di Settings), atau manual close lebih awal
```

### 3.3 Format Cetak Laporan

Setiap laporan yang dicetak menampilkan blok tanda tangan di bagian bawah:

```
Dibuat Oleh          Disetujui Oleh
_____________        _____________
(Nama staff input)   (Nama approver akhir)
```

---

## 4. Modul Fungsional

| Modul                       | Deskripsi                                            | Fase |
| --------------------------- | ---------------------------------------------------- | ---- |
| Auth & Role Management      | Login, manajemen user/role/permission                | 1    |
| Master Data                 | Chart of Accounts, Customer, Supplier, Cost Center   | 1    |
| Transaksi Kas Manual        | Input pemasukan/pengeluaran manual                   | 1    |
| Buku Besar (General Ledger) | Pencatatan double-entry (debit/kredit)               | 1    |
| Import Data                 | Import massal transaksi & master data (Excel/CSV)    | 2    |
| Cost Center Allocation      | Alokasi biaya ke cost center tertentu                | 2    |
| Approval Workflow           | Alur approval berjenjang (Kepala → Direktur)         | 2    |
| Tutup Buku (Period Closing) | Kunci periode akuntansi                              | 3    |
| Reopen Periode              | Buka kembali periode tertutup dengan approval khusus | 3    |
| Cetak Laporan               | Export/print laporan dengan blok tanda tangan        | 3    |
| Dashboard & Analytics       | Visualisasi cash flow, grafik tren, ringkasan        | 4    |

---

## 5. Skema Database (Draft)

> Ini kerangka tabel inti. Detail kolom akan disesuaikan saat implementasi per fase.

### 5.1 User, Role, Permission

```
users
- id, name, email, password_hash, division_id (nullable), is_active, created_at

divisions
- id, name (Management, Finance, Accounting, Internal Audit)

roles
- id, name, division_id (nullable), level (staff/kepala/direktur/admin/superadmin)

permissions
- id, module (e.g. "transaction", "ledger", "report"), action (create/read/update/delete/approve/print)

role_permissions
- role_id, permission_id

user_roles
- user_id, role_id
```

### 5.2 Master Data Akuntansi

```
chart_of_accounts
- id, code, name, type (asset/liability/equity/revenue/expense), parent_id (nullable, untuk hierarki akun)

customers
- id, name, contact_info, ...

suppliers
- id, name, contact_info, ...

cost_centers
- id, code, name, division_id
```

### 5.3 Transaksi & Buku Besar

```
transactions
- id, type (income/expense/sale/purchase), date, amount, description,
  cost_center_id, created_by (user_id), status (draft/pending/approved/rejected),
  accounting_period_id, source (manual/import)

journal_entries
- id, transaction_id, account_id (FK ke chart_of_accounts), debit, credit, description

approvals
- id, transaction_id (or report_id), approver_id, level (1=kepala, 2=direktur),
  status (approved/rejected), note, approved_at
```

> **Multi-currency (keputusan: DIDUKUNG)**: transaksi menyimpan `currency` (mata uang asli) + `base_amount` (hasil konversi ke IDR) — pola sama seperti app Vite saat ini. Rate disimpan saat transaksi dibuat agar laporan historis konsisten.

### 5.4 Periode & Tutup Buku

```
accounting_periods
- id, start_date, end_date, status (open/closed), closed_by, closed_at

period_reopen_requests
- id, period_id, requested_by, reason, status (pending/approved/rejected),
  approved_by (direktur), approved_at, reopened_until (auto re-close, default +7 hari)
```

### 5.5 Laporan

```
reports
- id, type (cash_flow/income_statement/etc), period_id, generated_by,
  status (draft/approved), approved_by, printed_at
```

---

## 6. Keputusan (pertanyaan terbuka sebelumnya — sudah ditutup)

- [x] **Role "Management" lain**: ditunda. Fase 1 = Super Admin, Admin, Direktur, Asisten Direktur, Kepala Finance, Staff Finance. Role baru ditambahkan via UI permission dinamis, tanpa ubah kode.
- [x] **Permission Asisten Direktur**: terbatas — semua laporan + approve level 2; tidak approve reopen periode; tidak kelola user.
- [x] **Format import (Fase 2)**: per jenis data. Template transaksi mengikuti format app Vite saat ini (`date,type,description,amount,currency,category,client,region,project,department` + `cost_center` opsional); template terpisah untuk customer, supplier, cost center, chart of accounts.
- [x] **Threshold approval**: dinamis & configurable di Settings (default: < Rp5jt auto-approve; Rp5jt–Rp50jt Kepala; > Rp50jt Kepala + Direktur).
- [x] **Multi-currency**: didukung (currency asli + `base_amount` ke IDR).
- [x] **Reopen periode**: auto re-close default 7 hari, configurable, dengan audit log (siapa/kapan/alasan).

---

## 7. Rencana Fase Pembangunan

| Fase             | Fokus                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| **Fase 1 — MVP** | Auth, role dasar, master data, input transaksi manual, buku besar sederhana |
| **Fase 2**       | Import data, cost center, approval workflow                                 |
| **Fase 3**       | Tutup buku, reopen periode, cetak laporan dengan tanda tangan               |
| **Fase 4**       | Dashboard analytics, refinement UI/UX                                       |
