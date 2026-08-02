import { useEffect, useState } from "react"
import {
  AlertTriangle,
  Database,
  KeyRound,
  Loader2,
  Monitor,
  Moon,
  RefreshCw,
  Sun,
  Trash2,
  User,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"
import type { CurrencyCode } from "@/types"
import { useApp } from "@/context/app-context"
import { useTheme } from "@/hooks/use-theme"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CurrencySelect } from "@/components/shared/currency-select"
import { PageHeader } from "@/components/shared/page-header"
import { StatRow } from "@/components/shared/kpi-card"

interface ProfileForm {
  name: string
  company: string
  homeCurrency: CurrencyCode
  openingBalance: string
}

const THEMES: Array<{ key: "light" | "dark" | "system"; label: string; icon: LucideIcon }> = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: Monitor },
]

export function SettingsPage() {
  const {
    profile,
    transactions,
    mode,
    rates,
    ratesStatus,
    apiKey,
    setApiKey,
    saveProfile,
    refreshRates,
    resetDemo,
    deleteTransactions,
  } = useApp()
  const { theme, setTheme } = useTheme()
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Local copy of the API key; saving to the context (which triggers a live
  // rates fetch) is debounced so typing doesn't fire a network call per key.
  const [keyInput, setKeyInput] = useState(apiKey)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (keyInput !== apiKey) void setApiKey(keyInput)
    }, 600)
    return () => clearTimeout(timer)
  }, [keyInput, apiKey, setApiKey])

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name,
        company: profile.company,
        homeCurrency: profile.homeCurrency,
        openingBalance: String(profile.openingBalance),
      })
    }
  }, [profile])

  if (!profile || !form) return null

  const handleSaveProfile = async () => {
    const openingBalance = Number(form.openingBalance)
    if (!Number.isFinite(openingBalance)) {
      toast.error("Opening balance must be a number")
      return
    }
    setSaving(true)
    try {
      await saveProfile({
        ...profile,
        name: form.name.trim() || profile.name,
        company: form.company.trim() || profile.company,
        homeCurrency: form.homeCurrency,
        openingBalance,
      })
      toast.success("Profile saved")
    } catch {
      toast.error("Could not save profile")
    } finally {
      setSaving(false)
    }
  }

  const handleRefreshRates = async () => {
    try {
      await refreshRates()
      toast.success("Exchange rates refreshed")
    } catch {
      toast.error("Could not refresh rates")
    }
  }

  const handleResetDemo = async () => {
    try {
      await resetDemo()
      toast.success("Demo data reset")
    } catch {
      toast.error("Could not reset demo data")
    }
  }

  const handleDeleteAll = async () => {
    try {
      await deleteTransactions(transactions.map((t) => t.id))
      toast.success(`Deleted ${transactions.length} transactions`)
      setConfirmDelete(false)
    } catch {
      toast.error("Could not delete transactions")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Profile, appearance, exchange rates and data management."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-4" />
              Profile
            </CardTitle>
            <CardDescription>Used on reports and as the default currency context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-company">Company</Label>
                <Input
                  id="profile-company"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Home currency</Label>
                <CurrencySelect
                  value={form.homeCurrency}
                  onChange={(c) => setForm({ ...form, homeCurrency: c })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-balance">Opening balance</Label>
                <Input
                  id="profile-balance"
                  type="number"
                  value={form.openingBalance}
                  onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={() => void handleSaveProfile()} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save profile
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="size-4" />
              Appearance
            </CardTitle>
            <CardDescription>Choose how the dashboard looks on this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <Button
                  key={t.key}
                  variant={theme === t.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme(t.key)}
                  className="justify-center"
                >
                  <t.icon className="size-4" />
                  {t.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Exchange rates
            </CardTitle>
            <CardDescription>Live conversion rates for multi-currency amounts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y">
              <StatRow
                label="Status"
                value={
                  ratesStatus
                    ? ratesStatus.ok
                      ? "Live"
                      : `Fallback${ratesStatus.error ? ` — ${ratesStatus.error}` : ""}`
                    : "Loading…"
                }
              />
              <StatRow
                label="Last fetch"
                value={rates?.fetchedAt ? formatDateTime(rates.fetchedAt) : "Never"}
              />
              <StatRow
                label="Source"
                value={rates?.source === "live" ? "freecurrencyapi" : "Fallback"}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rates-key">API key (optional)</Label>
              <Input
                id="rates-key"
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="freecurrencyapi key"
              />
              <p className="text-xs text-muted-foreground">
                Used to fetch live rates from freecurrencyapi.com. Leave blank to use fallback rates.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void handleRefreshRates()}>
              <RefreshCw className="size-3.5" />
              Refresh rates
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-4" />
              Data
            </CardTitle>
            <CardDescription>
              {mode === "local"
                ? "Everything is stored in your browser."
                : "Your data is synced to the cloud (Supabase)."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y">
              <StatRow
                label="Mode"
                value={<Badge variant="secondary">{mode === "local" ? "Local" : "Cloud"}</Badge>}
              />
              <StatRow label="Transactions" value={transactions.length} />
            </div>
            {mode === "local" ? (
              <Button variant="outline" size="sm" onClick={() => void handleResetDemo()}>
                <Database className="size-3.5" />
                Reset demo data
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Cloud storage is managed through your Supabase account.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" />
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Delete all transactions</p>
              <p className="text-xs text-muted-foreground">
                Permanently removes {transactions.length} transactions from your dataset.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={transactions.length === 0}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-3.5" />
              Delete all
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all transactions?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes all {transactions.length} transactions. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDeleteAll()}>
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
