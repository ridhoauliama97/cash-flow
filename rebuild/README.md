# Cash Flow — Rebuild (Next.js)

Fase 1 MVP rebuild sistem akuntansi (lihat `PRD.md` di root repo). Package **standalone** di subfolder ini — app Vite lama di root repo tidak diubah.

Stack: Next.js (App Router) + TypeScript strict + Tailwind v4 + shadcn/ui v4 (Base UI) + Prisma 7 + Supabase.

## Commands (pnpm only — `bun` gagal menulis lockfile di sebagian filesystem)

```bash
pnpm dev          # dev server :3000
pnpm typecheck    # tsc --noEmit (noUnusedLocals/Parameters on)
pnpm lint         # eslint
pnpm test         # vitest (node env, src/**/*.test.ts)
pnpm build        # next build (CI order: typecheck -> lint -> test -> build)
```

## Setup Supabase

1. Copy `.env.example` ke `.env`, isi `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API). Tanpa keduanya, app berjalan di **mode local** (demo, localStorage).
2. Client terpisah: `src/lib/supabase/client.ts` (browser) dan `src/lib/supabase/server.ts` (server, cookie-based) — jangan dipakai silang.
3. Supabase CLI ada di `~/.supabase/bin/supabase` (tidak ada di PATH):

```bash
export SUPABASE_ACCESS_TOKEN="<sbp_ token>"   # token tersimpan di ~/.supabase/access-token
~/.supabase/bin/supabase link --project-ref uyygrpyylyzqlqjguikx
```

> Project sudah ter-link (ref `uyygrpyylyzqlqjguikx`, project yang sama dengan app Vite lama). Saat `db push`, jangan beri flag `--project-ref` — akan error.

> **Koneksi DB**: selalu pakai pooler `aws-0-ap-southeast-1.pooler.supabase.com:5432` — host direct `db.<ref>.supabase.co` hanya resolve IPv6 (gagal `P1001` di jaringan tanpa IPv6).

## Struktur (berjalan)

```
src/
├── app/             # App Router (layout, halaman)
├── components/ui/   # shadcn/ui primitives (Base UI, bukan Radix)
├── lib/
│   ├── supabase/    # client.ts (browser) + server.ts (server cookies)
│   └── store/       # mode resolver (local vs supabase) + localStorage adapter
└── generated/prisma # output prisma generate (gitignored)
```

## Prisma 7

- Generator tipe baru `prisma-client` → output `src/generated/prisma` (gitignored).
- Build scripts Prisma di-approve via `allowBuilds` di `pnpm-workspace.yaml` — jangan dihapus.
- `pnpm-workspace.yaml` root repo TIDAK boleh dimodifikasi (bukan workspace).
- **Semua tabel rebuild ada di schema `accounting`** (bukan `public`) — `public` dipakai app Vite lama di project Supabase yang sama (`transactions`, `invoices`, `bills`, dll). Jangan membuat tabel di `public`.
- `@@check` (constraint) tidak didukung Prisma 7 → check constraints ditulis manual sebagai SQL di akhir migration.
- `prisma migrate deploy` dari kosong bisa gagal `P3005` (database berisi tabel app lama) → aplikasikan via `prisma db execute --file <migration>` lalu `prisma migrate resolve --applied <name>` (sudah tercatat, cukup untuk kasus baru yang serupa).
