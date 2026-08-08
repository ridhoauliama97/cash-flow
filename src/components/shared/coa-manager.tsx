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
import { CoaFormDialog } from "@/components/shared/coa-form-dialog";
import { deleteCoa } from "@/lib/actions/coa";
import { buildCoaTree, type CoaNode, type CoaRow } from "@/lib/coa";

export function CoaManager({ rows }: { rows: CoaRow[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CoaRow | null>(null);
  const [addingParent, setAddingParent] = useState<CoaRow | null>(null);

  const tree = buildCoaTree(rows);

  function openCreate(parent: CoaRow | null) {
    setAddingParent(parent);
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: CoaRow) {
    setAddingParent(null);
    setEditing(row);
    setDialogOpen(true);
  }

  async function handleDelete(row: CoaRow) {
    if (!confirm(`Hapus akun "${row.name}"?`)) return;
    const res = await deleteCoa(row.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Akun dihapus");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Chart of Accounts
          </h1>
          <p className="text-sm text-muted-foreground">
            Bagan akun hierarkis — master akun untuk jurnal.
          </p>
        </div>
        <Button onClick={() => openCreate(null)}>Tambah Akun</Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead className="w-24">Tipe</TableHead>
              <TableHead className="w-44 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tree.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-muted-foreground"
                >
                  Belum ada akun — buat akun pertama.
                </TableCell>
              </TableRow>
            ) : (
              tree.map((node) => (
                <CoaTreeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  onAddChild={openCreate}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CoaFormDialog
        key={
          editing
            ? `edit-${editing.id}`
            : `create-${addingParent?.id ?? "root"}`
        }
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={editing}
        rows={rows}
        defaultParentId={addingParent?.id ?? null}
      />
    </div>
  );
}

function CoaTreeRow({
  node,
  depth,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: CoaNode;
  depth: number;
  onAddChild: (row: CoaRow) => void;
  onEdit: (row: CoaRow) => void;
  onDelete: (row: CoaRow) => void;
}) {
  const rows = (
    <TableRow key={node.id}>
      <TableCell style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}>
        <span className="font-mono text-xs">{node.code}</span>
      </TableCell>
      <TableCell>
        {depth > 0 && (
          <span className="mr-1 text-muted-foreground/50 select-none">└ </span>
        )}
        {node.name}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="capitalize">
          {node.type}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => onAddChild(node)}>
            + Sub-akun
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(node)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => onDelete(node)}
          >
            Hapus
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <>
      {rows}
      {node.children.map((child) => (
        <CoaTreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}
