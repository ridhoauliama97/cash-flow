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
import type { Bill, BillDraft, CurrencyCode } from "@/types"

export interface BillFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bill?: Bill | null
}

const EMPTY: BillDraft = {
  number: "",
  vendor: "",
  issueDate: todayISO(),
  dueDate: shiftDays(todayISO(), 14),
  amount: 0,
  currency: "USD",
  category: "Other",
  notes: "",
}

export function BillFormDialog({ open, onOpenChange, bill }: BillFormProps) {
  const { addBill, updateBill, homeCurrency } = useApp()
  const [draft, setDraft] = useState<BillDraft>(
    bill
      ? {
          number: bill.number,
          vendor: bill.vendor,
          issueDate: bill.issueDate,
          dueDate: bill.dueDate,
          amount: bill.amount,
          currency: bill.currency,
          category: bill.category,
          notes: bill.notes ?? "",
        }
      : { ...EMPTY, currency: homeCurrency },
  )
  const [saving, setSaving] = useState(false)

  const set = (patch: Partial<BillDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const valid = draft.number.trim() !== "" && draft.vendor.trim() !== "" && draft.amount > 0

  const save = async () => {
    if (!valid) return
    setSaving(true)
    try {
      if (bill) {
        await updateBill({ ...bill, ...draft, amount: Number(draft.amount) })
        toast.success("Bill updated")
      } else {
        await addBill({ ...draft, amount: Number(draft.amount) })
        toast.success("Bill added")
        setDraft({ ...EMPTY, currency: homeCurrency })
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save bill")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{bill ? "Edit bill" : "Add bill"}</DialogTitle>
          <DialogDescription>
            Track vendor bills you owe — overdue bills appear in the AP aging.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bill-number">Bill number</Label>
              <Input id="bill-number" placeholder="BILL-200" value={draft.number} onChange={(e) => set({ number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bill-vendor">Vendor</Label>
              <Input id="bill-vendor" placeholder="AWS" value={draft.vendor} onChange={(e) => set({ vendor: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bill-issue">Issue date</Label>
              <Input id="bill-issue" type="date" value={draft.issueDate} onChange={(e) => set({ issueDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bill-due">Due date</Label>
              <Input id="bill-due" type="date" value={draft.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bill-amount">Amount</Label>
              <Input id="bill-amount" type="number" min={0} step="any" value={draft.amount || ""} onChange={(e) => set({ amount: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <CurrencySelect value={draft.currency as CurrencyCode} onChange={(c) => set({ currency: c })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bill-category">Category</Label>
              <Input id="bill-category" placeholder="Software & Subscriptions" value={draft.category} onChange={(e) => set({ category: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-notes">Notes (optional)</Label>
            <Input id="bill-notes" value={draft.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid || saving}>
            {saving ? "Saving…" : bill ? "Save changes" : "Add bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
