# AGENTS.md

Cash-flow dashboard: Vite + React 19 + TS (strict) + Tailwind v4 + Recharts v3, shadcn/ui-style components. Single package, pnpm only (`bun` fails to write the lockfile on some filesystems).

## Commands

```bash
pnpm exec tsc -b        # typecheck (noUnusedLocals/Parameters on — unused imports FAIL)
pnpm exec vitest run    # unit tests (node env, only src/**/*.test.ts)
pnpm exec vitest run src/lib/analytics/aging.test.ts   # single test file
pnpm lint               # oxlint (only rules-of-hooks error; many pre-existing warnings — don't chase them)
pnpm build              # tsc -b + vite build (CI order: tsc -> lint -> vitest -> build)
pnpm dev                # dev server on :5173
```

Supabase CLI is at `~/.supabase/bin/supabase` (not on PATH). Migrations:

```bash
export SUPABASE_ACCESS_TOKEN="<sbp_ token>"
~/.supabase/bin/supabase db push   # project is linked (uyygrpyylyzqlqjguikx); do NOT pass --project-ref, it errors
```

## Architecture

- **Single source of truth**: `src/context/app-context.tsx` `DataProvider`/`useApp()` — all data, CRUD, rates state. Pages never call the store directly.
- **Store pattern**: `Store` interface in `src/lib/store/index.ts`; two implementations — `local.ts` (localStorage key `cashflow:db:v1`, demo mode) and `supabase.ts`. Mode is chosen **once at module load** from `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. Any new entity must be added to BOTH stores + the `Database` interface in `src/types/index.ts` + `app-context.tsx` + `demo.ts`.
- **Data loading**: DataProvider loads on mount AND on Supabase auth changes (`SIGNED_IN` → full reload with a version guard, `SIGNED_OUT` → state cleared). Login must not require a manual refresh — don't regress this.
- **Analytics layer**: pure functions in `src/lib/analytics/*.ts` with colocated `*.test.ts` — the only unit-tested code. Keep pure (no React/DOM); keep business math here, not in pages.
- **Currency**: amounts store the original currency + `baseAmount` converted to `homeCurrency` at build time via `convert()` in `src/lib/currency.ts`. Rates come from currencyapi with static fallback.
- **Types**: domain types in `src/types/index.ts`. Transaction types are `"revenue" | "expense"` (NOT "income"). `erasableSyntaxOnly` is on — no TS enums; use `const` arrays + union types (see `CURRENCIES`, `TRANSACTION_TYPES`).
- **UI**: `src/components/ui/*` are shadcn primitives; `src/components/shared/*` are app components. `TooltipProvider` is mounted once in `src/main.tsx` — don't add per-component providers.
- **Routing**: `src/App.tsx` — routes, auth `Gate`, lazy-loaded pages.

## Repo quirks (hard-earned)

- **Seeding auth users**: manually inserted `auth.users` rows crash GoTrue with NULL token columns — all token columns must be `''` strings, and `email_confirmed_at` must not be set as a generated column. Migrations 0002–0004 document this. Seeded admin: `ridhoauliama97@gmail.com` / `password` (change after first login).
- **Migration workflow**: feature = SQL migration in `supabase/migrations/` (0001_init, 0005_bills, …) + type + both stores + context + demo data + tests. Push with the CLI above, then verify via the Supabase Management API SQL query endpoint if needed.
- **CSV import** (`src/lib/csv.ts`): PapaParse; auto header detection + user column mapping + dedupe against existing rows (signature: date+description+amount+currency). Dates support US/EU formats. README's CSV section is stale (columns `account`/`income` no longer exist).
- **Saved views** (`src/hooks/use-saved-views.ts`): persisted in localStorage `cash-flow:saved-views`, integrated in `FilterBar`.
- **Demo data** (`src/lib/demo.ts`): deterministic (mulberry32), window = last 365 days ending today; demo reset only in local mode.
- **.env**: gitignored, read only at build time (VITE_ prefix). Never commit it or any Supabase tokens.
- Git workflow: direct commits to `main` (conventional style: `feat:`, `fix:`, `refactor:`), push; CI runs typecheck/lint/tests/build on push and PRs.
