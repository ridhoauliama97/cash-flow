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
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DivisionFormDialog } from "@/components/shared/division-form-dialog";
import { deleteDivision } from "@/lib/actions/divisions";
import { cn } from "@/lib/utils";
import type { DivisionRow } from "@/lib/actions/divisions";

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

export function DivisionManager({ rows }: { rows: DivisionRow[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DivisionRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const data = useMemo(() => rows, [rows]);

  const columns = useMemo<ColumnDef<DivisionRow>[]>(
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
        id: "employeeCount",
        accessorKey: "employeeCount",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Jumlah User
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.employeeCount}
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
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function openEdit(division: DivisionRow) {
    setEditing(division);
    setDialogOpen(true);
  }

  async function handleDelete(division: DivisionRow) {
    if (!confirm(`Hapus divisi "${division.name}"?`)) return;
    setBusyId(division.id);
    const res = await deleteDivision(division.id);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Divisi dihapus");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Divisi
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola divisi organisasi.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari divisi…"
            className="h-8 w-64 pl-8"
            aria-label="Cari divisi"
          />
        </div>
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
          {table.getFilteredRowModel().rows.length} dari {rows.length} divisi
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
                  Tidak ada divisi yang cocok dengan filter.
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

      <DivisionFormDialog
        key={editing ? `edit-${editing.id}` : "closed"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        division={editing}
      />
    </div>
  );
}
