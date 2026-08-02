import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type {
  Budget,
  CachedRates,
  CurrencyCode,
  Invoice,
  InvoiceDraft,
  Profile,
  Rates,
  ReportSchedule,
  ScheduleDraft,
  Transaction,
  TransactionDraft,
} from "@/types"
import { convert, ensureRates } from "@/lib/currency"
import { resolveStore, type Store } from "@/lib/store"
import { localStore } from "@/lib/store/local"
import { generateDemoData } from "@/lib/demo"
import { uid } from "@/lib/utils"

interface AppData {
  loading: boolean
  mode: "local" | "supabase"
  profile: Profile | null
  transactions: Transaction[]
  invoices: Invoice[]
  budgets: Budget[]
  schedules: ReportSchedule[]
  rates: CachedRates | null
  ratesStatus: { ok: boolean; error?: string } | null
  homeCurrency: CurrencyCode
  apiKey: string
  setApiKey(key: string): Promise<void>
  addTransactions(drafts: TransactionDraft[]): Promise<void>
  updateTransaction(tx: Transaction): Promise<void>
  deleteTransactions(ids: string[]): Promise<void>
  addInvoice(draft: InvoiceDraft): Promise<void>
  updateInvoice(inv: Invoice): Promise<void>
  deleteInvoices(ids: string[]): Promise<void>
  upsertBudgets(budgets: Budget[]): Promise<void>
  deleteBudgets(ids: string[]): Promise<void>
  upsertSchedule(schedule: ScheduleDraft | ReportSchedule): Promise<void>
  deleteSchedule(id: string): Promise<void>
  saveProfile(profile: Profile): Promise<void>
  refreshRates(): Promise<void>
  resetDemo(): Promise<void>
  convertAmount(amount: number, from: CurrencyCode): number
}

const AppContext = createContext<AppData | null>(null)

const storeRef: { current: Store } = { current: resolveStore() }

const API_KEY_STORAGE = "cashflow:rates-api-key"

/** Initial key: localStorage override, else the build-time env var. */
function readApiKey(): string {
  const envKey = import.meta.env.VITE_CURRENCY_API_KEY as string | undefined
  try {
    return localStorage.getItem(API_KEY_STORAGE) ?? envKey ?? ""
  } catch {
    return envKey ?? ""
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [schedules, setSchedules] = useState<ReportSchedule[]>([])
  const [rates, setRates] = useState<CachedRates | null>(null)
  const [ratesStatus, setRatesStatus] = useState<{ ok: boolean; error?: string } | null>(null)
  const [apiKey, setApiKeyState] = useState<string>(readApiKey)
  const mode = storeRef.current.mode

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [prof, txs, invs, budgetsData, scheds, cachedRates] = await Promise.all([
          storeRef.current.getProfile(),
          storeRef.current.getTransactions(),
          storeRef.current.getInvoices(),
          storeRef.current.getBudgets(),
          storeRef.current.getSchedules(),
          storeRef.current.getRates(),
        ])
        if (cancelled) return
        setProfile(prof)
        setTransactions(txs)
        setInvoices(invs)
        setBudgets(budgetsData)
        setSchedules(scheds)

        const result = await ensureRates(cachedRates, prof.homeCurrency, apiKey || undefined)
        if (cancelled) return
        const nextRates: CachedRates = {
          base: prof.homeCurrency,
          rates: result.rates,
          fetchedAt: new Date().toISOString(),
          source: result.status.ok ? "live" : "fallback",
        }
        setRates(nextRates)
        setRatesStatus(result.status)
        const shouldPersist =
          !cachedRates || cachedRates.base !== nextRates.base || cachedRates.source !== nextRates.source
        if (shouldPersist) {
          await storeRef.current.saveRates(nextRates)
        }
      } catch (error) {
        console.error("Failed to load data", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const homeCurrency = profile?.homeCurrency ?? "USD"

  const buildTransaction = useCallback(
    (draft: TransactionDraft, rateMap: Rates): Transaction => ({
      id: uid(),
      date: draft.date,
      type: draft.type,
      description: draft.description,
      amount: draft.amount,
      currency: draft.currency,
      baseAmount: Math.round(convert(draft.amount, draft.currency, homeCurrency, rateMap)),
      category: draft.category,
      product: draft.product,
      client: draft.client,
      region: draft.region,
      department: draft.department,
      project: draft.project,
      paymentMethod: draft.paymentMethod,
      notes: draft.notes,
      createdAt: new Date().toISOString(),
    }),
    [homeCurrency],
  )

  const buildInvoice = useCallback(
    (draft: InvoiceDraft, rateMap: Rates): Invoice => ({
      id: uid(),
      number: draft.number,
      client: draft.client,
      issueDate: draft.issueDate,
      dueDate: draft.dueDate,
      amount: draft.amount,
      currency: draft.currency,
      baseAmount: Math.round(convert(draft.amount, draft.currency, homeCurrency, rateMap)),
      paidAmount: 0,
      status: "unpaid",
      project: draft.project,
      createdAt: new Date().toISOString(),
    }),
    [homeCurrency],
  )

  const withRates = useCallback(
    async <T,>(fn: (r: Rates) => Promise<T> | T): Promise<T> => {
      if (!rates) throw new Error("Exchange rates are not loaded yet — please try again")
      return fn(rates.rates)
    },
    [rates],
  )

  const addTransactions = useCallback(
    async (drafts: TransactionDraft[]) => {
      await withRates(async (rateMap) => {
        const built = drafts.map((d) => buildTransaction(d, rateMap))
        await storeRef.current.addTransactions(built)
        setTransactions((prev) => [...prev, ...built])
      })
    },
    [buildTransaction, withRates],
  )

  const updateTransaction = useCallback(
    async (tx: Transaction) => {
      await storeRef.current.updateTransaction(tx)
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)))
    },
    [],
  )

  const deleteTransactions = useCallback(
    async (ids: string[]) => {
      await storeRef.current.deleteTransactions(ids)
      setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)))
    },
    [],
  )

  const addInvoice = useCallback(
    async (draft: InvoiceDraft) => {
      await withRates(async (rateMap) => {
        const built = buildInvoice(draft, rateMap)
        await storeRef.current.addInvoices([built])
        setInvoices((prev) => [...prev, built])
      })
    },
    [buildInvoice, withRates],
  )

  const updateInvoice = useCallback(
    async (inv: Invoice) => {
      await storeRef.current.updateInvoice(inv)
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? inv : i)))
    },
    [],
  )

  const deleteInvoices = useCallback(
    async (ids: string[]) => {
      await storeRef.current.deleteInvoices(ids)
      setInvoices((prev) => prev.filter((i) => !ids.includes(i.id)))
    },
    [],
  )

  const upsertBudgets = useCallback(
    async (budgetList: Budget[]) => {
      await storeRef.current.upsertBudgets(budgetList)
      setBudgets((prev) => {
        const map = new Map(prev.map((b) => [b.id, b]))
        for (const b of budgetList) map.set(b.id, b)
        return [...map.values()]
      })
    },
    [],
  )

  const deleteBudgets = useCallback(
    async (ids: string[]) => {
      await storeRef.current.deleteBudgets(ids)
      setBudgets((prev) => prev.filter((b) => !ids.includes(b.id)))
    },
    [],
  )

  const upsertSchedule = useCallback(
    async (schedule: ScheduleDraft | ReportSchedule) => {
      const next: ReportSchedule =
        "lastSentAt" in schedule
          ? schedule
          : { ...schedule, id: uid(), lastSentAt: null, nextRunAt: new Date().toISOString() }
      await storeRef.current.upsertSchedule(next)
      setSchedules((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]))
        map.set(next.id, next)
        return [...map.values()]
      })
    },
    [],
  )

  const deleteSchedule = useCallback(
    async (id: string) => {
      await storeRef.current.deleteSchedule(id)
      setSchedules((prev) => prev.filter((s) => s.id !== id))
    },
    [],
  )

  const saveProfile = useCallback(
    async (p: Profile) => {
      await storeRef.current.saveProfile(p)
      setProfile(p)
      // Rates depend on home currency — re-resolve after profile change.
      if (p.homeCurrency !== homeCurrency) {
        const result = await ensureRates(null, p.homeCurrency, apiKey || undefined)
        const next: CachedRates = { base: p.homeCurrency, rates: result.rates, fetchedAt: new Date().toISOString(), source: result.status.ok ? "live" : "fallback" }
        setRates(next)
        setRatesStatus(result.status)
        await storeRef.current.saveRates(next)
      }
    },
    [homeCurrency, apiKey],
  )

  const refreshRates = useCallback(async () => {
    if (!profile) return
    const result = await ensureRates(null, profile.homeCurrency, apiKey || undefined, true)
    const next: CachedRates = { base: profile.homeCurrency, rates: result.rates, fetchedAt: new Date().toISOString(), source: result.status.ok ? "live" : "fallback" }
    setRates(next)
    setRatesStatus(result.status)
    await storeRef.current.saveRates(next)
  }, [profile, apiKey])

  const setApiKey = useCallback(
    async (key: string) => {
      const trimmed = key.trim()
      try {
        if (trimmed) localStorage.setItem(API_KEY_STORAGE, trimmed)
        else localStorage.removeItem(API_KEY_STORAGE)
      } catch {
        // storage unavailable — keep in memory
      }
      setApiKeyState(trimmed)
      if (profile) {
        const result = await ensureRates(null, profile.homeCurrency, trimmed || undefined, true)
        const next: CachedRates = { base: profile.homeCurrency, rates: result.rates, fetchedAt: new Date().toISOString(), source: result.status.ok ? "live" : "fallback" }
        setRates(next)
        setRatesStatus(result.status)
        await storeRef.current.saveRates(next)
      }
    },
    [profile],
  )

  const resetDemo = useCallback(async () => {
    if (mode === "local") {
      await localStore.resetToDemo()
      const demo = generateDemoData()
      setProfile(demo.profile)
      setTransactions(demo.transactions)
      setInvoices(demo.invoices)
      setBudgets(demo.budgets)
      setSchedules(demo.schedules)
      setRates({ ...demo.rates, fetchedAt: new Date().toISOString() })
    }
  }, [mode])

  const convertAmount = useCallback(
    (amount: number, from: CurrencyCode) => {
      if (!rates) return amount
      return convert(amount, from, homeCurrency, rates.rates)
    },
    [rates, homeCurrency],
  )

  const value = useMemo<AppData>(
    () => ({
      loading,
      mode,
      profile,
      transactions,
      invoices,
      budgets,
      schedules,
      rates,
      ratesStatus,
      homeCurrency,
      apiKey,
      setApiKey,
      addTransactions,
      updateTransaction,
      deleteTransactions,
      addInvoice,
      updateInvoice,
      deleteInvoices,
      upsertBudgets,
      deleteBudgets,
      upsertSchedule,
      deleteSchedule,
      saveProfile,
      refreshRates,
      resetDemo,
      convertAmount,
    }),
    [
      loading, mode, profile, transactions, invoices, budgets, schedules, rates, ratesStatus,
      homeCurrency, apiKey, setApiKey, addTransactions, updateTransaction, deleteTransactions, addInvoice,
      updateInvoice, deleteInvoices, upsertBudgets, deleteBudgets, upsertSchedule,
      deleteSchedule, saveProfile, refreshRates, resetDemo, convertAmount,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppData {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within DataProvider")
  return ctx
}
