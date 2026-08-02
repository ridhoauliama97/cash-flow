import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Banknote,
  Clock,
  HandCoins,
  MoreHorizontal,
  Percent,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import type { Invoice, InvoiceStatus } from "@/types"

import { agingBuckets, outstandingByClient, overdueDays } from "@/lib/analytics/aging"
import { formatDate, formatMoney, formatPercentPlain } from "@/lib/format"
import { todayISO } from "@/lib/utils"

import { EmptyState } from "@/components/shared/empty-state"
import { InvoiceFormDialog } from "@/components/shared/invoice-form-dialog"
import { KpiCard, StatRow } from "@/components/shared/kpi-card"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useApp } from "@/context/app-context"

function OverdueBadge({ invoice }: { invoice: Invoice }) {
  const days = overdueDays(invoice, todayISO())
  if (days > 0) {
    return <Badge variant="destructive" className="whitespace-nowrap">{days === 1 ? "1 day overdue" : `${days} days overdue`}</Badge>
  }
  if (days === 0) return <Badge variant="outline" className="whitespace-nowrap text-muted-foreground">Due today</Badge>
  return <span className="text-xs text-muted-foreground">Due in {Math.abs(days)}d</span>
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const meta: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
    paid: { label: "Paid", variant: "default" },
    partial: { label: "Partial", variant: "secondary" },
    unpaid: { label: "Unpaid", variant: "outline" },
  }
  return <Badge variant={meta[status].variant}>{meta[status].label}</Badge>
}

function PaymentDialog({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  const { updateInvoice, homeCurrency } = useApp()
  const [amount, setAmount] = useState<number>(invoice ? Math.max(0, invoice.baseAmount - invoice.paidAmount) : 0)

  if (!invoice) return null

  const save = async () => {
    // The dialog pre-fills the remaining amount; payments ACCUMULATE on top of
    // any previously recorded paidAmount (never replace it).
    const payment = Math.max(0, Number(amount) || 0)
    const newPaid = Math.min(invoice.paidAmount + payment, invoice.baseAmount)
    const status: InvoiceStatus = newPaid >= invoice.baseAmount ? "paid" : newPaid > 0 ? "partial" : "unpaid"
    await updateInvoice({ ...invoice, paidAmount: newPaid, status })
    toast.success(`Payment recorded for ${invoice.number}`)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {invoice.number} — {invoice.client}. Remaining: {formatMoney(Math.max(0, invoice.baseAmount - invoice.paidAmount), homeCurrency)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="payment-amount">Payment amount ({homeCurrency})</Label>
          <Input
            id="payment-amount"
            type="number"
            min={0}
            max={invoice.baseAmount}
            step="any"
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void save()}>Record payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ReceivablesPage() {
  const { invoices, homeCurrency, deleteInvoices } = useApp()
  const [addOpen, setAddOpen] = useState(false)
  const [paying, setPaying] = useState<Invoice | null>(null)

  const today = todayISO()
  const summary = useMemo(() => agingBuckets(invoices, today), [invoices, today])
  const byClient = useMemo(() => outstandingByClient(invoices), [invoices])
  const totalPaid = useMemo(() => invoices.reduce((sum, i) => sum + i.paidAmount, 0), [invoices])
  const openCount = useMemo(() => invoices.filter((i) => i.status !== "paid").length, [invoices])
  const collectionRate = totalPaid + summary.totalOutstanding > 0 ? (totalPaid / (totalPaid + summary.totalOutstanding)) * 100 : null
  const sorted = useMemo(() => invoices.toSorted((a, b) => a.dueDate.localeCompare(b.dueDate)), [invoices])

  const remove = async (inv: Invoice) => {
    await deleteInvoices([inv.id])
    toast.success(`Invoice ${inv.number} deleted`)
  }

  const addButton = (
    <Button size="sm" onClick={() => setAddOpen(true)}>
      <Plus className="size-4" /> Add invoice
    </Button>
  )

  if (invoices.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Receivables" description="Track outstanding invoices and aging." actions={addButton} />
        <EmptyState
          title="No invoices yet"
          description="Create an invoice to start tracking outstanding receivables."
          actionLabel="Add invoice"
          onAction={() => setAddOpen(true)}
        />
        <InvoiceFormDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Receivables" description="Track outstanding invoices and aging." actions={addButton} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total outstanding" value={formatMoney(summary.totalOutstanding, homeCurrency)} icon={HandCoins} sub={`${openCount} open invoice${openCount === 1 ? "" : "s"}`} />
        <KpiCard label="Overdue" value={formatMoney(summary.totalOverdue, homeCurrency)} icon={AlertTriangle} sub="past due" />
        <KpiCard label="Overdue count" value={String(summary.overdueCount)} icon={Clock} sub="invoices past due" />
        <KpiCard label="Collection rate" value={collectionRate === null ? "—" : formatPercentPlain(collectionRate)} icon={Percent} sub="paid / billed" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Aging summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.buckets.map((bucket) => (
              <div key={bucket.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{bucket.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {bucket.invoices.length} invoice{bucket.invoices.length === 1 ? "" : "s"} ·{" "}
                    <span className="font-medium tabular-nums text-foreground">{formatMoney(bucket.total, homeCurrency)}</span>
                  </span>
                </div>
                <Progress className="mt-1.5" value={summary.totalOutstanding > 0 ? (bucket.total / summary.totalOutstanding) * 100 : 0} />
                {bucket.invoices.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {bucket.invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-1.5 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {inv.number} <span className="font-normal text-muted-foreground">· {inv.client}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">Due {formatDate(inv.dueDate)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <OverdueBadge invoice={inv} />
                          <span className="tabular-nums">{formatMoney(Math.max(0, inv.baseAmount - inv.paidAmount), homeCurrency)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outstanding by client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {byClient.length === 0 ? (
              <EmptyState title="Nothing outstanding" description="All invoices are paid in full." className="py-8" />
            ) : (
              byClient.map((c) => (
                <StatRow
                  key={c.client}
                  label={
                    <span>
                      {c.client}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {c.count} inv · oldest {formatDate(c.oldest)}
                      </span>
                    </span>
                  }
                  value={formatMoney(c.total, homeCurrency)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden lg:table-cell">Issue date</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Overdue</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden text-right xl:table-cell">{homeCurrency} value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((inv) => {
                const outstanding = Math.max(0, inv.baseAmount - inv.paidAmount)
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.number}</TableCell>
                    <TableCell>{inv.client}</TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">{formatDate(inv.issueDate)}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
                    <TableCell><OverdueBadge invoice={inv} /></TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMoney(inv.amount, inv.currency)}</TableCell>
                    <TableCell className="hidden whitespace-nowrap text-right tabular-nums xl:table-cell">{formatMoney(inv.baseAmount, homeCurrency)}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7" aria-label="Invoice actions">
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled={outstanding <= 0} onClick={() => setPaying(inv)}>
                            <Banknote className="size-3.5" /> Record payment
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => void remove(inv)}>
                            <Trash2 className="size-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InvoiceFormDialog open={addOpen} onOpenChange={setAddOpen} />
      <PaymentDialog key={paying?.id ?? "none"} invoice={paying} onClose={() => setPaying(null)} />
    </div>
  )
}
