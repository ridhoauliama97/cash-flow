import { useMemo, useState } from "react"
import { Download, FileText, Printer } from "lucide-react"
import type { PeriodKey } from "@/types"
import { useApp } from "@/context/app-context"
import { getPeriodRange } from "@/lib/analytics/periods"
import { balanceBefore } from "@/lib/analytics/kpis"
import { formatMoney } from "@/lib/format"
import {
  balanceSheetData,
  buildBalanceSheet,
  buildCashFlowStatement,
  buildProfitLoss,
  downloadReportCsv,
  downloadReportPdf,
  type FinancialReport,
} from "@/lib/reports"
import { cn, todayISO } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { PeriodSelect } from "@/components/shared/period-select"

type ReportTab = "pnl" | "balance" | "cashflow"

export function ReportsPage() {
  const { profile, transactions, invoices, homeCurrency } = useApp()
  const [tab, setTab] = useState<ReportTab>("pnl")
  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month")
  const [asOf, setAsOf] = useState(todayISO)

  const range = useMemo(() => getPeriodRange(periodKey), [periodKey])

  const report = useMemo<FinancialReport | null>(() => {
    if (!profile) return null
    if (tab === "pnl") {
      return buildProfitLoss(transactions, range, homeCurrency, profile.company)
    }
    if (tab === "balance") {
      const data = balanceSheetData(transactions, invoices, profile.openingBalance, asOf)
      return buildBalanceSheet(data, asOf, homeCurrency, profile.company)
    }
    // Cash flow statement: opening balance is the cash balance at period start,
    // not the account inception balance.
    const periodStart = balanceBefore(transactions, range.from, profile.openingBalance)
    return buildCashFlowStatement(transactions, range, periodStart, homeCurrency, profile.company)
  }, [tab, range, asOf, profile, transactions, invoices, homeCurrency])

  if (!profile || !report) return null

  const hasRows = report.sections.some((s) => s.rows.length > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Export"
        description="Generate P&L, balance sheet and cash flow statements from your transactions."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => downloadReportCsv(report)}>
              <Download className="size-3.5" />
              Download CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadReportPdf(report)}>
              <FileText className="size-3.5" />
              Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-3.5" />
              Print
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as ReportTab)}>
          <TabsList>
            <TabsTrigger value="pnl">P&L</TabsTrigger>
            <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === "balance" ? (
          <div className="flex items-center gap-2">
            <Label htmlFor="as-of" className="text-sm text-muted-foreground">
              As of
            </Label>
            <Input
              id="as-of"
              type="date"
              className="h-8 w-44"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
          </div>
        ) : (
          <PeriodSelect value={periodKey} onChange={setPeriodKey} />
        )}
      </div>

      <div className="print-area">
        <Card>
          <CardHeader>
            <CardTitle>{report.title}</CardTitle>
            <CardDescription>
              {report.company} · {report.periodLabel} · {report.currency}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasRows ? (
              <EmptyState
                title="No data for this period"
                description="Add transactions to see them reflected in the report."
              />
            ) : (
              <div>
                {report.sections.map((section) => (
                  <div key={section.title} className="mb-5">
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.title}
                    </h3>
                    <div className="space-y-1">
                      {section.rows.map((row) => (
                        <div
                          key={row.label}
                          className={cn(
                            "flex items-center justify-between py-0.5 text-sm",
                            row.indent && "pl-6",
                          )}
                        >
                          <span>{row.label}</span>
                          <span className="tabular-nums">
                            {row.amount === null ? "—" : formatMoney(row.amount, report.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <Separator className="my-4" />
                {report.totals.map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-1 text-sm font-bold">
                    <span>{row.label}</span>
                    <span className="tabular-nums">{formatMoney(row.amount ?? 0, report.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
