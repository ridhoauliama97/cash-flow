"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
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
import { PeriodFormDialog } from "@/components/shared/period-form-dialog";
import {
  closePeriod,
  deletePeriod,
  reopenPeriod,
  type PeriodRow,
} from "@/lib/actions/periods";
import { cn } from "@/lib/utils";

function SortableHeader({
  sorted,
  children,
}: {
  sorted: false | "asc" | "desc";
  children: React.ReactNode;
}) {
  const Icon =
    sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        sorted !== false && "text-foreground",
      )}
    >
      {children}
      <Icon className="size-3.5 opacity-60" />
    </span>
  );
}

export function PeriodManager({ periods }: { periods: PeriodRow[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PeriodRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const data = useMemo(() => periods, [periods]);

  const columns = useMemo<ColumnDef<PeriodRow>[]>(
    () => [
      {
        id: "startDate",
        accessorKey: "startDate",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>Mulai</SortableHeader>
          </button>
        ),
        cell: ({ row }) =>
          new Date(row.original.startDate).toLocaleDateString("id-ID"),
      },
      {
        id: "endDate",
        accessorKey: "endDate",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Selesai
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) =>
          new Date(row.original.endDate).toLocaleDateString("id-ID"),
      },
      {
        id: "status",
        accessorKey: "status",
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
          <Badge
            variant={row.original.status === "Open" ? "success" : "secondary"}
          >
            {row.original.status === "Open" ? "Terbuka" : "Tertutup"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Aksi</span>,
        cell: ({ row }) => {
          const p = row.original;
          const busy = busyId === p.id;
          return (
            <div className="flex justify-end gap-1">
              {p.status === "Open" ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(p)}
                  >
                    Hapus
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={busy}
                    onClick={() => handleClose(p)}
                  >
                    Tutup
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleReopen(p)}
                >
                  Buka Kembali
                </Button>
              )}
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

  function openEdit(period: PeriodRow) {
    setEditing(period);
    setDialogOpen(true);
  }

  async function handleDelete(period: PeriodRow) {
    if (
      !confirm(
        `Hapus periode ${new Date(period.startDate).toLocaleDateString("id-ID")} — ${new Date(period.endDate).toLocaleDateString("id-ID")}?`,
      )
    )
      return;
    const res = await deletePeriod(period.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Periode dihapus");
    router.refresh();
  }

  async function handleClose(period: PeriodRow) {
    if (
      !confirm(
        `Tutup periode ${new Date(period.startDate).toLocaleDateString("id-ID")} — ${new Date(period.endDate).toLocaleDateString("id-ID")}?`,
      )
    )
      return;
    setBusyId(period.id);
    const res = await closePeriod(period.id);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Periode ditutup");
    router.refresh();
  }

  async function handleReopen(period: PeriodRow) {
    if (
      !confirm(
        `Buka kembali periode ${new Date(period.startDate).toLocaleDateString("id-ID")} — ${new Date(period.endDate).toLocaleDateString("id-ID")}?`,
      )
    )
      return;
    setBusyId(period.id);
    const res = await reopenPeriod(period.id);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Periode dibuka kembali");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Periode Akuntansi
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola periode akuntansi — transaksi harus berada dalam periode
            terbuka.
          </p>
        </div>
        <Button onClick={openCreate}>Tambah Periode</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari periode…"
            className="h-8 w-64 pl-8"
            aria-label="Cari periode"
          />
        </div>
        <Select
          value={
            (columnFilters.find((f) => f.id === "status")?.value ??
              "") as string
          }
          onValueChange={(v) => {
            setColumnFilters((prev) => [
              ...prev.filter((f) => f.id !== "status"),
              ...(v && v !== "" ? [{ id: "status", value: v }] : []),
            ]);
          }}
        >
          <SelectTrigger className="h-8 w-36" aria-label="Filter status">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">Semua status</SelectItem>
              <SelectItem value="Open">Terbuka</SelectItem>
              <SelectItem value="Closed">Tertutup</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} dari {periods.length}{" "}
          periode
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
                  Belum ada periode — tambahkan periode pertama.
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

      <PeriodFormDialog
        key={editing ? `edit-${editing.id}` : "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        period={editing}
      />
    </div>
  );
}
