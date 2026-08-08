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
import { Switch } from "@/components/ui/switch";
import { ScheduleFormDialog } from "@/components/shared/schedule-form-dialog";
import {
  deleteSchedule,
  toggleSchedule,
  type ScheduleRow,
} from "@/lib/actions/schedules";
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

const FREQUENCY_LABELS: Record<string, string> = {
  Daily: "Harian",
  Weekly: "Mingguan",
  Monthly: "Bulanan",
  Quarterly: "Triwulanan",
};

const FREQUENCY_VARIANT: Record<
  string,
  "secondary" | "default" | "success" | "warning"
> = {
  Daily: "secondary",
  Weekly: "default",
  Monthly: "success",
  Quarterly: "warning",
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  "general-ledger": "General Ledger",
  profitability: "Profitability",
  "cash-flow": "Cash Flow",
  revenue: "Revenue",
  expenses: "Expenses",
};

const DAYS_OF_WEEK_LABELS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

function formatScheduleDescription(s: ScheduleRow): string {
  const time = s.timeOfDay;
  switch (s.frequency) {
    case "Daily":
      return `Setiap hari jam ${time}`;
    case "Weekly": {
      const day = s.dayOfWeek !== null ? DAYS_OF_WEEK_LABELS[s.dayOfWeek] : "—";
      return `Setiap ${day} jam ${time}`;
    }
    case "Monthly": {
      const date = s.dayOfMonth ?? "—";
      return `Setiap bulan tanggal ${date} jam ${time}`;
    }
    case "Quarterly": {
      const date = s.dayOfMonth ?? "—";
      return `Setiap triwulan tanggal ${date} jam ${time}`;
    }
    default:
      return s.frequency;
  }
}

function formatLastSent(at: string | null): string {
  if (!at) return "—";
  try {
    return new Date(at).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return at;
  }
}

export function ScheduleManager({
  schedules,
  userId,
}: {
  schedules: ScheduleRow[];
  userId: string;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const data = useMemo(() => schedules, [schedules]);

  const columns = useMemo<ColumnDef<ScheduleRow>[]>(
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
        id: "reportType",
        accessorKey: "reportType",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Tipe Laporan
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <Badge variant="secondary">
            {REPORT_TYPE_LABELS[row.original.reportType] ??
              row.original.reportType}
          </Badge>
        ),
      },
      {
        id: "frequency",
        accessorKey: "frequency",
        filterFn: (row, columnId, filterValue: string) => {
          if (filterValue === "semua") return true;
          return row.getValue<string>(columnId) === filterValue;
        },
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Frekuensi
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => {
          const f = row.original.frequency;
          return (
            <Badge variant={FREQUENCY_VARIANT[f] ?? "secondary"}>
              {FREQUENCY_LABELS[f] ?? f}
            </Badge>
          );
        },
      },
      {
        id: "description",
        accessorFn: formatScheduleDescription,
        header: "Jadwal",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatScheduleDescription(row.original)}
          </span>
        ),
      },
      {
        id: "recipients",
        accessorFn: (r) => r.recipients.length,
        header: "Penerima",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.recipients.length}</span>
        ),
      },
      {
        id: "format",
        accessorKey: "format",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Format
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs uppercase">
            {row.original.format}
          </span>
        ),
      },
      {
        id: "enabled",
        accessorKey: "enabled",
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
          const s = row.original;
          return (
            <div className="flex items-center gap-2">
              <Switch
                checked={s.enabled}
                disabled={busyId === s.id}
                onCheckedChange={(v) => handleToggle(s, v)}
                aria-label={`Status ${s.name}`}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  s.enabled
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                {s.enabled ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          );
        },
      },
      {
        id: "lastSentAt",
        accessorKey: "lastSentAt",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Terakhir Kirim
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatLastSent(row.original.lastSentAt)}
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
              size="sm"
              onClick={() => openEdit(row.original)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => handleDelete(row.original)}
            >
              Hapus
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

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(schedule: ScheduleRow) {
    setEditing(schedule);
    setDialogOpen(true);
  }

  async function handleDelete(schedule: ScheduleRow) {
    if (!confirm(`Hapus jadwal "${schedule.name}"?`)) return;
    const res = await deleteSchedule(schedule.id, schedule.createdBy);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Jadwal dihapus");
    router.refresh();
  }

  async function handleToggle(schedule: ScheduleRow, next: boolean) {
    setBusyId(schedule.id);
    const res = await toggleSchedule(schedule.id, next);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(next ? "Jadwal diaktifkan" : "Jadwal dinonaktifkan");
    router.refresh();
  }

  const frequencyFilter = (columnFilters.find((f) => f.id === "frequency")
    ?.value ?? "") as string;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Schedules
          </h1>
          <p className="text-sm text-muted-foreground">
            Jadwal pengiriman laporan berkala.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 size-4" />
          Tambah Jadwal
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari nama jadwal…"
            className="h-8 w-64 pl-8"
            aria-label="Cari jadwal"
          />
        </div>
        <Select
          value={frequencyFilter}
          onValueChange={(v) => {
            setColumnFilters((prev) => [
              ...prev.filter((f) => f.id !== "frequency"),
              ...(v && v !== "semua" ? [{ id: "frequency", value: v }] : []),
            ]);
          }}
        >
          <SelectTrigger className="h-8 w-36" aria-label="Filter frekuensi">
            <SelectValue placeholder="Semua frekuensi" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="semua">Semua frekuensi</SelectItem>
              <SelectItem value="Daily">Harian</SelectItem>
              <SelectItem value="Weekly">Mingguan</SelectItem>
              <SelectItem value="Monthly">Bulanan</SelectItem>
              <SelectItem value="Quarterly">Triwulanan</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} dari {schedules.length}{" "}
          jadwal
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
                  Tidak ada jadwal yang cocok dengan filter.
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

      <ScheduleFormDialog
        key={editing ? `edit-${editing.id}` : "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schedule={editing}
        userId={userId}
      />
    </div>
  );
}
