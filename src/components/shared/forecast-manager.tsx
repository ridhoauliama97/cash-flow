"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronsUpDown, ArrowUp, ArrowDown, Search, Plus } from "lucide-react";
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
import { ForecastFormDialog } from "@/components/shared/forecast-form-dialog";
import { deleteForecast } from "@/lib/actions/forecasts";
import { formatMonth } from "@/lib/utils-forecast";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ForecastRow } from "@/lib/actions/forecasts";

const CATEGORY_VARIANT: Record<string, "success" | "destructive" | "default"> =
  {
    revenue: "success",
    expense: "destructive",
    profit: "default",
  };

const CATEGORY_LABEL: Record<string, string> = {
  revenue: "Pendapatan",
  expense: "Beban",
  profit: "Laba",
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

export function ForecastManager({ forecasts }: { forecasts: ForecastRow[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ForecastRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const years = useMemo(
    () => Array.from(new Set(forecasts.map((f) => f.year))).sort(),
    [forecasts],
  );

  const data = useMemo(() => forecasts, [forecasts]);

  const columns = useMemo<ColumnDef<ForecastRow>[]>(
    () => [
      {
        id: "year",
        accessorKey: "year",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>Tahun</SortableHeader>
          </button>
        ),
        cell: ({ row }) => row.original.year,
      },
      {
        id: "month",
        accessorKey: "month",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>Bulan</SortableHeader>
          </button>
        ),
        cell: ({ row }) => formatMonth(row.original.month),
      },
      {
        id: "category",
        accessorKey: "category",
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
            <SortableHeader sorted={column.getIsSorted()}>
              Kategori
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <Badge
            variant={CATEGORY_VARIANT[row.original.category] ?? "secondary"}
          >
            {CATEGORY_LABEL[row.original.category] ?? row.original.category}
          </Badge>
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
        cell: ({ row }) => row.original.description ?? "—",
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
            <SortableHeader sorted={column.getIsSorted()}>
              Jumlah
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{formatIDR(row.original.amount)}</span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Aksi</span>,
        cell: ({ row }) => {
          const f = row.original;
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={busyId === f.id}
                onClick={() => openEdit(f)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busyId === f.id}
                className="text-destructive"
                onClick={() => handleDelete(f)}
              >
                Hapus
              </Button>
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

  function openEdit(f: ForecastRow) {
    setEditing(f);
    setDialogOpen(true);
  }

  async function handleDelete(f: ForecastRow) {
    if (
      !confirm(
        `Hapus forecast ${CATEGORY_LABEL[f.category] ?? f.category} — ${formatMonth(f.month)} ${f.year}?`,
      )
    )
      return;
    setBusyId(f.id);
    const res = await deleteForecast(f.id);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Forecast dihapus");
    router.refresh();
  }

  const yearFilter = (columnFilters.find((f) => f.id === "year")?.value ??
    "") as string;
  const categoryFilter = (columnFilters.find((f) => f.id === "category")
    ?.value ?? "") as string;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Forecast
          </h1>
          <p className="text-sm text-muted-foreground">
            Proyeksi arus kas — pendapatan, beban, dan laba per bulan.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          Tambah Forecast
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari deskripsi…"
            className="h-8 w-64 pl-8"
            aria-label="Cari forecast"
          />
        </div>
        <Select
          value={yearFilter}
          onValueChange={(v) => {
            setColumnFilters((prev) => [
              ...prev.filter((f) => f.id !== "year"),
              ...(v && v !== "semua" ? [{ id: "year", value: v }] : []),
            ]);
          }}
        >
          <SelectTrigger className="h-8 w-32" aria-label="Filter tahun">
            <SelectValue placeholder="Semua tahun" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="semua">Semua tahun</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setColumnFilters((prev) => [
              ...prev.filter((f) => f.id !== "category"),
              ...(v && v !== "" ? [{ id: "category", value: v }] : []),
            ]);
          }}
        >
          <SelectTrigger className="h-8 w-40" aria-label="Filter kategori">
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">Semua kategori</SelectItem>
              <SelectItem value="Revenue">Pendapatan</SelectItem>
              <SelectItem value="Expense">Beban</SelectItem>
              <SelectItem value="Profit">Laba</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} dari {forecasts.length}{" "}
          forecast
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
                  Tidak ada forecast yang cocok dengan filter.
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

      <ForecastFormDialog
        key={editing ? `edit-${editing.id}` : "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        forecast={editing}
      />
    </div>
  );
}
