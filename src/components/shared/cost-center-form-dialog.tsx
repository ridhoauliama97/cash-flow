"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { createCostCenter, updateCostCenter } from "@/lib/actions/cost-centers";
import type { CostCenterRow, DivisionRow } from "@/lib/cost-centers";

export interface CostCenterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit mode bila diisi, else create. */
  costCenter?: CostCenterRow | null;
  /** Semua divisi — untuk pilihan di form. */
  divisions: DivisionRow[];
}

export function CostCenterFormDialog({
  open,
  onOpenChange,
  costCenter,
  divisions,
}: CostCenterFormDialogProps) {
  const router = useRouter();
  // State diinisialisasi dari props; dialog di-remount via `key` saat target
  // berganti (lihat CostCenterManager) — hindari setState sinkron dalam effect.
  const [code, setCode] = useState(costCenter?.code ?? "");
  const [name, setName] = useState(costCenter?.name ?? "");
  const [divisionId, setDivisionId] = useState(costCenter?.divisionId ?? "");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const input = { code, name, divisionId };
    const res = costCenter
      ? await updateCostCenter(costCenter.id, input)
      : await createCostCenter(input);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(costCenter ? "Cost center diperbarui" : "Cost center dibuat");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{costCenter ? "Edit Cost Center" : "Tambah Cost Center"}</DialogTitle>
          <DialogDescription>
            Kode dan nama cost center; pilih divisi pemiliknya.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cost-center-code">Kode cost center</Label>
            <Input
              id="cost-center-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CC-001"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cost-center-name">Nama cost center</Label>
            <Input
              id="cost-center-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marketing"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cost-center-division">Divisi</Label>
            <Select
              value={divisionId}
              onValueChange={(v) => {
                if (v !== null) setDivisionId(v);
              }}
            >
              <SelectTrigger className="w-full" id="cost-center-division">
                <SelectValue placeholder="Pilih divisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : costCenter ? "Simpan" : "Buat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
