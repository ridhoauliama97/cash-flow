"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TransactionRow } from "@/lib/actions/transactions";
import { formatAmount, formatDate, formatIDR } from "@/lib/format";
import type {
  TransactionStatus,
  TransactionTypeFase1,
} from "@/types/ledger";

export const TRANSACTION_TYPE_LABELS: Record<TransactionTypeFase1, string> = {
  income: "Pemasukan",
  expense: "Pengeluaran",
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  draft: "Draft",
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  posted: "Diposting",
};

const STATUS_BADGE_VARIANTS: Record<
  TransactionStatus,
  "default" | "secondary" | "outline" | "destructive" | "success"
> = {
  draft: "secondary",
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  posted: "success",
};

export interface TransactionsTableProps {
  rows: TransactionRow[];
  onDelete: (row: TransactionRow) => void;
  onEdit: (row: TransactionRow) => void;
  onSubmit: (row: TransactionRow) => void;
  onPost: (row: TransactionRow) => void;
}

export function TransactionsTable({ rows, onDelete, onEdit, onSubmit, onPost }: TransactionsTableProps) {
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Tanggal</TableHead>
            <TableHead className="w-28">Tipe</TableHead>
            <TableHead>Deskripsi</TableHead>
            <TableHead className="text-right">Jumlah</TableHead>
            <TableHead className="text-right">Base IDR</TableHead>
            <TableHead className="w-40">Cost center</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-24 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="py-10 text-center text-muted-foreground"
              >
                Belum ada transaksi — tambah transaksi kas pertama.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  {formatDate(row.date)}
                  {row.createdByName && (
                    <div className="text-xs text-muted-foreground">
                      oleh {row.createdByName}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      row.type === "expense" ? "destructive" : "default"
                    }
                    className={
                      row.type === "income"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : undefined
                    }
                  >
                    {TRANSACTION_TYPE_LABELS[row.type]}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-72 truncate">
                  {row.description}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {formatAmount(row.amount)}{" "}
                  <span className="text-muted-foreground">{row.currency}</span>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {formatIDR(row.baseAmount)}
                </TableCell>
                <TableCell className="truncate text-muted-foreground">
                  {row.costCenterName ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANTS[row.status]}>
                    {TRANSACTION_STATUS_LABELS[row.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {row.status === "draft" ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(row)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSubmit(row)}
                        >
                          Ajukan
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPost(row)}
                        >
                          Posting
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => onDelete(row)}
                        >
                          Hapus
                        </Button>
                      </>
                    ) : row.status === "approved" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPost(row)}
                      >
                        Posting
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
