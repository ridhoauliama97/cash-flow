"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, Shield } from "lucide-react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
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
import { RoleFormDialog } from "@/components/shared/role-form-dialog";
import { deleteRole } from "@/lib/actions/roles";
import { ROLE_LEVELS, SUPER_ADMIN_ROLE_NAME } from "@/types/rbac";
import { cn } from "@/lib/utils";
import type { RoleRow, DivisionRow } from "@/lib/actions/roles";

const LEVEL_LABELS: Record<string, string> = {
  staff: "Staff",
  kepala: "Kepala",
  direktur: "Direktur",
  admin: "Admin",
  superadmin: "Super Admin",
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
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;
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

export function RolesManager({
  rows,
  divisions,
}: {
  rows: RoleRow[];
  divisions: DivisionRow[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const data = useMemo(() => rows, [rows]);

  const columns = useMemo<ColumnDef<RoleRow>[]>(
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
        cell: ({ row }) => {
          const isSuperAdmin = row.original.name === SUPER_ADMIN_ROLE_NAME;
          return (
            <span className="inline-flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
                  isSuperAdmin && "bg-primary/10 text-primary",
                )}
              >
                <Shield className="size-3.5" />
              </span>
              <span className="font-medium">
                {row.original.name}
                {isSuperAdmin && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (dilindungi)
                  </span>
                )}
              </span>
            </span>
          );
        },
      },
      {
        id: "level",
        accessorKey: "level",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>Level</SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <Badge variant="secondary" className="capitalize">
            {LEVEL_LABELS[row.original.level] ?? row.original.level}
          </Badge>
        ),
      },
      {
        id: "divisionName",
        accessorKey: "divisionName",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>Divisi</SortableHeader>
          </button>
        ),
        cell: ({ row }) => row.original.divisionName ?? "Semua divisi",
      },
      {
        id: "permissionCount",
        accessorKey: "permissionCount",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>Permissions</SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.permissionCount}</span>
        ),
      },
      {
        id: "userCount",
        accessorKey: "userCount",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>Users</SortableHeader>
          </button>
        ),
        cell: ({ row }) => <span className="tabular-nums">{row.original.userCount}</span>,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Aksi</span>,
        cell: ({ row }) => {
          const isProtected = row.original.name === SUPER_ADMIN_ROLE_NAME;
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={isProtected}
                onClick={() => openEdit(row.original)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={isProtected}
                onClick={() => handleDelete(row.original)}
              >
                Hapus
              </Button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // useReactTable: hasilnya unstable per render — data/columns sudah di-memoize.
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

  function openEdit(role: RoleRow) {
    setEditing(role);
    setDialogOpen(true);
  }

  async function handleDelete(role: RoleRow) {
    if (!confirm(`Hapus role "${role.name}"?`)) return;
    const res = await deleteRole(role.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Role dihapus");
    router.refresh();
  }

  const levelFilter = (columnFilters.find((f) => f.id === "level")?.value ??
    "") as string;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Definisikan role, level, dan divisi — basis pemberian permission.
          </p>
        </div>
        <Button onClick={openCreate}>Tambah Role</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari role…"
            className="h-8 w-64 pl-8"
            aria-label="Cari role"
          />
        </div>
        <Select
          value={levelFilter}
          onValueChange={(v) => {
            setColumnFilters((prev) => [
              ...prev.filter((f) => f.id !== "level"),
              ...(v && v !== "semua" ? [{ id: "level", value: v }] : []),
            ]);
          }}
        >
          <SelectTrigger className="h-8 w-40" aria-label="Filter level">
            <SelectValue placeholder="Semua level" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="semua">Semua level</SelectItem>
              {ROLE_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {LEVEL_LABELS[l] ?? l}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} dari {rows.length} role
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
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                  Tidak ada role yang cocok dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RoleFormDialog
        key={editing ? `edit-${editing.id}` : "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        role={editing}
        divisions={divisions}
      />
    </div>
  );
}
