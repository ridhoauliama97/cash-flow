# Cash Flow Dashboard

A self-hosted financial analytics dashboard for solopreneurs and small businesses: revenue, expenses, cash flow, receivables aging, multi-currency support, forecasts, and scheduled PDF reports.

Runs out of the box with **deterministic demo data** (no configuration required). Optional [Supabase](https://supabase.com) integration adds auth + cloud persistence.

## Features

- **Dashboard** — KPIs (revenue, expenses, net, cash balance) with period-over-period deltas and trend charts
- **Revenue analytics** — monthly trend, revenue by category/currency, top clients
- **Expense analytics** — category breakdown, budget vs actual, monthly trend
- **Cash flow** — waterfall chart, net cash position, weekly spending pattern
- **Receivables aging** — 5 aging buckets (current / 30 / 60 / 90 / 90+ days), overdue amounts, per-client breakdown
- **Multi-currency** — 7 currencies (USD, EUR, GBP, JPY, AUD, SGD, IDR), home currency configurable (default **IDR**), live rates via [freecurrencyapi](https://freecurrencyapi.com) with offline fallback
- **Transactions** — full CRUD, search, filters (category, type, date range, amount), CSV export
- **CSV import** — bulk import with automatic category inference and template download
- **Forecast** — 90-day trend + seasonality projection with confidence band
- **Reports** — Profit & Loss, Balance Sheet, Cash Flow Statement with CSV/PDF export
- **Schedules** — recurring report delivery (demo mode shows a delivery log; with Supabase, paired with the `report-delivery` edge function)
- **Dark mode** — light/dark theme toggle, persisted

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | React 19 + TypeScript (strict) + Vite |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix UI, neutral palette) |
| Charts | Recharts v3 |
| Backend (optional) | Supabase (Postgres + Auth + Edge Functions) |
| CSV/PDF | PapaParse + jsPDF + autotable |
| Routing / Theme | React Router v7 / next-themes |
| Testing | Vitest (pure analytics logic) |

## Getting Started

> Note: `bun install` fails on some filesystems (EINVAL writing the lockfile) — use **pnpm**.

```bash
pnpm install
pnpm dev        # start dev server
pnpm build      # typecheck + production build
pnpm lint       # oxlint
```

Then open http://localhost:5173 — the app boots with demo data immediately.

## Environment Variables

Copy the following into a `.env` file at the project root (or your hosting provider's env settings). All are **optional** — the app works fully without them:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL. When set (with the anon key), the app switches from local demo data to the cloud database and enables auth. |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable API key. |
| `VITE_FREECURRENCY_API_KEY` | API key from freecurrencyapi.com for live exchange rates (otherwise static fallback rates are used). Can also be entered at runtime in Settings → Exchange Rates. |

The frontend only ever reads `VITE_`-prefixed variables at build time.

## Supabase Setup (optional)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the migration: `supabase/migrations/0001_init.sql` — creates `profiles`, `transactions`, `invoices`, `budgets`, `report_schedules` (with RLS) plus a trigger that provisions a profile row on signup.
3. Set the two `VITE_SUPABASE_*` env vars and rebuild.
4. **Scheduled reports** (optional): deploy the edge function so schedules send email reports:
   ```bash
   supabase functions deploy report-delivery --no-verify-jwt
   ```
   Configure the cron invocation (e.g. via `pg_cron` on Supabase or an external scheduler) and set the `REPORT_MAIL_FROM` secret.
5. Create the first user via the login screen — the trigger creates their profile automatically.

## CSV Import Format

The import page offers a **template download** (matches the expected columns exactly). Minimal required columns:

```
date,type,amount,currency,category,description,account
2026-08-01,income,5000000,IDR,Sales,Custom web app invoice,Operating
```

- `type`: `income` | `expense`
- `currency`: `IDR` | `USD` | `EUR` | `GBP` | `JPY` | `AUD` | `SGD`
- `category`: optional — inferred automatically from the description when missing
- `amount`: numeric; decimals only for non-IDR currencies
- `date`: `YYYY-MM-DD`

## Project Structure

```
src/
├── components/
│   ├── charts/      # Recharts wrappers (area, donut, waterfall, forecast, balance, compare)
│   ├── layout/      # sidebar, topbar, mode badge
│   ├── shared/      # KPI card, filter bar, currency select, form dialogs, transactions table
│   └── ui/          # shadcn/ui primitives
├── context/         # DataProvider + useApp() (all data/CRUD/rates state)
├── hooks/           # theme, schedule delivery
├── lib/
│   ├── analytics/   # pure, unit-tested analytics (KPIs, aging, waterfall, forecast, compare…)
│   ├── store/       # local (demo) + supabase stores, resolver
│   ├── currency.ts  # rates, conversion, fallback rates
│   ├── csv.ts       # parse + category inference
│   ├── demo.ts      # deterministic demo dataset
│   ├── reports.ts   # P&L / balance sheet / cash flow + CSV/PDF export
│   ├── format.ts    # money/date/number formatting
│   └── utils.ts
├── pages/           # 11 routed pages + login
├── types/           # domain types, filters, currencies
└── App.tsx          # routes, auth gate, lazy-loaded pages
```

## Testing

```bash
./node_modules/.bin/vitest run
```

61 unit tests cover the pure analytics layer: periods, filters/accrual, KPIs, aging buckets, waterfall, forecasting, comparisons, currency conversion, and CSV parsing.
