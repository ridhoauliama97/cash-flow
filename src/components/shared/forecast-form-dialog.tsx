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
import { createForecast, updateForecast } from "@/lib/actions/forecasts";
import { formatMonth } from "@/lib/utils-forecast";
import type { ForecastRow } from "@/lib/actions/forecasts";

const CATEGORIES = ["revenue", "expense", "profit"] as const;
const CATEGORY_LABEL: Record<string, string> = {
  revenue: "Pendapatan",
  expense: "Beban",
  profit: "Laba",
};

export interface ForecastFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forecast?: ForecastRow | null;
}

export function ForecastFormDialog({
  open,
  onOpenChange,
  forecast,
}: ForecastFormDialogProps) {
  const router = useRouter();
  const [year, setYear] = useState(forecast?.year ?? new Date().getFullYear());
  const [month, setMonth] = useState(String(forecast?.month ?? 1));
  const [category, setCategory] = useState(forecast?.category ?? "revenue");
  const [description, setDescription] = useState(forecast?.description ?? "");
  const [amount, setAmount] = useState(forecast?.amount ?? 0);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const input = {
      year,
      month: Number(month),
      category,
      description: description === "" ? null : description,
      amount: Number(amount),
    };
    const res = forecast
      ? await updateForecast(forecast.id, input)
      : await createForecast(input);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(forecast ? "Forecast diperbarui" : "Forecast dibuat");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{forecast ? "Edit Forecast" : "Tambah Forecast"}</DialogTitle>
          <DialogDescription>
            {forecast
              ? `Edit forecast ${CATEGORY_LABEL[forecast.category] ?? forecast.category} — ${formatMonth(forecast.month)} ${forecast.year}`
              : "Isi data proyeksi arus kas."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="forecast-year">Tahun</Label>
              <Input
                id="forecast-year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2000}
                max={2100}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="forecast-month">Bulan</Label>
              <Select value={month} onValueChange={(v) => { if (v) setMonth(v); }}>
                <SelectTrigger className="w-full" id="forecast-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {formatMonth(m)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="forecast-category">Kategori</Label>
            <Select value={category} onValueChange={(v) => { if (v) setCategory(v); }}>
              <SelectTrigger className="w-full" id="forecast-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="forecast-desc">Deskripsi</Label>
            <Input
              id="forecast-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opsional — contoh: Proyeksi Q1"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="forecast-amount">Jumlah (IDR)</Label>
            <Input
              id="forecast-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={0}
              step={1000}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : forecast ? "Simpan" : "Buat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
