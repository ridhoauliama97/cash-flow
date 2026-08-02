import { Filter, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { DashboardFilters, TransactionType } from "@/types"
import { cn } from "@/lib/utils"
import { EMPTY_FILTERS } from "@/types"

export interface FilterOptions {
  categories: string[]
  products: string[]
  clients: string[]
  regions: string[]
  departments: string[]
  projects: string[]
}

const EMPTY_OPTIONS: FilterOptions = { categories: [], products: [], clients: [], regions: [], departments: [], projects: [] }

/** Count active filters for the badge. */
export function countActiveFilters(f: DashboardFilters): number {
  let n = 0
  if (f.type !== "all") n++
  if (f.category) n++
  if (f.product) n++
  if (f.client) n++
  if (f.region) n++
  if (f.department) n++
  if (f.project) n++
  if (f.basis !== "all") n++
  if (f.dateFrom || f.dateTo) n++
  if (f.search) n++
  return n
}

function DimSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | null
  options: string[]
  onChange: (v: string | null) => void
}) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(v) => onChange(v === "all" ? null : v)}
    >
      <SelectTrigger className="h-8 w-full text-xs sm:w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label === "Category" ? "categories" : `${label.toLowerCase()}s`}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Multi-dimensional filter bar: type, category, product, client, region,
 * department, project, accounting basis, date range and search.
 */
export function FilterBar({
  filters,
  onChange,
  options = EMPTY_OPTIONS,
  showType = true,
  compact = false,
}: {
  filters: DashboardFilters
  onChange: (f: DashboardFilters) => void
  options?: Partial<FilterOptions>
  showType?: boolean
  compact?: boolean
}) {
  const opts: FilterOptions = { ...EMPTY_OPTIONS, ...options }
  const active = countActiveFilters(filters)
  const set = (patch: Partial<DashboardFilters>) => onChange({ ...filters, ...patch })

  const dimRow = (
    <div className={cn("grid gap-2", compact ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5")}>
      {opts.categories.length > 0 && (
        <DimSelect label="category" value={filters.category} options={opts.categories} onChange={(v) => set({ category: v })} />
      )}
      {opts.products.length > 0 && (
        <DimSelect label="product" value={filters.product} options={opts.products} onChange={(v) => set({ product: v })} />
      )}
      {opts.clients.length > 0 && (
        <DimSelect label="client" value={filters.client} options={opts.clients} onChange={(v) => set({ client: v })} />
      )}
      {opts.regions.length > 0 && (
        <DimSelect label="region" value={filters.region} options={opts.regions} onChange={(v) => set({ region: v })} />
      )}
      {opts.departments.length > 0 && (
        <DimSelect label="department" value={filters.department} options={opts.departments} onChange={(v) => set({ department: v })} />
      )}
      {opts.projects.length > 0 && (
        <DimSelect label="project" value={filters.project} options={opts.projects} onChange={(v) => set({ project: v })} />
      )}
    </div>
  )

  return (
    <div className="mb-5 space-y-2 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="size-3.5" />
          Filters
          {active > 0 && <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{active}</Badge>}
        </span>
        {showType && (
          <Select
            value={filters.type}
            onValueChange={(v) => set({ type: v as TransactionType | "all" })}
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select
          value={filters.basis}
          onValueChange={(v) => set({ basis: v as DashboardFilters["basis"] })}
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any basis</SelectItem>
            <SelectItem value="cash">Cash basis</SelectItem>
            <SelectItem value="accrual">Accrual basis</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 w-44 pl-8 text-xs sm:w-56"
            placeholder="Search description…"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
          />
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Date range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <div className="grid gap-2">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={filters.dateFrom ?? ""}
                  onChange={(e) => set({ dateFrom: e.target.value || null })}
                />
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={filters.dateTo ?? ""}
                  onChange={(e) => set({ dateTo: e.target.value || null })}
                />
                {(filters.dateFrom || filters.dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => set({ dateFrom: null, dateTo: null })}
                  >
                    Clear dates
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {active > 0 && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => onChange({ ...EMPTY_FILTERS, basis: filters.basis })}>
              <X className="size-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>
      {dimRow}
    </div>
  )
}
