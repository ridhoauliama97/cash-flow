"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AccountingPeriodRow } from "@/lib/actions/general-ledger";
import { formatDate, formatIDR } from "@/lib/format";
import type { GlRow, GlTotals } from "@/lib/general-ledger";

export interface GlTableProps {
  rows: GlRow[];
  totals: GlTotals;
}

/** Tabel Buku Besar: saldo per akun + footer total debit/kredit. */
export function GlTable({ rows, totals }: GlTableProps) {
  const balanced = totals.debit === totals.credit;
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Kode</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Kredit</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-10 text-center text-muted-foreground"
              >
                Belum ada jurnal
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.accountId}>
                <TableCell className="font-mono text-xs">{row.code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {formatIDR(row.debit)}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {formatIDR(row.credit)}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {formatIDR(row.balance)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {rows.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="text-right">
                Total
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {formatIDR(totals.debit)}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {formatIDR(totals.credit)}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-2">
                  {formatIDR(totals.debit - totals.credit)}
                  {!balanced && (
                    <Badge variant="destructive">Tidak balance</Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}

export interface GlReportClientProps {
  periods: AccountingPeriodRow[];
  rows: GlRow[];
  totals: GlTotals;
  initialParams: { period: string; from: string; to: string };
}

/**
 * Wrapper halaman Buku Besar: filter (periode ATAU rentang tanggal) + tabel.
 * Filtering tetap SERVER-side — komponen ini hanya navigasi (router.push
 * dengan query params) saat filter berubah; parent me-remount via `key`
 * (pola CoaManager) supaya state lokal selalu sinkron dengan searchParams.
 */
export function GlReportClient({
  periods,
  rows,
  totals,
  initialParams,
}: GlReportClientProps) {
  const router = useRouter();
  const [period, setPeriod] = useState(initialParams.period);
  const [from, setFrom] = useState(initialParams.from);
  const [to, setTo] = useState(initialParams.to);

  function navigate(period: string, from: string, to: string) {
    const params = new URLSearchParams();
    if (period) params.set("period", period);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    router.push(
      qs ? `/reports/general-ledger?${qs}` : "/reports/general-ledger",
    );
  }

  function handlePeriodChange(value: string) {
    setPeriod(value);
    navigate(value, "", "");
  }

  function handleFromChange(value: string) {
    setFrom(value);
    navigate("", value, to);
  }

  function handleToChange(value: string) {
    setTo(value);
    navigate("", from, value);
  }

  const byPeriod = period !== "";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Buku Besar
        </h1>
        <p className="text-sm text-muted-foreground">
          Saldo per akun dari jurnal yang sudah diposting — filter periode atau
          rentang tanggal.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-2">
          <Label htmlFor="gl-period">Periode</Label>
          <Select
            value={period}
            onValueChange={(v) => handlePeriodChange(v ?? "")}
          >
            <SelectTrigger className="w-56" id="gl-period">
              <SelectValue placeholder="Semua periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="">Semua periode</SelectItem>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {formatDate(p.startDate)} – {formatDate(p.endDate)}
                    {p.status === "closed" ? " (ditutup)" : ""}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="gl-from">Dari</Label>
          <Input
            id="gl-from"
            type="date"
            value={from}
            disabled={byPeriod}
            onChange={(e) => handleFromChange(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="gl-to">Sampai</Label>
          <Input
            id="gl-to"
            type="date"
            value={to}
            disabled={byPeriod}
            onChange={(e) => handleToChange(e.target.value)}
          />
        </div>
      </div>

      <GlTable rows={rows} totals={totals} />
    </div>
  );
}
