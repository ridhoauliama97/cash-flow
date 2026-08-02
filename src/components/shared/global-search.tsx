import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, FileText, HandCoins, ReceiptText, Search, SearchX } from "lucide-react"
import type { Bill, Invoice, Transaction } from "@/types"
import { useApp } from "@/context/app-context"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

interface SearchGroup {
  id: string
  label: string
  icon: typeof ReceiptText
  rows: Array<{ id: string; title: string; meta: string; amount: number; to: string }>
}

const LIMIT_PER_GROUP = 6

function matches(query: string, ...fields: Array<string | undefined>): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false
  return fields.some((f) => f && f.toLowerCase().includes(q))
}

function buildGroups(
  transactions: Transaction[],
  invoices: Invoice[],
  bills: Bill[],
  query: string,
): SearchGroup[] {
  if (!query.trim()) return []

  const txs = transactions
    .filter((t) => matches(query, t.description, t.client, t.category, t.product, t.region, t.notes))
    .slice(0, LIMIT_PER_GROUP)
    .map((t) => ({
      id: t.id,
      title: t.description,
      meta: `${t.type === "revenue" ? "Revenue" : "Expense"} · ${t.category}${t.client ? ` · ${t.client}` : ""}`,
      amount: t.baseAmount,
      to: "/transactions",
    }))

  const invs = invoices
    .filter((i) => matches(query, i.number, i.client, i.project))
    .slice(0, LIMIT_PER_GROUP)
    .map((i) => ({
      id: i.id,
      title: i.number,
      meta: `Invoice · ${i.client}`,
      amount: Math.max(0, i.baseAmount - i.paidAmount),
      to: "/receivables?tab=ar",
    }))

  const billsGroup = bills
    .filter((b) => matches(query, b.number, b.vendor, b.category))
    .slice(0, LIMIT_PER_GROUP)
    .map((b) => ({
      id: b.id,
      title: b.number,
      meta: `Bill · ${b.vendor} · ${b.category}`,
      amount: Math.max(0, b.baseAmount - b.paidAmount),
      to: "/receivables?tab=ap",
    }))

  const groups: SearchGroup[] = []
  if (txs.length > 0) groups.push({ id: "transactions", label: "Transactions", icon: ReceiptText, rows: txs })
  if (invs.length > 0) groups.push({ id: "invoices", label: "Invoices", icon: HandCoins, rows: invs })
  if (billsGroup.length > 0) groups.push({ id: "bills", label: "Bills", icon: FileText, rows: billsGroup })
  return groups
}

export function GlobalSearch() {
  const { transactions, invoices, bills, homeCurrency } = useApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const groups = useMemo(
    () => buildGroups(transactions, invoices, bills, query),
    [transactions, invoices, bills, query],
  )

  const flat = useMemo(
    () => groups.flatMap((g) => g.rows.map((r) => ({ group: g, row: r }))),
    [groups],
  )

  // Global shortcut: Cmd/Ctrl+K opens the dialog.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Reset state on open, focus the input.
  useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && flat[activeIndex]) {
      e.preventDefault()
      go(flat[activeIndex]!.row.to)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Search (Ctrl+K)"
        title="Search (Ctrl+K)"
        onClick={() => setOpen(true)}
      >
        <Search className="size-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="top-[15%] max-w-lg gap-0 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Global search</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={onKeyDown}
              placeholder="Search transactions, invoices, bills…"
              className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
              ESC
            </kbd>
          </div>

          <div className="max-h-80 overflow-y-auto p-1">
            {query.trim() && flat.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <SearchX className="size-6 text-muted-foreground" />
                <p className="text-sm font-medium">No results for “{query.trim()}”</p>
                <p className="text-xs text-muted-foreground">Try a description, client, invoice or bill number.</p>
              </div>
            ) : (
              groups.map((g, gi) => (
                <div key={g.id}>
                  {gi > 0 && <Separator className="my-1" />}
                  <div className="flex items-center gap-2 px-2 pb-1 pt-2">
                    <g.icon className="size-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">{g.label}</p>
                  </div>
                  {g.rows.map((r) => {
                    const flatIndex = flat.findIndex((f) => f.row.id === r.id && f.group.id === g.id)
                    const active = flatIndex === activeIndex
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => go(r.to)}
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left",
                          active && "bg-accent",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{r.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{r.meta}</span>
                        </span>
                        <Badge variant="outline" className="shrink-0 tabular-nums">
                          {formatMoney(r.amount, homeCurrency, true)}
                        </Badge>
                        {active && <ArrowRight className="size-4 shrink-0 text-muted-foreground" />}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {flat.length > 0 && (
            <div className="flex items-center justify-end gap-1 border-t px-4 py-2 text-[11px] text-muted-foreground">
              <kbd className="rounded border bg-muted px-1 font-medium">↑↓</kbd> navigate
              <kbd className="ml-2 rounded border bg-muted px-1 font-medium">↵</kbd> open
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
