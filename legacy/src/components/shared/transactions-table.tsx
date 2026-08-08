import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TransactionFormDialog } from "@/components/shared/transaction-form-dialog"
import { useApp } from "@/context/app-context"
import { formatDate, formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/types"

export function TransactionsTable({
  transactions,
  compact = false,
}: {
  transactions: Transaction[]
  compact?: boolean
}) {
  const { deleteTransactions, homeCurrency } = useApp()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Transaction | null>(null)

  const allSelected = transactions.length > 0 && selected.size === transactions.length

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(transactions.map((t) => t.id)))
  }
  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const remove = async (ids: string[]) => {
    await deleteTransactions([...ids])
    toast.success(`${ids.length} transaction${ids.length > 1 ? "s" : ""} deleted`)
    setSelected(new Set())
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{selected.size} selected</span>
          <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => void remove([...selected])}>
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              {!compact && <TableHead>Category</TableHead>}
              {!compact && <TableHead>Client</TableHead>}
              {!compact && <TableHead className="hidden xl:table-cell">Project</TableHead>}
              <TableHead className="text-right">Amount</TableHead>
              {!compact && <TableHead className="hidden text-right md:table-cell">{homeCurrency} value</TableHead>}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={compact ? 4 : 8} className="h-24 text-center text-sm text-muted-foreground">
                  No transactions match your filters.
                </TableCell>
              </TableRow>
            )}
            {transactions.map((t) => (
              <TableRow key={t.id} className={selected.has(t.id) ? "bg-muted/40" : undefined}>
                <TableCell>
                  <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} aria-label={`Select ${t.description}`} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(t.date)}</TableCell>
                <TableCell>
                  <p className="font-medium">{t.description}</p>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    <Badge variant={t.type === "revenue" ? "default" : "secondary"} className="h-4 px-1.5 text-[10px]">
                      {t.type === "revenue" ? "Revenue" : "Expense"}
                    </Badge>
                    {!compact && t.region && (
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                        {t.region}
                      </Badge>
                    )}
                    {t.paymentMethod && (
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-muted-foreground">
                        {t.paymentMethod}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                {!compact && <TableCell className="text-muted-foreground">{t.category}</TableCell>}
                {!compact && <TableCell className="text-muted-foreground">{t.client ?? "—"}</TableCell>}
                {!compact && <TableCell className="hidden text-muted-foreground xl:table-cell">{t.project ?? "—"}</TableCell>}
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatMoney(t.amount, t.currency)}
                </TableCell>
                {!compact && (
                  <TableCell className={cn("hidden whitespace-nowrap text-right tabular-nums md:table-cell", t.type === "expense" && "text-destructive")}>
                    {formatMoney(t.baseAmount, homeCurrency)}
                  </TableCell>
                )}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7" aria-label="Row actions">
                        <Pencil className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(t)}>
                        <Pencil className="size-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => void remove([t.id])}>
                        <Trash2 className="size-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TransactionFormDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} transaction={editing} />
    </div>
  )
}
