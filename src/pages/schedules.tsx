import { useState } from "react"
import {
  CalendarClock,
  FileText,
  Info,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import type { ReportSchedule, ScheduleFormat, ScheduleFrequency } from "@/types"
import { useApp } from "@/context/app-context"
import { formatDateTime } from "@/lib/format"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"

interface FormState {
  name: string
  frequency: ScheduleFrequency
  format: ScheduleFormat
  recipients: string
  enabled: boolean
}

const EMPTY_FORM: FormState = { name: "", frequency: "weekly", format: "pdf", recipients: "", enabled: true }

const FREQUENCY_LABEL: Record<ScheduleFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
}

const FORMAT_LABEL: Record<ScheduleFormat, string> = {
  pdf: "PDF",
  csv: "CSV",
  both: "PDF + CSV",
}

export function SchedulesPage() {
  const { schedules, upsertSchedule, deleteSchedule } = useApp()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ReportSchedule | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<ReportSchedule | null>(null)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (s: ReportSchedule) => {
    setEditing(s)
    setForm({ name: s.name, frequency: s.frequency, format: s.format, recipients: s.recipients, enabled: s.enabled })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.recipients.trim()) return
    setSaving(true)
    try {
      const next = { name: form.name.trim(), frequency: form.frequency, format: form.format, recipients: form.recipients.trim(), enabled: form.enabled }
      if (editing) {
        await upsertSchedule({ ...editing, ...next })
        toast.success("Schedule updated")
      } else {
        await upsertSchedule(next)
        toast.success("Schedule created")
      }
      setDialogOpen(false)
    } catch {
      toast.error("Could not save schedule")
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (s: ReportSchedule) => {
    try {
      await upsertSchedule({ ...s, enabled: !s.enabled })
      toast.success(s.enabled ? "Schedule disabled" : "Schedule enabled")
    } catch {
      toast.error("Could not update schedule")
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteSchedule(deleting.id)
      toast.success("Schedule deleted")
      setDeleting(null)
    } catch {
      toast.error("Could not delete schedule")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report schedules"
        description="Automated delivery of financial reports to your inbox."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            New schedule
          </Button>
        }
      />

      <Alert>
        <Info className="size-4" />
        <AlertTitle>Demo delivery</AlertTitle>
        <AlertDescription>
          In demo mode reports are delivered while the app is open. Production uses the Supabase edge function.
        </AlertDescription>
      </Alert>

      {schedules.length === 0 ? (
        <EmptyState
          title="No schedules yet"
          description="Create a schedule to have reports emailed automatically."
          onAction={openCreate}
          actionLabel="New schedule"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {schedules.map((s) => (
            <Card key={s.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <span className="truncate">{s.name}</span>
                    {!s.enabled && <Badge variant="secondary">Paused</Badge>}
                  </CardTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      <CalendarClock className="size-3" />
                      {FREQUENCY_LABEL[s.frequency]}
                    </Badge>
                    <Badge variant="outline">
                      <FileText className="size-3" />
                      {FORMAT_LABEL[s.format]}
                    </Badge>
                  </div>
                </div>
                <Switch
                  checked={s.enabled}
                  onCheckedChange={() => void handleToggle(s)}
                  aria-label={`Toggle ${s.name}`}
                />
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{s.recipients}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="size-3.5 shrink-0" />
                  <span>
                    Last sent: {s.lastSentAt ? formatDateTime(s.lastSentAt) : "Never"} · Next run:{" "}
                    {formatDateTime(s.nextRunAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleting(s)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        onSave={() => void handleSave()}
        saving={saving}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.name}” will no longer be delivered. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ScheduleDialog({
  open,
  onOpenChange,
  form,
  onChange,
  onSave,
  saving,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: FormState
  onChange: (patch: Partial<FormState>) => void
  onSave: () => void
  saving: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule report</DialogTitle>
          <DialogDescription>Deliver reports by email on a recurring basis.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="sched-name">Name</Label>
            <Input
              id="sched-name"
              value={form.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Weekly client report"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Frequency</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => onChange({ frequency: v as ScheduleFrequency })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Format</Label>
              <Select
                value={form.format}
                onValueChange={(v) => onChange({ format: v as ScheduleFormat })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="both">PDF + CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sched-recipients">Recipients</Label>
            <Input
              id="sched-recipients"
              value={form.recipients}
              onChange={(e) => onChange({ recipients: e.target.value })}
              placeholder="finance@company.com, cfo@company.com"
            />
            <p className="text-xs text-muted-foreground">Comma-separated email addresses.</p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="sched-enabled">Enabled</Label>
            <Switch
              id="sched-enabled"
              checked={form.enabled}
              onCheckedChange={(v) => onChange({ enabled: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={saving || !form.name.trim() || !form.recipients.trim()}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
