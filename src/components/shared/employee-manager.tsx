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
import { EmployeeFormDialog } from "@/components/shared/employee-form-dialog";
import { deleteEmployee, type EmployeeRow } from "@/lib/actions/employees";
import type { DivisionRow } from "@/lib/actions/divisions";
import type { DepartmentRow } from "@/lib/actions/departments";
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

export function EmployeeManager({
  rows,
  divisions,
  departments,
}: {
  rows: EmployeeRow[];
  divisions: DivisionRow[];
  departments: DepartmentRow[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const divisionNames = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((r) => r.divisionName)
            .filter((d): d is string => d !== null),
        ),
      ).sort(),
    [rows],
  );

  const departmentNames = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((r) => r.departmentName)
            .filter((d): d is string => d !== null),
        ),
      ).sort(),
    [rows],
  );

  const data = useMemo(() => rows, [rows]);

  const columns = useMemo<ColumnDef<EmployeeRow>[]>(
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
        id: "divisionName",
        accessorKey: "divisionName",
        filterFn: (row, columnId, filterValue: string) => {
          if (filterValue === "semua") return true;
          return row.getValue<string | null>(columnId) === filterValue;
        },
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Divisi
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => row.original.divisionName ?? "—",
      },
      {
        id: "departmentName",
        accessorKey: "departmentName",
        filterFn: (row, columnId, filterValue: string) => {
          if (filterValue === "semua") return true;
          return row.getValue<string | null>(columnId) === filterValue;
        },
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Departemen
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        id: "position",
        accessorKey: "position",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Posisi
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => row.original.position ?? "—",
      },
      {
        id: "isActive",
        accessorKey: "isActive",
        filterFn: (row, columnId, filterValue: string) => {
          if (filterValue === "Aktif")
            return row.getValue<boolean>(columnId) === true;
          if (filterValue === "Nonaktif")
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
          const emp = row.original;
          return (
            <Badge
              variant={emp.isActive ? "default" : "secondary"}
              className={cn(
                emp.isActive &&
                  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
              )}
            >
              {emp.isActive ? "Aktif" : "Nonaktif"}
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

  function openEdit(employee: EmployeeRow) {
    setEditing(employee);
    setDialogOpen(true);
  }

  async function handleDelete(employee: EmployeeRow) {
    if (!confirm(`Hapus karyawan "${employee.name}"?`)) return;
    setBusyId(employee.id);
    const res = await deleteEmployee(employee.id);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Karyawan dihapus");
    router.refresh();
  }

  const statusFilter = (columnFilters.find((f) => f.id === "isActive")?.value ??
    "") as string;
  const divisionFilter = (columnFilters.find((f) => f.id === "divisionName")
    ?.value ?? "") as string;
  const departmentFilter = (columnFilters.find((f) => f.id === "departmentName")
    ?.value ?? "") as string;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Karyawan
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola data karyawan — nama, divisi, departemen, dan posisi.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari nama / email…"
            className="h-8 w-64 pl-8"
            aria-label="Cari karyawan"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setColumnFilters((prev) => [
              ...prev.filter((f) => f.id !== "isActive"),
              ...(v && v !== "" ? [{ id: "isActive", value: v }] : []),
            ]);
          }}
        >
          <SelectTrigger className="h-8 w-36" aria-label="Filter status">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">Semua status</SelectItem>
              <SelectItem value="Aktif">Aktif</SelectItem>
              <SelectItem value="Nonaktif">Nonaktif</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={divisionFilter}
          onValueChange={(v) => {
            setColumnFilters((prev) => [
              ...prev.filter((f) => f.id !== "divisionName"),
              ...(v && v !== "" ? [{ id: "divisionName", value: v }] : []),
            ]);
          }}
        >
          <SelectTrigger className="h-8 w-44" aria-label="Filter divisi">
            <SelectValue placeholder="Semua divisi" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">Semua divisi</SelectItem>
              {divisionNames.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={departmentFilter}
          onValueChange={(v) => {
            setColumnFilters((prev) => [
              ...prev.filter((f) => f.id !== "departmentName"),
              ...(v && v !== "" ? [{ id: "departmentName", value: v }] : []),
            ]);
          }}
        >
          <SelectTrigger className="h-8 w-48" aria-label="Filter departemen">
            <SelectValue placeholder="Semua departemen" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">Semua departemen</SelectItem>
              {departmentNames.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
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
          {table.getFilteredRowModel().rows.length} dari {rows.length} karyawan
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
                  Tidak ada karyawan yang cocok dengan filter.
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

      <EmployeeFormDialog
        key={editing ? `edit-${editing.id}` : "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={editing}
        divisions={divisions}
        departments={departments}
      />
    </div>
  );
}
