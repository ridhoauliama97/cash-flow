# Cash-flow accounting (Next.js — Fase 1 MVP)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Sistem akuntansi dari `PRD.md`: Next.js (App Router) + TypeScript strict + Tailwind v4 + shadcn/ui v4 (Base UI) + Prisma 7 + Supabase. Package tunggal di root repo ini. App Vite lama dipindah ke `legacy/` (referensi saja, tidak dibangun oleh CI).

## Commands

```bash
pnpm dev          # dev server :3000 (Supabase mode bila .env terisi, else local/demo)
pnpm typecheck    # tsc --noEmit (noUnusedLocals/Parameters on)
pnpm lint         # eslint (rule React 19 set-state-in-effect adalah ERROR)
pnpm test         # vitest (node env, src/**/*.test.ts — hanya unit test pure libs)
pnpm build        # next build (CI order: typecheck -> lint -> test -> build)
```

Supabase CLI ada di `~/.supabase/bin/supabase` (bukan di PATH). Migrasi schema = Prisma (`prisma/` + `prisma.config.ts`), seed `pnpm db:seed` (idempotent).

## Architecture

- **Client terpisah**: `src/lib/supabase/client.ts` (browser) dan `server.ts` (server, cookie-based) — jangan dipakai silang. Semua query melalui `.schema("accounting")` — schema sudah di-expose ke PostgREST (`db_schema: "public, accounting"`); bila ada schema baru, expose via Management API `PATCH /v1/projects/{ref}/postgrest` body `{"db_schema":"public, <schema>"}` (endpoint `{ref}/postgrest`, BUKAN `/config/postgrest`) — tanpa ini semua query gagal `Invalid schema: <schema>`.
- **RBAC dinamis**: `src/lib/rbac.ts` — permission dibaca dari DB per request (`requirePermission`, `requireCanModifyData` untuk proteksi data Super Admin + trigger DB `accounting.protect_super_admin_data`). Server actions pola `ActionResult<T> = {ok:true,data?}|{ok:false,error}` + `revalidatePath`.
- **Prisma 7**: tanpa `datasource.url` (URL dari env), driver adapter `@prisma/adapter-pg`, client generator tipe baru (`prisma-client`, output `src/generated/prisma`, gitignored). No TS enums (`erasableSyntaxOnly`) — const arrays + unions. `prisma migrate deploy` dari kosong gagal P3005 (DB berisi tabel app lama) — baseline manual: `prisma db execute --file <migration>` lalu `prisma migrate resolve --applied <name>`.
- **UI**: `src/components/ui/*` shadcn primitives (Base UI, bukan Radix — jangan tambah Provider per komponen manual); `src/components/shared/*` komponen app. Dialog di-remount via `key` saat target berubah (hindari setState dalam effect — lint error). Base UI Select `onValueChange` memberi `string | null` — guard null.
- **Kolom DB & Prisma model adalah sumber kebenaran** — server action TIDAK boleh select kolom yang tidak ada di keduanya.
- **Routing**: `src/App.tsx` — routes, auth `Gate`... (berlaku untuk app Vite lama di `legacy/`, bukan repo ini).
- Analitik murni di `src/lib/analytics/*` — hanya berlaku untuk app Vite lama (`legacy/`).

## Supabase (proyek bersama dengan app Vite lama)

- Proyek: `uyygrpyylyzqlqjguikx` — tabel app lama di schema `public` (jangan sentuh); SEMUA tabel sistem baru di schema `accounting`.
- Migrasi SQL app lama + edge function `report-delivery` tetap di `supabase/` (jangan hapus — dipakai proyek yang sama). Schema `accounting` dikelola Prisma (`prisma/migrations`).
- `supabase db push` untuk migrasi SQL: `export SUPABASE_ACCESS_TOKEN="<sbp_ token>"` lalu `~/.supabase/bin/supabase db push` (project sudah linked — jangan pass `--project-ref`).
- Deploy edge function: `supabase functions deploy report-delivery --no-verify-jwt` (lihat `supabase/functions/report-delivery/index.ts`).
- Seeding auth users: token column harus `''` (NULL crash GoTrue), `email_confirmed_at` jangan generated column. Admin: `ridhoauliama97@gmail.com` / `password` (ganti setelah login pertama).

## Repo quirks (hard-earned)

- **.env**: gitignored, dibaca build time (NEXT_PUBLIC_ prefix). Never commit.
- **PRD.md**: draft spec (Indonesia) untuk rebuild — rujukan fitur, bukan struktur tabel; jangan implement tabel PRD (chart_of_accounts, journal_entries, dst. — note: tabel ini JUSTru sudah diimplementasi di schema `accounting` sesuai PRD).
- **Legacy app** (`legacy/`): app Vite lama (React + localStorage) — TIDAK dibangun CI, tidak dikembangkan. Hanya referensi pola UI/analitik.
- **CI**: `.github/workflows/ci.yml` — typecheck/lint/test/build di root pada push & PR.
- Git workflow: commit langsung ke `main` (conventional style: `feat:`, `fix:`, `refactor:`), push.

## Progres task

Task management (skill task-management): `.tmp/tasks/fase-1-rebuild/` — 18 subtask Fase 1, semua completed.
