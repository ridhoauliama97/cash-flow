import type {
  Bill,
  Budget,
  CachedRates,
  Invoice,
  Profile,
  ReportSchedule,
  Transaction,
} from "@/types";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase-backed store. Used when VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are configured; rows are scoped to the
 * authenticated user (see supabase/migrations for RLS policies).
 */
export function createSupabaseStore(
  url: string,
  anonKey: string,
  _demoUserId = "local-demo",
) {
  const supabase: SupabaseClient = createClient(url, anonKey);

  const userId = async (): Promise<string> => {
    const { data } = await supabase.auth.getUser();
    const id = data.user?.id;
    if (!id) throw new Error("Not authenticated");
    return id;
  };

  const mapRow = (row: Record<string, unknown>): Transaction => ({
    id: row.id as string,
    date: row.date as string,
    type: row.type as Transaction["type"],
    description: row.description as string,
    amount: row.amount as number,
    currency: row.currency as Transaction["currency"],
    baseAmount: row.base_amount as number,
    category: row.category as string,
    product: (row.product as string | null) ?? undefined,
    client: (row.client as string | null) ?? undefined,
    region: (row.region as string | null) ?? undefined,
    department: (row.department as string | null) ?? undefined,
    project: (row.project as string | null) ?? undefined,
    paymentMethod: (row.payment_method as string | null) ?? undefined,
    notes: (row.notes as string | null) ?? undefined,
    createdAt: row.created_at as string,
  });

  const mapInvoice = (row: Record<string, unknown>): Invoice => ({
    id: row.id as string,
    number: row.number as string,
    client: row.client as string,
    issueDate: row.issue_date as string,
    dueDate: row.due_date as string,
    amount: row.amount as number,
    currency: row.currency as Invoice["currency"],
    baseAmount: row.base_amount as number,
    paidAmount: row.paid_amount as number,
    status: row.status as Invoice["status"],
    project: (row.project as string | null) ?? undefined,
    createdAt: row.created_at as string,
  });

  const mapBudget = (row: Record<string, unknown>): Budget => ({
    id: row.id as string,
    month: row.month as string,
    category: row.category as string,
    amount: row.amount as number,
  });

  const mapBill = (row: Record<string, unknown>): Bill => ({
    id: row.id as string,
    number: row.number as string,
    vendor: row.vendor as string,
    issueDate: row.issue_date as string,
    dueDate: row.due_date as string,
    amount: row.amount as number,
    currency: row.currency as Bill["currency"],
    baseAmount: row.base_amount as number,
    paidAmount: row.paid_amount as number,
    status: row.status as Bill["status"],
    category: row.category as string,
    notes: (row.notes as string | null) ?? undefined,
    createdAt: row.created_at as string,
  });

  const mapSchedule = (row: Record<string, unknown>): ReportSchedule => ({
    id: row.id as string,
    name: row.name as string,
    frequency: row.frequency as ReportSchedule["frequency"],
    format: row.format as ReportSchedule["format"],
    recipients: row.recipients as string,
    enabled: row.enabled as boolean,
    lastSentAt: row.last_sent_at as string | null,
    nextRunAt: row.next_run_at as string,
  });

  const mapProfile = (row: Record<string, unknown>): Profile => ({
    id: row.id as string,
    name: row.name as string,
    company: row.company as string,
    homeCurrency: row.home_currency as Profile["homeCurrency"],
    openingBalance: row.opening_balance as number,
  });

  return {
    mode: "supabase" as const,

    async getProfile(): Promise<Profile> {
      const id = await userId();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        // Auto-provision a profile row on first run
        const demo: Profile = {
          id,
          name: "New User",
          company: "My Company",
          homeCurrency: "USD",
          openingBalance: 0,
        };
        await supabase
          .from("profiles")
          .insert({
            ...demo,
            home_currency: demo.homeCurrency,
            opening_balance: demo.openingBalance,
          });
        return demo;
      }
      return mapProfile(data as Record<string, unknown>);
    },
    async saveProfile(profile: Profile): Promise<void> {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: profile.name,
          company: profile.company,
          home_currency: profile.homeCurrency,
          opening_balance: profile.openingBalance,
        })
        .eq("id", profile.id);
      if (error) throw new Error(error.message);
    },

    async getTransactions(): Promise<Transaction[]> {
      const id = await userId();
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", id)
        .order("date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
    },
    async addTransactions(txs: Transaction[]): Promise<void> {
      const id = await userId();
      const rows = txs.map((t) => ({
        id: t.id,
        user_id: id,
        date: t.date,
        type: t.type,
        description: t.description,
        amount: t.amount,
        currency: t.currency,
        base_amount: t.baseAmount,
        category: t.category,
        product: t.product ?? null,
        client: t.client ?? null,
        region: t.region ?? null,
        department: t.department ?? null,
        project: t.project ?? null,
        payment_method: t.paymentMethod ?? null,
        notes: t.notes ?? null,
      }));
      const { error } = await supabase.from("transactions").insert(rows);
      if (error) throw new Error(error.message);
    },
    async updateTransaction(tx: Transaction): Promise<void> {
      const { error } = await supabase
        .from("transactions")
        .update({
          date: tx.date,
          type: tx.type,
          description: tx.description,
          amount: tx.amount,
          currency: tx.currency,
          base_amount: tx.baseAmount,
          category: tx.category,
          product: tx.product ?? null,
          client: tx.client ?? null,
          region: tx.region ?? null,
          department: tx.department ?? null,
          project: tx.project ?? null,
          payment_method: tx.paymentMethod ?? null,
          notes: tx.notes ?? null,
        })
        .eq("id", tx.id);
      if (error) throw new Error(error.message);
    },
    async deleteTransactions(ids: string[]): Promise<void> {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .in("id", ids);
      if (error) throw new Error(error.message);
    },

    async getInvoices(): Promise<Invoice[]> {
      const id = await userId();
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", id)
        .order("due_date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => mapInvoice(r as Record<string, unknown>));
    },
    async addInvoices(invs: Invoice[]): Promise<void> {
      const id = await userId();
      const rows = invs.map((i) => ({
        id: i.id,
        user_id: id,
        number: i.number,
        client: i.client,
        issue_date: i.issueDate,
        due_date: i.dueDate,
        amount: i.amount,
        currency: i.currency,
        base_amount: i.baseAmount,
        paid_amount: i.paidAmount,
        status: i.status,
        project: i.project ?? null,
      }));
      const { error } = await supabase.from("invoices").insert(rows);
      if (error) throw new Error(error.message);
    },
    async updateInvoice(inv: Invoice): Promise<void> {
      const { error } = await supabase
        .from("invoices")
        .update({
          number: inv.number,
          client: inv.client,
          issue_date: inv.issueDate,
          due_date: inv.dueDate,
          amount: inv.amount,
          currency: inv.currency,
          base_amount: inv.baseAmount,
          paid_amount: inv.paidAmount,
          status: inv.status,
          project: inv.project ?? null,
        })
        .eq("id", inv.id);
      if (error) throw new Error(error.message);
    },
    async deleteInvoices(ids: string[]): Promise<void> {
      const { error } = await supabase.from("invoices").delete().in("id", ids);
      if (error) throw new Error(error.message);
    },

    async getBills(): Promise<Bill[]> {
      const id = await userId();
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("user_id", id)
        .order("due_date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => mapBill(r as Record<string, unknown>));
    },
    async addBills(bills: Bill[]): Promise<void> {
      const id = await userId();
      const rows = bills.map((b) => ({
        id: b.id,
        user_id: id,
        number: b.number,
        vendor: b.vendor,
        issue_date: b.issueDate,
        due_date: b.dueDate,
        amount: b.amount,
        currency: b.currency,
        base_amount: b.baseAmount,
        paid_amount: b.paidAmount,
        status: b.status,
        category: b.category,
        notes: b.notes ?? null,
      }));
      const { error } = await supabase.from("bills").insert(rows);
      if (error) throw new Error(error.message);
    },
    async updateBill(bill: Bill): Promise<void> {
      const { error } = await supabase
        .from("bills")
        .update({
          number: bill.number,
          vendor: bill.vendor,
          issue_date: bill.issueDate,
          due_date: bill.dueDate,
          amount: bill.amount,
          currency: bill.currency,
          base_amount: bill.baseAmount,
          paid_amount: bill.paidAmount,
          status: bill.status,
          category: bill.category,
          notes: bill.notes ?? null,
        })
        .eq("id", bill.id);
      if (error) throw new Error(error.message);
    },
    async deleteBills(ids: string[]): Promise<void> {
      const { error } = await supabase.from("bills").delete().in("id", ids);
      if (error) throw new Error(error.message);
    },

    async getBudgets(): Promise<Budget[]> {
      const id = await userId();
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", id);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => mapBudget(r as Record<string, unknown>));
    },
    async upsertBudgets(budgets: Budget[]): Promise<void> {
      const id = await userId();
      const rows = budgets.map((b) => ({
        id: b.id,
        user_id: id,
        month: b.month,
        category: b.category,
        amount: b.amount,
      }));
      const { error } = await supabase
        .from("budgets")
        .upsert(rows, { onConflict: "id" });
      if (error) throw new Error(error.message);
    },
    async deleteBudgets(ids: string[]): Promise<void> {
      const { error } = await supabase.from("budgets").delete().in("id", ids);
      if (error) throw new Error(error.message);
    },

    async getSchedules(): Promise<ReportSchedule[]> {
      const id = await userId();
      const { data, error } = await supabase
        .from("report_schedules")
        .select("*")
        .eq("user_id", id);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => mapSchedule(r as Record<string, unknown>));
    },
    async upsertSchedule(s: ReportSchedule): Promise<void> {
      const id = await userId();
      const row = {
        id: s.id,
        user_id: id,
        name: s.name,
        frequency: s.frequency,
        format: s.format,
        recipients: s.recipients,
        enabled: s.enabled,
        last_sent_at: s.lastSentAt,
        next_run_at: s.nextRunAt,
      };
      const { error } = await supabase
        .from("report_schedules")
        .upsert(row, { onConflict: "id" });
      if (error) throw new Error(error.message);
    },
    async deleteSchedule(id: string): Promise<void> {
      const { error } = await supabase
        .from("report_schedules")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async getRates(): Promise<CachedRates | null> {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("*")
        .limit(1);
      if (error || !data || data.length === 0) return null;
      const row = data[0] as Record<string, unknown>;
      return {
        base: row.base as CachedRates["base"],
        rates: row.rates as CachedRates["rates"],
        fetchedAt: row.fetched_at as string,
        source: row.source as CachedRates["source"],
      };
    },
    async saveRates(r: CachedRates): Promise<void> {
      const { error } = await supabase
        .from("exchange_rates")
        .upsert(
          {
            id: "global",
            base: r.base,
            rates: r.rates,
            fetched_at: r.fetchedAt,
            source: r.source,
          },
          { onConflict: "id" },
        );
      if (error) throw new Error(error.message);
    },
  };
}

export type SupabaseStore = ReturnType<typeof createSupabaseStore>;
