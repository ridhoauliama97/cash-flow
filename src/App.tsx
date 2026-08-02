import { lazy, Suspense, useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { DataProvider, useApp } from "@/context/app-context"
import { ThemeProvider } from "@/hooks/use-theme"
import { LoginPage } from "@/pages/login"
import { Skeleton } from "@/components/ui/skeleton"
import { useScheduleDelivery } from "@/hooks/use-schedule-delivery"
import { getSupabaseClient } from "@/lib/store"

// Route-level code splitting keeps the initial bundle lean.
const DashboardPage = lazy(() => import("@/pages/dashboard").then((m) => ({ default: m.DashboardPage })))
const RevenuePage = lazy(() => import("@/pages/revenue").then((m) => ({ default: m.RevenuePage })))
const ExpensesPage = lazy(() => import("@/pages/expenses").then((m) => ({ default: m.ExpensesPage })))
const CashFlowPage = lazy(() => import("@/pages/cash-flow").then((m) => ({ default: m.CashFlowPage })))
const ReceivablesPage = lazy(() => import("@/pages/receivables").then((m) => ({ default: m.ReceivablesPage })))
const TransactionsPage = lazy(() => import("@/pages/transactions").then((m) => ({ default: m.TransactionsPage })))
const ForecastPage = lazy(() => import("@/pages/forecast").then((m) => ({ default: m.ForecastPage })))
const ReportsPage = lazy(() => import("@/pages/reports").then((m) => ({ default: m.ReportsPage })))
const ImportPage = lazy(() => import("@/pages/import").then((m) => ({ default: m.ImportPage })))
const SchedulesPage = lazy(() => import("@/pages/schedules").then((m) => ({ default: m.SchedulesPage })))
const SettingsPage = lazy(() => import("@/pages/settings").then((m) => ({ default: m.SettingsPage })))

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false)
  useScheduleDelivery()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMenuOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/revenue" element={<RevenuePage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/cash-flow" element={<CashFlowPage />} />
              <Route path="/receivables" element={<ReceivablesPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/forecast" element={<ForecastPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/schedules" element={<SchedulesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function PageFallback() {
  return (
    <div className="space-y-4 p-1">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-72" />
    </div>
  )
}

function Gate() {
  const { loading, mode } = useApp()
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    if (mode === "local") {
      setAuthed(true)
      return
    }
    let cancelled = false
    const client = getSupabaseClient()
    if (!client) {
      setAuthed(true)
      return
    }
    client.auth
      .getUser()
      .then(({ data }) => {
        if (!cancelled) setAuthed(Boolean(data.user))
      })
      .catch(() => {
        // Network/auth failure — treat as unauthenticated rather than
        // leaving the user stuck on the loading screen forever.
        if (!cancelled) setAuthed(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode])

  if (loading) return <LoadingScreen />
  if (authed === null) return <LoadingScreen />
  if (!authed) return <LoginPage onDemo={() => setAuthed(true)} onAuthed={() => setAuthed(true)} />
  return <Shell />
}

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <BrowserRouter>
          <Gate />
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </DataProvider>
    </ThemeProvider>
  )
}
