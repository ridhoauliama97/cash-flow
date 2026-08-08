<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# rebuild/ (app Next.js — Fase 1 MVP)

Rebuild sistem akuntansi dari PRD.md (root repo): Next.js + Supabase + Prisma + shadcn/ui.
Package STANDALONE di subfolder `rebuild/` — root repo masih app Vite (di biarkan utuh).

- Komandi: `pnpm dev` (:3000), `pnpm build` (next build), `pnpm lint` (eslint), `pnpm typecheck` (tsc --noEmit), `pnpm exec vitest run`
- Progres task: `.tmp/tasks/fase-1-rebuild/` di root repo (skill task-management)
- Prisma client generator tipe baru (`prisma-client`, output `src/generated/prisma`) — jangan downgrade ke gaya lama tanpa alasan
- shadcn/ui v4 memakai `@base-ui/react` (bukan Radix) — jangan menambah Provider per komponen secara manual tanpa cek pola yang ada
- **Schema `accounting` sudah di-expose ke PostgREST** (`db_schema: "public, accounting"`). Bila schema baru dibuat, expose via Management API: `PATCH https://api.supabase.com/v1/projects/{ref}/postgrest` body `{"db_schema":"public, <schema>"}` (endpoint `{ref}/postgrest`, BUKAN `/config/postgrest`). Tanpa ini semua query via supabase-js gagal `Invalid schema: <schema>`.
- Kolom DB dan Prisma model adalah sumber kebenaran — server action TIDAK boleh select kolom yang tidak ada di keduanya (contoh: `permissions.description` tidak pernah ada → jangan dipakai).

