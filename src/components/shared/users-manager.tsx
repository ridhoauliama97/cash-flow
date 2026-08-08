"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  UserRound,
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
import { Switch } from "@/components/ui/switch";
import { UserFormDialog } from "@/components/shared/user-form-dialog";
import { setUserActive } from "@/lib/actions/users";
import { cn } from "@/lib/utils";
import type { UserRow } from "@/lib/actions/users";
import type { RoleRow } from "@/lib/actions/roles";

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

export function UsersManager({
  rows,
  roles,
  superAdminIds,
}: {
  rows: UserRow[];
  roles: RoleRow[];
  superAdminIds: string[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const isSuperAdmin = (u: UserRow) => superAdminIds.includes(u.id);

  const divisions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.divisionName).filter((d): d is string => d !== null))).sort(),
    [rows],
  );

  const data = useMemo(() => rows, [rows]);

  const columns = useMemo<ColumnDef<UserRow>[]>(
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
              <UserRound className="size-3.5" />
            </span>
            <span className="font-medium">{row.original.name ?? "—"}</span>
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
          <span className="font-mono text-xs">{row.original.email}</span>
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
        cell: ({ row }) => row.original.divisionName ?? "—",
      },
      {
        id: "roles",
        accessorFn: (u) => u.roles.map((r) => r.name).join(", "),
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>Role</SortableHeader>
          </button>
        ),
        cell: ({ row }) => {
          const userRoles = row.original.roles;
          return (
            <div className="flex flex-wrap gap-1">
              {userRoles.length === 0 && (
                <span className="text-xs text-muted-foreground">tanpa role</span>
              )}
              {userRoles.map((r) => (
                <Badge key={r.id} variant="secondary" className="capitalize">
                  {r.name}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        id: "isActive",
        accessorKey: "isActive",
        filterFn: (row, columnId, filterValue: string) => {
          if (filterValue === "aktif") return row.getValue<boolean>(columnId) === true;
          if (filterValue === "nonaktif") return row.getValue<boolean>(columnId) === false;
          return true;
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
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex items-center gap-2">
              <Switch
                checked={user.isActive}
                disabled={busyId === user.id || isSuperAdmin(user)}
                onCheckedChange={(v) => handleToggleActive(user, v)}
                aria-label={`Status aktif ${user.name ?? user.email}`}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  user.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                )}
              >
                {user.isActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>
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
              size="sm"
              disabled={isSuperAdmin(row.original)}
              onClick={() => openEdit(row.original)}
            >
              Edit Role
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId, superAdminIds],
  );

  // useReactTable: hasilnya unstable per render — data/columns sudah di-memoize
  // (lihat useMemo di atas); peringatan ini bukan error dan tidak menggagalkan CI.
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

  function openEdit(user: UserRow) {
    setEditing(user);
    setDialogOpen(true);
  }

  async function handleToggleActive(user: UserRow, next: boolean) {
    setBusyId(user.id);
    const res = await setUserActive(user.id, next);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(next ? "User diaktifkan" : "User dinonaktifkan");
    router.refresh();
  }

  const statusFilter = (columnFilters.find((f) => f.id === "isActive")?.value ??
    "") as string;
  const divisionFilter = (columnFilters.find((f) => f.id === "divisionName")?.value ??
    "") as string;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Kelola role dan status user. Data milik Super Admin tidak bisa diubah.
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
            aria-label="Cari user"
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
        <Select
          value={divisionFilter}
          onValueChange={(v) => {
            setColumnFilters((prev) => [
              ...prev.filter((f) => f.id !== "divisionName"),
              ...(v && v !== "semua" ? [{ id: "divisionName", value: v }] : []),
            ]);
          }}
        >
          <SelectTrigger className="h-8 w-44" aria-label="Filter divisi">
            <SelectValue placeholder="Semua divisi" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="semua">Semua divisi</SelectItem>
              {divisions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} dari {rows.length} user
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
                  Tidak ada user yang cocok dengan filter.
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

      <UserFormDialog
        key={editing ? `edit-${editing.id}` : "closed"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editing}
        roles={roles}
      />
    </div>
  );
}
