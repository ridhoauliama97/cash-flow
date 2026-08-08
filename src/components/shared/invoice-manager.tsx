"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Plus,
} from "lucide-react";
import {
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceFormDialog } from "@/components/shared/invoice-form-dialog";
import { deleteInvoice, setInvoiceStatus } from "@/lib/actions/invoices";
import { formatIDR, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvoiceRow } from "@/lib/actions/invoices";
import type { CustomerRow } from "@/lib/customers";
import type { SupplierRow } from "@/lib/suppliers";

const STATUS_VARIANT: Record<string, "secondary" | "warning" | "success" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "warning",
  paid: "success",
  overdue: "destructive",
  cancelled: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

function SortableHeader({
  sorted,
  children,
  className,
}: {
  sorted: false | "asc" | "desc";
  children: React.ReactNode;
  className?: string;
}) {
  const Icon =
    sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        sorted !== false && "text-foreground",
        className,
      )}
    >
      {children}
      <Icon className="size-3.5 opacity-60" />
    </span>
  );
}

export function InvoiceManager({
  invoices,
  customers,
  suppliers,
}: {
  invoices: InvoiceRow[];
  customers: CustomerRow[];
  suppliers: SupplierRow[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const data = useMemo(() => invoices, [invoices]);

  const columns = useMemo<ColumnDef<InvoiceRow>[]>(
    () => [
      {
        id: "number",
        accessorKey: "number",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>No. Invoice</SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium">{row.original.number}</span>
        ),
      },
      {
        id: "type",
        accessorKey: "type",
        filterFn: (row, columnId, filterValue: string) => {
          if (!filterValue || filterValue === "semua") return true;
          return row.getValue<string>(columnId) === filterValue;
        },
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>Tipe</SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <Badge variant="secondary" className="capitalize">
            {row.original.type === "receivable" ? "Piutang" : "Hutang"}
          </Badge>
        ),
      },
      {
        id: "party",
        accessorFn: (row) => row.customerName ?? row.supplierName ?? "—",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Customer / Supplier
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => {
          const name = row.original.customerName ?? row.original.supplierName;
          return name ?? "—";
        },
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>Jumlah</SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{formatIDR(row.original.amount)}</span>
        ),
      },
      {
        id: "dueDate",
        accessorKey: "dueDate",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>Jatuh Tempo</SortableHeader>
          </button>
        ),
        cell: ({ row }) => formatDate(row.original.dueDate),
      },
      {
        id: "status",
        accessorKey: "status",
        filterFn: (row, columnId, filterValue: string) => {
          if (!filterValue || filterValue === "semua") return true;
          return row.getValue<string>(columnId) === filterValue;
        },
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>Status</SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status] ?? "secondary"}>
            {STATUS_LABEL[row.original.status] ?? row.original.status}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Aksi</span>,
        cell: ({ row }) => {
          const inv = row.original;
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={busyId === inv.id}
                onClick={() => openEdit(inv)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busyId === inv.id}
                className="text-destructive"
                onClick={() => handleDelete(inv)}
              >
                Hapus
              </Button>
              <Select
                value={inv.status}
                onValueChange={(v) => {
                  if (v && v !== inv.status) handleSetStatus(inv.id, v);
                }}
              >
                <SelectTrigger className="h-8 w-28" aria-label={`Status ${inv.number}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(STATUS_LABEL).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(inv: InvoiceRow) {
    setEditing(inv);
    setDialogOpen(true);
  }

  async function handleDelete(inv: InvoiceRow) {
    if (!confirm(`Hapus invoice "${inv.number}"?`)) return;
    setBusyId(inv.id);
    const res = await deleteInvoice(inv.id);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Invoice dihapus");
    router.refresh();
  }

  async function handleSetStatus(id: string, status: string) {
    setBusyId(id);
    const res = await setInvoiceStatus(id, status);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Status diubah ke ${STATUS_LABEL[status] ?? status}`);
    router.refresh();
  }

  const typeFilter = (columnFilters.find((f) => f.id === "type")?.value ??
    "") as string;
  const statusFilter = (columnFilters.find((f) => f.id === "status")?.value ??
    "") as string;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Receivable &amp; Payable
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola invoice piutang (dari pelanggan) dan hutang (ke pemasok).
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          Tambah Invoice
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari nomor / deskripsi…"
            className="h-8 w-64 pl-8"
            aria-label="Cari invoice"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setColumnFilters((prev) => [
              ...prev.filter((f) => f.id !== "type"),
              ...(v && v !== "semua" ? [{ id: "type", value: v }] : []),
            ]);
          }}
        >
          <SelectTrigger className="h-8 w-36" aria-label="Filter tipe">
            <SelectValue placeholder="Semua tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="semua">Semua tipe</SelectItem>
              <SelectItem value="receivable">Piutang</SelectItem>
              <SelectItem value="payable">Hutang</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setColumnFilters((prev) => [
              ...prev.filter((f) => f.id !== "status"),
              ...(v && v !== "semua" ? [{ id: "status", value: v }] : []),
            ]);
          }}
        >
          <SelectTrigger className="h-8 w-36" aria-label="Filter status">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="semua">Semua status</SelectItem>
              {Object.entries(STATUS_LABEL).map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} dari {invoices.length} invoice
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-10 text-center text-muted-foreground"
                >
                  Tidak ada invoice yang cocok dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InvoiceFormDialog
        key={editing ? `edit-${editing.id}` : "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        invoice={editing}
        customers={customers}
        suppliers={suppliers}
      />
    </div>
  );
}
