import type {
  Budget,
  CachedRates,
  Invoice,
  Profile,
  ReportSchedule,
  Transaction,
} from "@/types"
import { localStore } from "@/lib/store/local"
import { createSupabaseStore } from "@/lib/store/supabase"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export interface Store {
  mode: "local" | "supabase"
  getProfile(): Promise<Profile>
  saveProfile(profile: Profile): Promise<void>
  getTransactions(): Promise<Transaction[]>
  addTransactions(txs: Transaction[]): Promise<void>
  updateTransaction(tx: Transaction): Promise<void>
  deleteTransactions(ids: string[]): Promise<void>
  getInvoices(): Promise<Invoice[]>
  addInvoices(invs: Invoice[]): Promise<void>
  updateInvoice(inv: Invoice): Promise<void>
  deleteInvoices(ids: string[]): Promise<void>
  getBudgets(): Promise<Budget[]>
  upsertBudgets(budgets: Budget[]): Promise<void>
  deleteBudgets(ids: string[]): Promise<void>
  getSchedules(): Promise<ReportSchedule[]>
  upsertSchedule(s: ReportSchedule): Promise<void>
  deleteSchedule(id: string): Promise<void>
  getRates(): Promise<CachedRates | null>
  saveRates(r: CachedRates): Promise<void>
}

export interface AuthUser {
  id: string
  email: string
  name?: string
}

/**
 * Resolve the active store implementation.
 * - Supabase mode: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY configured
 * - Local mode: everything else (demo data in localStorage)
 */
export function resolveStore(): Store {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (url && anonKey) {
    return createSupabaseStore(url, anonKey)
  }
  return localStore
}

let supabaseClientSingleton: SupabaseClient | null = null

/** Raw Supabase client (auth etc.) — null when Supabase is not configured. */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClientSingleton) return supabaseClientSingleton
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !anonKey) return null
  supabaseClientSingleton = createClient(url, anonKey)
  return supabaseClientSingleton
}
