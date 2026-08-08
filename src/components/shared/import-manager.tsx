"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Upload,
  Trash2,
  AlertTriangle,
  FileText,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import {
  processImport,
  deleteImportBatch,
} from "@/lib/actions/import";
import type { ImportBatchRow, ImportError } from "@/lib/actions/import";

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
      className={`inline-flex items-center gap-1.5 ${
        sorted !== false ? "text-foreground" : ""
      } ${className ?? ""}`}
    >
      {children}
      <Icon className="size-3.5 opacity-60" />
    </span>
  );
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "pending":
      return "secondary";
    case "processing":
      return "outline";
    case "completed":
      return "default";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Menunggu";
    case "processing":
      return "Diproses";
    case "completed":
      return "Selesai";
    case "failed":
      return "Gagal";
    default:
      return status;
  }
}

export function ImportManager({ batches }: { batches: ImportBatchRow[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [errorsDialog, setErrorsDialog] = useState<{
    open: boolean;
    errors: ImportError[];
    filename: string;
  }>({ open: false, errors: [], filename: "" });

  const data = useMemo(() => batches, [batches]);

  const columns = useMemo<ColumnDef<ImportBatchRow>[]>(
    () => [
      {
        id: "filename",
        accessorKey: "filename",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>File</SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2 font-medium">
            <FileText className="size-4 text-muted-foreground" />
            {row.original.filename}
          </span>
        ),
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
            <SortableHeader sorted={column.getIsSorted()}>
              Status
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <Badge variant={statusBadgeVariant(row.original.status)}>
            {statusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        id: "totalRows",
        accessorKey: "totalRows",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Total Baris
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.totalRows}</span>
        ),
      },
      {
        id: "successRows",
        accessorKey: "successRows",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Berhasil
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
            {row.original.successRows}
          </span>
        ),
      },
      {
        id: "errorRows",
        accessorKey: "errorRows",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Gagal
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => (
          <span className="tabular-nums text-destructive">
            {row.original.errorRows}
          </span>
        ),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex"
            onClick={column.getToggleSortingHandler()}
          >
            <SortableHeader sorted={column.getIsSorted()}>
              Dibuat
            </SortableHeader>
          </button>
        ),
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Aksi</span>,
        cell: ({ row }) => {
          const batch = row.original;
          return (
            <div className="flex justify-end gap-1">
              {batch.errorRows > 0 && batch.errorLog && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    let parsed: ImportError[] = [];
                    try {
                      parsed = JSON.parse(batch.errorLog!) as ImportError[];
                    } catch {
                      parsed = [{ row: 0, message: batch.errorLog! }];
                    }
                    setErrorsDialog({
                      open: true,
                      errors: parsed,
                      filename: batch.filename,
                    });
                  }}
                >
                  <AlertTriangle className="mr-1 size-3.5" />
                  Errors
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={busy}
                onClick={() => handleDelete(batch)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [busy],
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

  const statusFilterVal = (columnFilters.find((f) => f.id === "status")?.value ??
    "") as string;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target.value) e.target.value = "";

    if (!file.name.endsWith(".csv")) {
      toast.error("Hanya file CSV yang didukung");
      return;
    }

    setBusy(true);
    const toastId = toast.loading("Mengimpor CSV…");

    try {
      const content = await file.text();
      const result = await processImport(file.name, content);

      if (!result.ok) {
        toast.error(result.error, { id: toastId });
        return;
      }

      const { totalRows, successRows, errorRows } = result.data!;
      toast.success(
        `Import selesai: ${successRows}/${totalRows} baris berhasil${errorRows > 0 ? `, ${errorRows} gagal` : ""}`,
        { id: toastId },
      );
      router.refresh();
    } catch (err) {
      toast.error("Gagal membaca file", { id: toastId });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(batch: ImportBatchRow) {
    if (!confirm(`Hapus batch import "${batch.filename}"?`)) return;
    setBusy(true);
    const res = await deleteImportBatch(batch.id);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Batch import dihapus");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Import Data
          </h1>
          <p className="text-sm text-muted-foreground">
            Import transaksi dari file CSV — format: date, type, description,
            amount, currency.
          </p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
        >
          <Upload className="mr-1.5 size-4" />
          Upload CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari file…"
            className="h-8 w-64 pl-8"
            aria-label="Cari batch"
          />
        </div>
        <Select
          value={statusFilterVal}
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
              <SelectItem value="pending">Menunggu</SelectItem>
              <SelectItem value="processing">Diproses</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
              <SelectItem value="failed">Gagal</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} dari {batches.length} batch
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
                  {batches.length === 0
                    ? "Belum ada batch import — upload file CSV untuk memulai."
                    : "Tidak ada batch yang cocok dengan filter."}
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

      <Dialog
        open={errorsDialog.open}
        onOpenChange={(open) =>
          setErrorsDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Error Import — {errorsDialog.filename}</DialogTitle>
            <DialogDescription>
              {errorsDialog.errors.length} baris gagal diproses.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {errorsDialog.errors.map((err, i) => (
              <div
                key={i}
                className="rounded-lg bg-destructive/5 px-3 py-2 text-xs"
              >
                <span className="font-medium text-destructive">
                  Baris {err.row}
                </span>
                <span className="ml-2 text-muted-foreground">
                  {err.message}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setErrorsDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
