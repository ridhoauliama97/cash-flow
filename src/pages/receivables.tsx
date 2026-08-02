import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  FileText,
  HandCoins,
  Landmark,
  MoreHorizontal,
  Percent,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import type { Bill, BillStatus, Invoice, InvoiceStatus } from "@/types"

import {
  agingBuckets,
  billAgingBuckets,
  expectedCollections,
  expectedPayments,
  outstandingByClient,
  overdueDays,
} from "@/lib/analytics/aging"
import { formatDate, formatMoney, formatPercentPlain } from "@/lib/format"
import { todayISO } from "@/lib/utils"

import { BillFormDialog } from "@/components/shared/bill-form-dialog"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useApp } from "@/context/app-context"

function OverdueBadge({ dueDate }: { dueDate: string }) {
  const days = overdueDays({ dueDate } as Invoice, todayISO())
  if (days > 0) {
    return <Badge variant="destructive" className="whitespace-nowrap">{days === 1 ? "1 day overdue" : `${days} days overdue`}</Badge>
  }
  if (days === 0) return <Badge variant="outline" className="whitespace-nowrap text-muted-foreground">Due today</Badge>
  return <span className="text-xs text-muted-foreground">Due in {Math.abs(days)}d</span>
}

function StatusBadge({ status }: { status: InvoiceStatus | BillStatus }) {
  const meta: Record<InvoiceStatus | BillStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
    paid: { label: "Paid", variant: "default" },
    partial: { label: "Partial", variant: "secondary" },
    unpaid: { label: "Unpaid", variant: "outline" },
  }
  return <Badge variant={meta[status].variant}>{meta[status].label}</Badge>
}

function PaymentDialog({
  invoice,
  onClose,
}: {
  invoice: Invoice | null
  onClose: () => void
}) {
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

function BillPaymentDialog({ bill, onClose }: { bill: Bill | null; onClose: () => void }) {
  const { updateBill, homeCurrency } = useApp()
  const [amount, setAmount] = useState<number>(bill ? Math.max(0, bill.baseAmount - bill.paidAmount) : 0)

  if (!bill) return null

  const save = async () => {
    const payment = Math.max(0, Number(amount) || 0)
    const newPaid = Math.min(bill.paidAmount + payment, bill.baseAmount)
    const status: BillStatus = newPaid >= bill.baseAmount ? "paid" : newPaid > 0 ? "partial" : "unpaid"
    await updateBill({ ...bill, paidAmount: newPaid, status })
    toast.success(`Payment recorded for ${bill.number}`)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {bill.number} — {bill.vendor}. Remaining: {formatMoney(Math.max(0, bill.baseAmount - bill.paidAmount), homeCurrency)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="bill-payment-amount">Payment amount ({homeCurrency})</Label>
          <Input
            id="bill-payment-amount"
            type="number"
            min={0}
            max={bill.baseAmount}
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
  const { invoices, bills, homeCurrency, deleteInvoices, deleteBills } = useApp()
  const [tab, setTab] = useState<"ar" | "ap">("ar")
  const [addOpen, setAddOpen] = useState(false)
  const [paying, setPaying] = useState<Invoice | null>(null)
  const [billAddOpen, setBillAddOpen] = useState(false)
  const [billPaying, setBillPaying] = useState<Bill | null>(null)

  const today = todayISO()
  const summary = useMemo(() => agingBuckets(invoices, today), [invoices, today])
  const byClient = useMemo(() => outstandingByClient(invoices), [invoices])
  const totalPaid = useMemo(() => invoices.reduce((sum, i) => sum + i.paidAmount, 0), [invoices])
  const openCount = useMemo(() => invoices.filter((i) => i.status !== "paid").length, [invoices])
  const collectionRate = totalPaid + summary.totalOutstanding > 0 ? (totalPaid / (totalPaid + summary.totalOutstanding)) * 100 : null
  const expected30 = useMemo(() => expectedCollections(invoices, today, 30), [invoices, today])
  const sorted = useMemo(() => invoices.toSorted((a, b) => a.dueDate.localeCompare(b.dueDate)), [invoices])

  const billSummary = useMemo(() => billAgingBuckets(bills, today), [bills, today])
  const billOpenCount = useMemo(() => bills.filter((b) => b.status !== "paid").length, [bills])
  const sortedBills = useMemo(() => bills.toSorted((a, b) => a.dueDate.localeCompare(b.dueDate)), [bills])

  const remove = async (inv: Invoice) => {
    await deleteInvoices([inv.id])
    toast.success(`Invoice ${inv.number} deleted`)
  }
  const removeBill = async (bill: Bill) => {
    await deleteBills([bill.id])
    toast.success(`Bill ${bill.number} deleted`)
  }

  const addButton = (
    <Button size="sm" onClick={() => setAddOpen(true)}>
      <Plus className="size-4" /> Add invoice
    </Button>
  )
  const addBillButton = (
    <Button size="sm" onClick={() => setBillAddOpen(true)}>
      <Plus className="size-4" /> Add bill
    </Button>
  )

  if (invoices.length === 0 && bills.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="AR / AP" description="Track outstanding invoices (AR) and vendor bills (AP)." actions={addButton} />
        <EmptyState
          title="No receivables or payables yet"
          description="Create an invoice to track outstanding receivables, or a bill to track what you owe vendors."
          actionLabel="Add invoice"
          onAction={() => setAddOpen(true)}
        />
        <InvoiceFormDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AR / AP"
        description="Track outstanding invoices (receivables) and vendor bills (payables) with aging."
        actions={tab === "ar" ? addButton : addBillButton}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "ar" | "ap")}>
        <TabsList>
          <TabsTrigger value="ar">Accounts receivable</TabsTrigger>
          <TabsTrigger value="ap">Accounts payable</TabsTrigger>
        </TabsList>

        <TabsContent value="ar" className="mt-4 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total outstanding" value={formatMoney(summary.totalOutstanding, homeCurrency)} icon={HandCoins} sub={`${openCount} open invoice${openCount === 1 ? "" : "s"}`} />
            <KpiCard label="Overdue" value={formatMoney(summary.totalOverdue, homeCurrency)} icon={AlertTriangle} sub={`${summary.overdueCount} past due`} />
            <KpiCard label="Expected in 30d" value={formatMoney(expected30, homeCurrency)} icon={CalendarClock} sub="due within 30 days" />
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
                              <OverdueBadge dueDate={inv.dueDate} />
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
                        <TableCell><OverdueBadge dueDate={inv.dueDate} /></TableCell>
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
        </TabsContent>

        <TabsContent value="ap" className="mt-4 space-y-6">
          {bills.length === 0 ? (
            <EmptyState
              title="No bills yet"
              description="Add a vendor bill to track what you owe — overdue bills appear in the AP aging."
              actionLabel="Add bill"
              onAction={() => setBillAddOpen(true)}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Total payable" value={formatMoney(billSummary.totalOutstanding, homeCurrency)} icon={Landmark} sub={`${billOpenCount} open bill${billOpenCount === 1 ? "" : "s"}`} />
                <KpiCard label="Overdue" value={formatMoney(billSummary.totalOverdue, homeCurrency)} icon={AlertTriangle} sub={`${billSummary.overdueCount} past due`} />
                <KpiCard label="Due in 30d" value={formatMoney(expectedPayments(bills, today, 30), homeCurrency)} icon={CalendarClock} sub="must be paid soon" />
                <KpiCard label="Open bills" value={String(billOpenCount)} icon={FileText} sub="unpaid or partial" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>AP aging</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {billSummary.buckets.map((bucket) => (
                    <div key={bucket.key}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{bucket.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {bucket.bills.length} bill{bucket.bills.length === 1 ? "" : "s"} ·{" "}
                          <span className="font-medium tabular-nums text-foreground">{formatMoney(bucket.total, homeCurrency)}</span>
                        </span>
                      </div>
                      <Progress className="mt-1.5" value={billSummary.totalOutstanding > 0 ? (bucket.total / billSummary.totalOutstanding) * 100 : 0} />
                      {bucket.bills.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {bucket.bills.map((bill) => (
                            <div key={bill.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-1.5 text-sm">
                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {bill.number} <span className="font-normal text-muted-foreground">· {bill.vendor}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">Due {formatDate(bill.dueDate)} · {bill.category}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <OverdueBadge dueDate={bill.dueDate} />
                                <span className="tabular-nums">{formatMoney(Math.max(0, bill.baseAmount - bill.paidAmount), homeCurrency)}</span>
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
                  <CardTitle>All bills</CardTitle>
                </CardHeader>
                <CardContent className="p-0 sm:p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill</TableHead>
                        <TableHead>Vendor</TableHead>
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
                      {sortedBills.map((bill) => {
                        const outstanding = Math.max(0, bill.baseAmount - bill.paidAmount)
                        return (
                          <TableRow key={bill.id}>
                            <TableCell className="font-medium">{bill.number}</TableCell>
                            <TableCell>{bill.vendor}</TableCell>
                            <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">{formatDate(bill.issueDate)}</TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(bill.dueDate)}</TableCell>
                            <TableCell><OverdueBadge dueDate={bill.dueDate} /></TableCell>
                            <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMoney(bill.amount, bill.currency)}</TableCell>
                            <TableCell className="hidden whitespace-nowrap text-right tabular-nums xl:table-cell">{formatMoney(bill.baseAmount, homeCurrency)}</TableCell>
                            <TableCell><StatusBadge status={bill.status} /></TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-7" aria-label="Bill actions">
                                    <MoreHorizontal className="size-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem disabled={outstanding <= 0} onClick={() => setBillPaying(bill)}>
                                    <Banknote className="size-3.5" /> Record payment
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => void removeBill(bill)}>
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
            </>
          )}
        </TabsContent>
      </Tabs>

      <InvoiceFormDialog open={addOpen} onOpenChange={setAddOpen} />
      <BillFormDialog open={billAddOpen} onOpenChange={setBillAddOpen} />
      <PaymentDialog key={paying?.id ?? "none"} invoice={paying} onClose={() => setPaying(null)} />
      <BillPaymentDialog key={billPaying?.id ?? "none"} bill={billPaying} onClose={() => setBillPaying(null)} />
    </div>
  )
}
