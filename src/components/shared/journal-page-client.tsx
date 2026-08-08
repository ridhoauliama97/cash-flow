"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CoaFormDialog } from "@/components/shared/coa-form-dialog";
import { deleteCoa } from "@/lib/actions/coa";
import { buildCoaTree, type CoaNode, type CoaRow } from "@/lib/coa";
import { cn } from "@/lib/utils";

function CoaTree({
  nodes,
  level = 0,
  onAdd,
  onEdit,
  onDelete,
}: {
  nodes: CoaNode[];
  level?: number;
  onAdd: (parent: CoaRow) => void;
  onEdit: (row: CoaRow) => void;
  onDelete: (row: CoaRow) => void;
}) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.id}>
          <div
            className={cn(
              "flex items-center gap-2 py-1.5 text-sm",
              level > 0 && "ml-4 border-l pl-3",
            )}
          >
            <span className="font-mono text-xs text-muted-foreground">
              {node.code}
            </span>
            <span className="flex-1">{node.name}</span>
            <Badge variant="secondary" className="text-xs">
              {node.type}
            </Badge>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onAdd(node)}
              >
                +Sub
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onEdit(node)}
              >
                Edit
              </Button>
              {!node.children || node.children.length === 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-destructive"
                  onClick={() => onDelete(node)}
                >
                  Hapus
                </Button>
              ) : null}
            </div>
          </div>
          {node.children && node.children.length > 0 && (
            <CoaTree
              nodes={node.children}
              level={level + 1}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        </div>
      ))}
    </>
  );
}

export function JournalPageClient({ coaRows }: { coaRows: CoaRow[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CoaRow | null>(null);
  const [addingParent, setAddingParent] = useState<CoaRow | null>(null);
  const [search, setSearch] = useState("");

  const tree = buildCoaTree(coaRows);

  function openCreate(parent: CoaRow | null) {
    setAddingParent(parent);
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: CoaRow) {
    setEditing(row);
    setAddingParent(null);
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

  const filteredRows = search
    ? coaRows.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.code.toLowerCase().includes(search.toLowerCase()),
      )
    : coaRows;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Journal / General Ledger
          </h1>
          <p className="text-sm text-muted-foreground">
            Bagan akun hierarkis — master akun untuk jurnal.
          </p>
        </div>
        <Button onClick={() => openCreate(null)}>Tambah Akun</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode / nama akun…"
            className="h-8 w-64 pl-8"
          />
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredRows.length} akun
        </span>
      </div>

      <div className="rounded-xl border bg-card p-4">
        {search ? (
          <div className="space-y-1">
            {filteredRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-2 py-1.5 text-sm"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {row.code}
                </span>
                <span className="flex-1">{row.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {row.type}
                </Badge>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => openEdit(row)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-destructive"
                    onClick={() => handleDelete(row)}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
            {filteredRows.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Tidak ada akun yang cocok.
              </p>
            )}
          </div>
        ) : tree.length > 0 ? (
          <CoaTree
            nodes={tree}
            onAdd={openCreate}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Belum ada akun — tambahkan akun pertama.
          </p>
        )}
      </div>

      <CoaFormDialog
        key={editing ? `edit-${editing.id}` : addingParent ? `add-${addingParent.id}` : "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={editing}
        rows={coaRows}
        defaultParentId={addingParent?.id ?? null}
      />
    </div>
  );
}
