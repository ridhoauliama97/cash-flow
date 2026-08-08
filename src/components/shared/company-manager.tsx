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
  Building2,
  Star,
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
import { CompanyFormDialog } from "@/components/shared/company-form-dialog";
import { deleteCompany } from "@/lib/actions/companies";
import { cn } from "@/lib/utils";
import type { CompanyRow } from "@/lib/actions/companies";

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

export function CompanyManager({ rows }: { rows: CompanyRow[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const data = useMemo(() => rows, [rows]);

  const columns = useMemo<ColumnDef<CompanyRow>[]>(
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
          <span className="inline-flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Building2 className="size-3.5" />
            </span>
            <span className="font-medium">
              {row.original.name}
              {row.original.defaultCompany && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  <Star className="mr-1 size-3" />
                  Default
                </Badge>
              )}
            </span>
          </span>
        ),
      },
      {
        id: "email",
        accessorKey: "email",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>Email</SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.email ?? "—"}</span>
        ),
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Telepon
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => row.original.phone ?? "—",
      },
      {
        id: "taxNumber",
        accessorKey: "taxNumber",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>NPWP</SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.taxNumber ?? "—"}
          </span>
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
        cell: ({ row }) => (
          <span
            className={cn(
              "text-xs font-medium",
              row.original.isActive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground",
            )}
          >
            {row.original.isActive ? "Aktif" : "Nonaktif"}
          </span>
        ),
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
              disabled={
                busyId === row.original.id || row.original.defaultCompany
              }
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

  function openEdit(company: CompanyRow) {
    setEditing(company);
    setDialogOpen(true);
  }

  async function handleDelete(company: CompanyRow) {
    if (!confirm(`Hapus perusahaan "${company.name}"?`)) return;
    setBusyId(company.id);
    const res = await deleteCompany(company.id);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Perusahaan dihapus");
    router.refresh();
  }

  const statusFilter = (columnFilters.find((f) => f.id === "isActive")?.value ??
    "") as string;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Perusahaan
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola data perusahaan. Perusahaan default tidak bisa dihapus.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari perusahaan…"
            className="h-8 w-64 pl-8"
            aria-label="Cari perusahaan"
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
          {table.getFilteredRowModel().rows.length} dari {rows.length} perusahaan
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
                  Tidak ada perusahaan yang cocok dengan filter.
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

      <CompanyFormDialog
        key={editing ? `edit-${editing.id}` : "closed"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        company={editing}
      />
    </div>
  );
}
