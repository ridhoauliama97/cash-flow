# Page Build Contract — Cash Flow Dashboard

Build React pages for a Vite + React 19 + TS + Tailwind v4 + shadcn/ui app.
**READ THIS ENTIRE FILE FIRST.** All pages live in `src/pages/`. App.tsx already wires routing; keep the exact default export names below.

## Golden rules
- Functional components + hooks. No classes. No `any`.
- Pure logic in `src/lib/analytics/*` — NEVER import recharts into lib files. Pages compose.
- Import order: external packages → @/types → @/lib → @/components → @/hooks/@/context.
- `const` everywhere; early returns; small components (<150 lines per file if possible).
- Use existing components — do not reinvent. Use `cn()` from `@/lib/utils` for conditional classes.
- Dark mode: use shadcn tokens only (`bg-card`, `text-muted-foreground`, `border`, `bg-background`, etc). Never hardcode colors.
- Every data view must handle empty state (EmptyState component).
- Numbers shown in home currency: `formatMoney(v, homeCurrency)`, compact variant `formatMoney(v, homeCurrency, true)`.
- Lucide icons: `import { X } from "lucide-react"` (lucide-react v1, named exports).

## Data access — `useApp()` from `@/context/app-context`
```ts
const { loading, profile, transactions, invoices, budgets, schedules, rates, ratesStatus,
        homeCurrency, apiKey, setApiKey,
        addTransactions, updateTransaction, deleteTransactions,
        addInvoice, updateInvoice, deleteInvoices,
        upsertBudgets, deleteBudgets, upsertSchedule, deleteSchedule,
        saveProfile, refreshRates, resetDemo, convertAmount } = useApp()
```
- `transactions: Transaction[]` — fields: id, date (ISO), type: "revenue"|"expense", description, amount, currency, baseAmount (home currency), category, product?, client?, region?, department?, project?, paymentMethod?, notes?, createdAt
- `invoices: Invoice[]` — id, number, client, issueDate, dueDate, amount, currency, baseAmount, paidAmount, status: "unpaid"|"partial"|"paid", project?
- `profile` — name, company, homeCurrency, openingBalance (number, home currency)
- `addTransactions(drafts: TransactionDraft[])` computes baseAmount from current rates automatically.
- `addInvoice(draft: InvoiceDraft)` — InvoiceDraft = Omit<Invoice, "id"|"baseAmount"|"createdAt"|"status"|"paidAmount"> (status/paidAmount set by the store).

## Analytics library (pure functions)
From `@/lib/analytics/...`:
- `filter.ts`: `applyFilters(txs, filters)`, `effectiveTransactions(txs, invoices, filters)` (accrual-aware — use this for KPI/chart calcs), `dimensionValues(txs, "product"|"client"|"region"|"department"|"project")`
- `periods.ts`: `getPeriodRange(key: PeriodKey, today?)`, `getPreviousRange(range)`, `monthBuckets(range)`, `dayBuckets(range)`, `isInRange(date, range)`. Types: `PeriodRange {from, to}`. PeriodKey from `@/types`: "7d"|"30d"|"90d"|"this_month"|"this_quarter"|"this_year".
- `kpis.ts`: `computeKpis({current, previous, openingBalance, days}) → {revenue, expenses, net, margin, cashPosition, avgDailyExpense, runwayDays, revenueGrowth, expenseGrowth, netGrowth}`, `sumByType(txs)`, `byMonth(txs) → MonthPoint[] {key,label,revenue,expenses,net}`, `byDimension(txs, "category"|"product"|"client"|"region"|"department"|"project", topN?) → {name, value, count}[]`, `dailyBalances(txs, openingBalance, from, to) → DailyPoint[] {date,inflow,outflow,balance}`, `shares(points, total)`
- `aging.ts`: `agingBuckets(invoices, todayISO()) → {buckets: [{key,label,invoices,total}], totalOutstanding, totalOverdue, overdueCount, atRisk}`, `overdueDays(inv, today)`, `outstandingByClient(invoices)`
- `waterfall.ts`: `cashFlowWaterfall(txs, openingBalance) → WaterfallPoint[] {name,label,value,isTotal,range:[bottom,top]}`, `weeklyPattern(txs)`
- `forecast.ts`: `forecastCashFlow({history: MonthPoint[], currentBalance, months?}) → ForecastPoint[] {key,label,revenue,expenses,net,balance,isForecast}`, `confidenceBand(point)`
- `compare.ts`: `budgetVsActual(transactions, budgets, "YYYY-MM") → BudgetLine[] {category,budget,actual,variance,used}`, `totalBudget(budgets, month)`, `totalActual(transactions, month)`, `compare(current, previous) → {current,previous,absolute,growth}`
- `reports.ts`: `buildProfitLoss(txs, range, currency, company)`, `balanceSheetData(txs, invoices, openingBalance, asOf)`, `buildBalanceSheet(data, asOf, currency, company)`, `buildCashFlowStatement(txs, range, openingBalance, currency, company)` → FinancialReport {title, periodLabel, currency, company, generatedAt, sections: [{title, rows: [{label, amount|null, indent?}]}], totals}. Export: `downloadReportCsv(report)`, `downloadReportPdf(report)`, `downloadFile(content, filename)`, `reportToCsv(report)`.

## Formatting — `@/lib/format`
`formatMoney(amount, currency, compact?)`, `formatSigned(amount, currency, compact?)`, `formatPercent(value)`, `formatNumber(value)`, `formatDate(iso)`, `formatDateShort(iso)`, `formatMonthKey("YYYY-MM")`, `formatDateTime(iso)`, `formatDurationDays(n)`

## Shared components (use, don't recreate)
- `@/components/shared/page-header` → `<PageHeader title description? actions?>`
- `@/components/shared/kpi-card` → `<KpiCard label value icon={LucideIcon} trend?={{value, positive, neutral?}} sub? hint? className?>` and `<StatRow label value icon?>`
- `@/components/shared/empty-state` → `<EmptyState title? description? onAction? actionLabel? icon?="search"|"warning">`
- `@/components/shared/period-select` → `<PeriodSelect value={PeriodKey} onChange>` (state lives in the page)
- `@/components/shared/filter-bar` → `<FilterBar filters onChange options={{categories,products,clients,regions,departments,projects}} showType? compact?>` — filters: DashboardFilters (see @/types, use EMPTY_FILTERS as base)
- `@/components/shared/transactions-table` → `<TransactionsTable transactions compact?>` (has edit/delete built in)
- `@/components/shared/transaction-form-dialog` → `<TransactionFormDialog open onOpenChange transaction? defaultType?>`
- `@/components/shared/invoice-form-dialog` → `<InvoiceFormDialog open onOpenChange invoice?>`
- `@/components/shared/currency-select` → `<CurrencySelect value onChange>`
- Charts in `@/components/charts/`:
  - `<AreaTrend data={MonthPoint[]} currency height?>` (revenue/expenses over time)
  - `<DonutChart data={{name,value}[]} currency centerLabel? centerValue?>`
  - `<WaterfallChart data={WaterfallPoint[]} currency height?>`
  - `<ForecastChart data={ForecastPoint[]} currency height?>`
  - `<BalanceChart data={DailyPoint[]} currency height?>`
  - `<BarCompare data={{name, actual, budget?}[]} currency height? actualLabel? budgetLabel?>`
- UI primitives: `@/components/ui/*` (Card, Button, Badge, Tabs, Table, Dialog, Select, DropdownMenu, Switch, Progress, Separator, Skeleton, Tooltip, ScrollArea, Alert, Input, Label, Textarea, Checkbox, Sheet, Popover, Avatar, AlertDialog, sonner via `import { toast } from "sonner"`)

## Card layout pattern
```tsx
<Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>…</CardTitle></CardHeader>
<CardContent>…</CardContent></Card>
```

## Styling conventions
- Page wrapper: `<div className="space-y-6">` (PageHeader included)
- Responsive grids: `grid gap-4 sm:grid-cols-2 lg:grid-cols-4` etc.
- `mb-5` FilterBar spacing; KPI grid directly below header.
- Use `toSorted`, `Array.from(new Set(...))`, never mutate arrays/state.

## Page specs
### dashboard.tsx → `export function DashboardPage()`
- PeriodSelect (default "this_month") + FilterBar (options from dimensionValues over ALL transactions)
- 4 KpiCards: Revenue, Expenses, Net income, Cash position — each with trend vs previous range (computeKpis with current = effectiveTransactions filtered to range, previous = same filters + getPreviousRange). Margin/runway shown via `sub`.
- AreaTrend (12 months of byMonth(effectiveTransactions)) in a Card
- Row: DonutChart top 5 expense categories (Card) + "Needs attention" Card: top 3 atRisk invoices from agingBuckets(invoices, todayISO()) with overdue badge; + recent 6 transactions (TransactionsTable compact) — or a "Recent activity" Card.
- Quick actions: "Add transaction" (TransactionFormDialog), "View reports" link (react-router `useNavigate`/`Link`).

### revenue.tsx → `export function RevenuePage()`
- PeriodSelect + FilterBar (type locked to revenue: set filters.type="revenue" before computing)
- KpiCards: Revenue, Growth % (revenueGrowth), Avg transaction (revenue/count), Top client value
- AreaTrend Card (12 months), then grid: DonutChart revenue by product, DonutChart revenue by client, DonutChart revenue by region (top 6, centerValue = total)
- Top clients table Card (client, count, total, share %) using byDimension(txs,"client")

### expenses.tsx → `export function ExpensesPage()`
- PeriodSelect + FilterBar (type locked to expense)
- KpiCards: Expenses, Budget usage % (this month vs totalBudget), Avg daily expense, Net margin
- DonutChart expenses by category Card
- Budget vs actual: month selector (Select of available budget months from budgets) → BarCompare(budgetVsActual(transactions, budgets, month)) Card + Progress rows per category (used %)

### cash-flow.tsx → `export function CashFlowPage()`
- PeriodSelect + FilterBar
- KpiCards: Net cash flow, Opening balance, Closing balance, Runway days (avgDailyExpense)
- WaterfallChart Card (cashFlowWaterfall(txs, openingBalance))
- BalanceChart Card (dailyBalances(txs, openingBalance, from, to)) — from/to from the selected period range
- Weekly pattern Card: BarCompare with only `actual` (name=day) or simple list of StatRow

### receivables.tsx → `export function ReceivablesPage()`
- Header actions: "Add invoice" (InvoiceFormDialog)
- KpiCards: Total outstanding, Overdue, Overdue count, Collection rate (paid/(paid+outstanding))
- Aging summary Card: 5 buckets (Current, 1–30, 31–60, 61–90, 90+) with amounts + Progress bar showing proportion; each bucket lists its invoices (number, client, due date, amount, overdue badge)
- Outstanding by client Card: StatRow per client (oldest due date, total)
- Invoices table Card (all invoices): number, client, issue date, due date, days overdue badge (overdueDays), amount (formatMoney in invoice currency), baseAmount, status Badge, actions (dropdown: "Record payment" → dialog to set paidAmount/status via updateInvoice, "Delete")
- Empty state when no invoices.

### transactions.tsx → `export function TransactionsPage()`
- Header action: "Add transaction" (TransactionFormDialog)
- FilterBar (all dims, full width) + TransactionsTable (full)
- Maybe stats strip above: total revenue / expenses / net for filtered set (formatSigned)

### forecast.tsx → `export function ForecastPage()`
- KPI cards: Current balance, Projected 12-month balance (last forecast point), Projected net, Confidence note
- ForecastChart Card: combine historical byMonth(effectiveTransactions) (add isForecast:false) + forecastCashFlow({history, currentBalance: profile.openingBalance + sumByType(all).net, months:12}) — chart reads keys net/forecastNet/balance/forecastBalance so map history → {key,label,net,balance?} style: simpler — pass historical MonthPoints with net + balance accumulated, plus forecast points (ForecastChart maps dataKey names net, forecastNet, balance, forecastBalance — provide balance on history points too by accumulating).
- Forecast table Card: month, revenue, expenses, net, projected balance, band (confidenceBand → low–high range string)
- Info Alert: methodology (trend + seasonality from last 12 months; not financial advice)

### reports.tsx → `export function ReportsPage()`
- Report type selector (Tabs: P&L | Balance Sheet | Cash Flow) + PeriodSelect (P&L & Cash Flow) or date input (Balance Sheet asOf default today)
- Preview Card: report title, company, period, sections with indented rows, totals bolded (render FinancialReport)
- Actions: "Download CSV" (downloadReportCsv), "Download PDF" (downloadReportPdf), "Print" (window.print() — the page root gets class `print-area`, nav hidden via .no-print already)
- Build with: buildProfitLoss(transactions, range, homeCurrency, company), balanceSheetData(transactions, invoices, profile.openingBalance, asOf) → buildBalanceSheet, buildCashFlowStatement(transactions, range, profile.openingBalance, homeCurrency, company)

### import.tsx → `export function ImportPage()`
- Card "Import CSV": file input (accept .csv) + textarea paste + "Load template" (csvTemplate from @/lib/csv) + "Parse" button → parseTransactionsCsv(text)
- Preview: rows count, skipped count, errors list (Alert), preview table of first 10 parsed rows (date, type, description, amount, currency, category, client)
- Import button: addTransactions(parsed.transactions) → toast.success; then show success state
- Card "Demo data": demoSummary() from @/lib/demo; button "Reset demo data" (resetDemo from useApp, local mode only)

### schedules.tsx → `export function SchedulesPage()`
- Header action: "New schedule"
- List Cards per schedule: name, frequency Badge, format Badge, recipients, enabled Switch (upsertSchedule), last sent (formatDateTime), next run; actions: edit (dialog), delete (AlertDialog confirm)
- Create/edit dialog: name, frequency Select (daily/weekly/monthly), format Select (pdf/csv/both), recipients Input (comma emails), enabled Switch
- Info Alert: demo delivery runs while the app is open; production uses the Supabase edge function.

### settings.tsx → `export function SettingsPage()`
- Profile Card: name, company, homeCurrency (CurrencySelect), openingBalance (Input number) → Save (saveProfile) with toast
- Appearance Card: theme buttons Light/Dark/System (useTheme from @/hooks/use-theme — setTheme)
- Exchange rates Card: status text (ratesStatus), last fetch (rates.fetchedAt), Refresh button (refreshRates); optional API key Input (apiKey/setApiKey) with hint about freecurrencyapi
- Data Card (local mode only): reset demo button (resetDemo), mode info; supabase mode: hint about cloud storage
- Danger zone: "Delete all transactions" (deleteTransactions(all ids)) with AlertDialog confirm

## Verification
After writing, run: `./node_modules/.bin/tsc -b` — must pass with ZERO errors. Fix your own type errors. Do NOT run vite build (other agents' files may be mid-flight). Do not modify files outside src/pages/ (except nothing — keep it to your pages). Do not edit App.tsx.
