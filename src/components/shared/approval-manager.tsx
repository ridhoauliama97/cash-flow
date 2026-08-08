"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approveTransaction,
  rejectTransaction,
  type PendingApprovalRow,
} from "@/lib/actions/approvals";
import { formatIDR } from "@/lib/format";

export function ApprovalManager({ rows }: { rows: PendingApprovalRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [actionTarget, setActionTarget] = useState<{
    id: string;
    action: "approve" | "reject";
  } | null>(null);

  async function handleApprove(id: string) {
    setActionTarget({ id, action: "approve" });
    setNoteText("");
    setNoteOpen(true);
  }

  async function handleReject(id: string) {
    setActionTarget({ id, action: "reject" });
    setNoteText("");
    setNoteOpen(true);
  }

  async function confirmAction() {
    if (!actionTarget) return;
    setNoteOpen(false);
    setBusyId(actionTarget.id);
    const res =
      actionTarget.action === "approve"
        ? await approveTransaction(actionTarget.id, noteText || undefined)
        : await rejectTransaction(actionTarget.id, noteText || undefined);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      actionTarget.action === "approve"
        ? "Transaksi disetujui"
        : "Transaksi ditolak",
    );
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Approval
        </h1>
        <p className="text-sm text-muted-foreground">
          Transaksi yang menunggu persetujuan — setujui atau tolak.
        </p>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Dibuat oleh</TableHead>
              <TableHead>Cost Center</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  Tidak ada transaksi yang menunggu persetujuan.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {new Date(row.date).toLocaleDateString("id-ID")}
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
                      {row.type === "income" ? "Pemasukan" : "Pengeluaran"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-48 truncate">
                    {row.description}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatIDR(row.amount)}{" "}
                    <span className="text-muted-foreground">
                      {row.currency}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.createdByName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.costCenterName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-600"
                        disabled={busyId === row.id}
                        onClick={() => handleApprove(row.id)}
                      >
                        <Check className="mr-1 size-3.5" />
                        Setujui
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={busyId === row.id}
                        onClick={() => handleReject(row.id)}
                      >
                        <X className="mr-1 size-3.5" />
                        Tolak
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.action === "approve" ? "Setujui" : "Tolak"}{" "}
              Transaksi
            </DialogTitle>
            <DialogDescription>
              Tambahkan catatan (opsional) untuk persetujuan ini.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="approval-note">Catatan</Label>
            <Textarea
              id="approval-note"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Alasan persetujuan/penolakan…"
              className="min-h-20"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={confirmAction}
              variant={
                actionTarget?.action === "reject" ? "destructive" : "default"
              }
            >
              {actionTarget?.action === "approve" ? "Setujui" : "Tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
