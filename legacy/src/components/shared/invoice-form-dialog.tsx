import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CurrencySelect } from "@/components/shared/currency-select"
import { useApp } from "@/context/app-context"
import { shiftDays, todayISO } from "@/lib/utils"
import type { CurrencyCode, Invoice, InvoiceDraft } from "@/types"

export interface InvoiceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice?: Invoice | null
}

const EMPTY: InvoiceDraft = {
  number: "",
  client: "",
  issueDate: todayISO(),
  dueDate: shiftDays(todayISO(), 14),
  amount: 0,
  currency: "USD",
  project: "",
}

export function InvoiceFormDialog({ open, onOpenChange, invoice }: InvoiceFormProps) {
  const { addInvoice, updateInvoice, homeCurrency } = useApp()
  const [draft, setDraft] = useState<InvoiceDraft>(
    invoice
      ? {
          number: invoice.number,
          client: invoice.client,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          amount: invoice.amount,
          currency: invoice.currency,
          project: invoice.project ?? "",
        }
      : { ...EMPTY, currency: homeCurrency },
  )
  const [saving, setSaving] = useState(false)

  const set = (patch: Partial<InvoiceDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const valid = draft.number.trim() !== "" && draft.client.trim() !== "" && draft.amount > 0

  const save = async () => {
    if (!valid) return
    setSaving(true)
    try {
      if (invoice) {
        await updateInvoice({ ...invoice, ...draft, amount: Number(draft.amount) })
        toast.success("Invoice updated")
      } else {
        await addInvoice({ ...draft, amount: Number(draft.amount) })
        toast.success("Invoice added")
        setDraft({ ...EMPTY, currency: homeCurrency })
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save invoice")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{invoice ? "Edit invoice" : "Add invoice"}</DialogTitle>
          <DialogDescription>
            Track outstanding receivables — overdue invoices appear in aging reports.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-number">Invoice number</Label>
              <Input id="inv-number" placeholder="INV-2026-101" value={draft.number} onChange={(e) => set({ number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-client">Client</Label>
              <Input id="inv-client" placeholder="Acme Corporation" value={draft.client} onChange={(e) => set({ client: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-issue">Issue date</Label>
              <Input id="inv-issue" type="date" value={draft.issueDate} onChange={(e) => set({ issueDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-due">Due date</Label>
              <Input id="inv-due" type="date" value={draft.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-amount">Amount</Label>
              <Input id="inv-amount" type="number" min={0} step="any" value={draft.amount || ""} onChange={(e) => set({ amount: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <CurrencySelect value={draft.currency as CurrencyCode} onChange={(c) => set({ currency: c })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-project">Project (optional)</Label>
            <Input id="inv-project" value={draft.project ?? ""} onChange={(e) => set({ project: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid || saving}>
            {saving ? "Saving…" : invoice ? "Save changes" : "Add invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
