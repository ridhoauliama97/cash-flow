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
  Pencil,
  Trash2,
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
import { ProductFormDialog } from "@/components/shared/product-form-dialog";
import { deleteProduct, type ProductRow } from "@/lib/actions/products";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

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

export function ProductManager({ rows }: { rows: ProductRow[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const data = useMemo(() => rows, [rows]);

  const columns = useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>Nama</SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        id: "sku",
        accessorKey: "sku",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>SKU</SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.sku ?? "—"}</span>
        ),
      },
      {
        id: "description",
        accessorKey: "description",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Deskripsi
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.description ?? "—"}
          </span>
        ),
      },
      {
        id: "price",
        accessorKey: "price",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>Harga</SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatIDR(row.original.price)}</span>
        ),
      },
      {
        id: "currency",
        accessorKey: "currency",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Mata Uang
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.currency}</span>
        ),
      },
      {
        id: "isActive",
        accessorKey: "isActive",
        filterFn: (row, columnId, filterValue: string) => {
          if (filterValue === "aktif")
            return row.getValue<boolean>(columnId) === true;
          if (filterValue === "nonaktif")
            return row.getValue<boolean>(columnId) === false;
          return true;
        },
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Status
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => {
          const prod = row.original;
          return (
            <Badge
              variant={prod.isActive ? "default" : "secondary"}
              className={cn(
                prod.isActive &&
                  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
              )}
            >
              {prod.isActive ? "Aktif" : "Nonaktif"}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Aksi</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={busyId === row.original.id}
              onClick={() => openEdit(row.original)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive"
              disabled={busyId === row.original.id}
              onClick={() => handleDelete(row.original)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
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

  function openEdit(product: ProductRow) {
    setEditing(product);
    setDialogOpen(true);
  }

  async function handleDelete(product: ProductRow) {
    if (!confirm(`Hapus produk "${product.name}"?`)) return;
    setBusyId(product.id);
    const res = await deleteProduct(product.id);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Produk dihapus");
    router.refresh();
  }

  const statusFilter = (columnFilters.find((f) => f.id === "isActive")?.value ??
    "") as string;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Produk
        </h1>
        <p className="text-sm text-muted-foreground">
          Daftar produk — master data nama, SKU, dan harga.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari nama / SKU…"
            className="h-8 w-64 pl-8"
            aria-label="Cari produk"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setColumnFilters((prev) => [
              ...prev.filter((f) => f.id !== "isActive"),
              ...(v && v !== "semua" ? [{ id: "isActive", value: v }] : []),
            ]);
          }}
        >
          <SelectTrigger className="h-8 w-36" aria-label="Filter status">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="semua">Semua status</SelectItem>
              <SelectItem value="aktif">Aktif</SelectItem>
              <SelectItem value="nonaktif">Nonaktif</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1.5 size-4" />
          Tambah
        </Button>
        <span className="text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} dari {rows.length} produk
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
                  Tidak ada produk yang cocok dengan filter.
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

      <ProductFormDialog
        key={editing ? `edit-${editing.id}` : "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
      />
    </div>
  );
}
