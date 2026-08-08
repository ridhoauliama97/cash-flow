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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createSchedule,
  updateSchedule,
  type ScheduleInput,
  type ScheduleRow,
} from "@/lib/actions/schedules";

const REPORT_TYPES = [
  { value: "general-ledger", label: "General Ledger" },
  { value: "profitability", label: "Profitability" },
  { value: "cash-flow", label: "Cash Flow" },
  { value: "revenue", label: "Revenue" },
  { value: "expenses", label: "Expenses" },
];

const FREQUENCIES = [
  { value: "daily", label: "Harian" },
  { value: "weekly", label: "Mingguan" },
  { value: "monthly", label: "Bulanan" },
  { value: "quarterly", label: "Triwulanan" },
];

const DAYS_OF_WEEK = [
  { value: "0", label: "Minggu" },
  { value: "1", label: "Senin" },
  { value: "2", label: "Selasa" },
  { value: "3", label: "Rabu" },
  { value: "4", label: "Kamis" },
  { value: "5", label: "Jumat" },
  { value: "6", label: "Sabtu" },
];

const FORMATS = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "XLSX" },
];

export interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: ScheduleRow | null;
  userId: string;
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  schedule,
  userId,
}: ScheduleFormDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(schedule?.name ?? "");
  const [reportType, setReportType] = useState(schedule?.reportType ?? "");
  const [frequency, setFrequency] = useState(schedule?.frequency ?? "");
  const [dayOfMonth, setDayOfMonth] = useState(
    schedule?.dayOfMonth?.toString() ?? "",
  );
  const [dayOfWeek, setDayOfWeek] = useState(
    schedule?.dayOfWeek?.toString() ?? "",
  );
  const [timeOfDay, setTimeOfDay] = useState(schedule?.timeOfDay ?? "08:00");
  const [recipients, setRecipients] = useState(
    schedule?.recipients.join(", ") ?? "",
  );
  const [format, setFormat] = useState(schedule?.format ?? "pdf");
  const [enabled, setEnabled] = useState(schedule?.enabled ?? true);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const input: ScheduleInput = {
      name,
      reportType,
      frequency,
      dayOfMonth: dayOfMonth ? parseInt(dayOfMonth, 10) : null,
      dayOfWeek: dayOfWeek ? parseInt(dayOfWeek, 10) : null,
      timeOfDay,
      recipients: recipients
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
      format,
      enabled,
    };

    const res = schedule
      ? await updateSchedule(schedule.id, input)
      : await createSchedule(input, userId);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(schedule ? "Jadwal diperbarui" : "Jadwal dibuat");
    onOpenChange(false);
    router.refresh();
  }

  const showDayOfMonth = frequency === "monthly" || frequency === "quarterly";
  const showDayOfWeek = frequency === "weekly";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {schedule ? "Edit Jadwal" : "Tambah Jadwal"}
          </DialogTitle>
          <DialogDescription>
            Konfigurasi jadwal pengiriman laporan berkala.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="schedule-name">Nama jadwal</Label>
            <Input
              id="schedule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Laporan GL Bulanan"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Tipe laporan</Label>
            <Select
              value={reportType}
              onValueChange={(v) => {
                if (v !== null) setReportType(v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih tipe laporan" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {REPORT_TYPES.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>
                      {rt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Frekuensi</Label>
            <Select
              value={frequency}
              onValueChange={(v) => {
                if (v !== null) setFrequency(v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih frekuensi" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {showDayOfMonth && (
            <div className="grid gap-2">
              <Label htmlFor="schedule-day-of-month">
                Tanggal dalam bulan
              </Label>
              <Input
                id="schedule-day-of-month"
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                placeholder="15"
              />
            </div>
          )}

          {showDayOfWeek && (
            <div className="grid gap-2">
              <Label>Hari dalam minggu</Label>
              <Select
                value={dayOfWeek}
                onValueChange={(v) => {
                  if (v !== null) setDayOfWeek(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih hari" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="schedule-time">Jam kirim</Label>
            <Input
              id="schedule-time"
              type="time"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="schedule-recipients">Penerima (email, koma)</Label>
            <Textarea
              id="schedule-recipients"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="email1@contoh.com, email2@contoh.com"
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label>Format</Label>
            <Select
              value={format}
              onValueChange={(v) => {
                if (v !== null) setFormat(v);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="schedule-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label htmlFor="schedule-enabled">Aktif</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : schedule ? "Simpan" : "Buat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
