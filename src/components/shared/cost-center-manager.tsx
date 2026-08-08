"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CostCenterFormDialog } from "@/components/shared/cost-center-form-dialog";
import { deleteCostCenter } from "@/lib/actions/cost-centers";
import type { CostCenterRow, DivisionRow } from "@/lib/cost-centers";

export function CostCenterManager({
  rows,
  divisions,
}: {
  rows: CostCenterRow[];
  divisions: DivisionRow[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CostCenterRow | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: CostCenterRow) {
    setEditing(row);
    setDialogOpen(true);
  }

  async function handleDelete(row: CostCenterRow) {
    if (!confirm(`Hapus cost center "${row.name}"?`)) return;
    const res = await deleteCostCenter(row.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Cost center dihapus");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Cost Centers
          </h1>
          <p className="text-sm text-muted-foreground">
            Pusat biaya — pengelompokan transaksi per divisi.
          </p>
        </div>
        <Button onClick={openCreate}>Tambah Cost Center</Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Divisi</TableHead>
              <TableHead className="w-40 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-muted-foreground"
                >
                  Belum ada cost center — buat cost center pertama.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="font-mono text-xs">{row.code}</span>
                  </TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {divisions.find((d) => d.id === row.divisionId)?.name ??
                        "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(row)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CostCenterFormDialog
        key={editing ? `edit-${editing.id}` : "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        costCenter={editing}
        divisions={divisions}
      />
    </div>
  );
}
