# Cash Flow Dashboard

A self-hosted financial analytics dashboard for solopreneurs and small businesses: revenue, expenses, cash flow, receivables aging, multi-currency support, forecasts, and scheduled PDF reports.

Runs out of the box with **deterministic demo data** (no configuration required). Optional [Supabase](https://supabase.com) integration adds auth + cloud persistence.

## Features

- **Dashboard** — KPIs (revenue, expenses, net, cash balance) with period-over-period deltas and trend charts
- **Revenue analytics** — monthly trend, revenue by category/currency, top clients
- **Expense analytics** — category breakdown, budget vs actual, monthly trend
- **Cash flow** — waterfall chart, net cash position, weekly spending pattern
- **Receivables aging** — 5 aging buckets (current / 30 / 60 / 90 / 90+ days), overdue amounts, per-client breakdown
- **Bills (AP)** — vendor bills tracker with the same lifecycle (unpaid / partial / paid) and aging as receivables
- **Profitability** — MRR/ARR, burn rate, monthly profit & margin, dimension breakdown (client/region/project/department)
- **Multi-currency** — 7 currencies (USD, EUR, GBP, JPY, AUD, SGD, IDR), home currency configurable (default **IDR**), live rates via [currencyapi.com](https://currencyapi.com) with offline fallback
- **Transactions** — full CRUD, search, filters (category, type, date range, amount), CSV export
- **CSV import** — bulk import with automatic category inference, header mapping, and template download
- **Global search & notifications** — Cmd+K command palette, in-app notification center
- **Saved views** — persist filter combinations per page
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
| `VITE_CURRENCY_API_KEY` | API key from currencyapi.com for live exchange rates (otherwise static fallback rates are used). Can also be entered at runtime in Settings → Exchange Rates. |

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

The import page offers a **template download** (matches the expected columns exactly). Required columns: `date`, `type`, `amount`, `currency`. Everything else is optional:

```
date,type,description,amount,currency,category,client,region,project,department
2026-08-01,revenue,"Monthly retainer — Acme Inc",2500,USD,"Client Services",Acme,US,"Website Retainer",Product
2026-08-03,expense,"Figma subscription",15,USD,"Software & Subscriptions",,,,Engineering
```

- `type`: `revenue` | `expense`
- `currency`: `IDR` | `USD` | `EUR` | `GBP` | `JPY` | `AUD` | `SGD`
- `category`: optional — inferred automatically from the description when missing
- `client`/`region`/`project`/`department`: optional dims (included in reports)
- `amount`: numeric; decimals only for non-IDR currencies
- `date`: `YYYY-MM-DD` (US/EU formats also auto-detected)

## Project Structure

```
src/
├── components/
│   ├── charts/      # Recharts wrappers (area, donut, waterfall, forecast, balance, compare…)
│   ├── layout/      # sidebar, topbar, mode badge
│   ├── shared/      # KPI card, filter bar, currency select, form dialogs, transactions table, global search, notification menu
│   └── ui/          # shadcn/ui primitives
├── context/         # DataProvider + useApp() (all data/CRUD/rates state)
├── hooks/           # theme, notifications, saved views, schedule delivery
├── lib/
│   ├── analytics/   # pure, unit-tested analytics (KPIs, aging, waterfall, forecast, compare…)
│   ├── store/       # local (demo) + supabase stores, resolver
│   ├── currency.ts  # rates, conversion, fallback rates
│   ├── csv.ts       # parse + category inference
│   ├── demo.ts      # deterministic demo dataset
│   ├── reports.ts   # P&L / balance sheet / cash flow + CSV/PDF export
│   ├── format.ts    # money/date/number formatting
│   └── utils.ts
├── pages/           # 12 routed pages + login
├── types/           # domain types, filters, currencies
└── App.tsx          # routes, auth gate, lazy-loaded pages
```

## Testing

```bash
pnpm exec vitest run
```

100 unit tests cover the pure analytics layer: periods, filters/accrual, KPIs, aging buckets, waterfall, forecasting, profitability, MRR/burn, comparisons, notifications, saved views, currency conversion, and CSV parsing.
