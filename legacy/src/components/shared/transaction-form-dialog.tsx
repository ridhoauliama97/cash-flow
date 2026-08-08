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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CurrencySelect } from "@/components/shared/currency-select"
import { useApp } from "@/context/app-context"
import { todayISO } from "@/lib/utils"
import type { CurrencyCode, Transaction, TransactionDraft, TransactionType } from "@/types"

export interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: Transaction | null // edit mode when provided
  defaultType?: TransactionType
}

const EMPTY: TransactionDraft = {
  date: todayISO(),
  type: "revenue",
  description: "",
  amount: 0,
  currency: "USD",
  category: "Client Services",
  client: "",
  region: "",
  product: "",
  department: "",
  project: "",
  paymentMethod: "",
}

/**
 * Create/edit transaction dialog. In edit mode the original currency
 * and base amount are preserved (base amount recomputed on save).
 */
export function TransactionFormDialog({ open, onOpenChange, transaction, defaultType = "revenue" }: TransactionFormProps) {
  const { addTransactions, updateTransaction, homeCurrency, convertAmount } = useApp()
  const [draft, setDraft] = useState<TransactionDraft>(
    transaction
      ? {
          date: transaction.date,
          type: transaction.type,
          description: transaction.description,
          amount: transaction.amount,
          currency: transaction.currency,
          category: transaction.category,
          client: transaction.client ?? "",
          region: transaction.region ?? "",
          product: transaction.product ?? "",
          department: transaction.department ?? "",
          project: transaction.project ?? "",
          paymentMethod: transaction.paymentMethod ?? "",
        }
      : { ...EMPTY, type: defaultType, currency: homeCurrency },
  )
  const [saving, setSaving] = useState(false)

  const set = (patch: Partial<TransactionDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const valid = draft.description.trim().length > 0 && draft.amount > 0

  const save = async () => {
    if (!valid) return
    setSaving(true)
    try {
      if (transaction) {
        await updateTransaction({
          ...transaction,
          ...draft,
          baseAmount: Math.round(convertAmount(draft.amount, draft.currency)),
          amount: Number(draft.amount),
        } as Transaction)
        toast.success("Transaction updated")
      } else {
        await addTransactions([{ ...draft, amount: Number(draft.amount) }])
        toast.success("Transaction added")
        setDraft({ ...EMPTY, type: draft.type, currency: homeCurrency })
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save transaction")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription>
            Amounts are converted to {homeCurrency} automatically at the current exchange rate.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Date</Label>
              <Input id="tx-date" type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={draft.type} onValueChange={(v) => set({ type: v as TransactionType })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-desc">Description</Label>
            <Input
              id="tx-desc"
              placeholder="e.g. Monthly retainer — Acme"
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                type="number"
                min={0}
                step="any"
                placeholder="0.00"
                value={draft.amount || ""}
                onChange={(e) => set({ amount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <CurrencySelect value={draft.currency as CurrencyCode} onChange={(c) => set({ currency: c })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-category">Category</Label>
            <Input
              id="tx-category"
              placeholder="e.g. Client Services"
              value={draft.category}
              onChange={(e) => set({ category: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-client">Client</Label>
              <Input id="tx-client" value={draft.client ?? ""} onChange={(e) => set({ client: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-product">Product</Label>
              <Input id="tx-product" value={draft.product ?? ""} onChange={(e) => set({ product: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-region">Region</Label>
              <Input id="tx-region" value={draft.region ?? ""} onChange={(e) => set({ region: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-project">Project</Label>
              <Input id="tx-project" value={draft.project ?? ""} onChange={(e) => set({ project: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-notes">Notes</Label>
            <Textarea
              id="tx-notes"
              rows={2}
              value={draft.notes ?? ""}
              onChange={(e) => set({ notes: e.target.value })}
              placeholder="Optional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid || saving}>
            {saving ? "Saving…" : transaction ? "Save changes" : "Add transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
