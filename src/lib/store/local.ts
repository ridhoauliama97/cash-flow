import type {
  Budget,
  CachedRates,
  Invoice,
  Profile,
  ReportSchedule,
  Transaction,
} from "@/types";
import { generateDemoData } from "@/lib/demo";

const DB_KEY = "cashflow:db:v1";

let cache: Database | null = null;

interface Database {
  profile: Profile;
  transactions: Transaction[];
  invoices: Invoice[];
  budgets: Budget[];
  schedules: ReportSchedule[];
  rates: CachedRates | null;
}

function load(): Database {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      cache = JSON.parse(raw) as Database;
      return cache;
    }
  } catch {
    // Corrupt storage — fall through to demo data
  }
  const demo = generateDemoData();
  cache = {
    profile: demo.profile,
    transactions: demo.transactions,
    invoices: demo.invoices,
    budgets: demo.budgets,
    schedules: demo.schedules,
    rates: demo.rates,
  };
  persist(cache);
  return cache;
}

function persist(db: Database): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // Storage full/unavailable — app continues in-memory
  }
}

function mutate(fn: (db: Database) => void): Database {
  const db = load();
  fn(db);
  persist(db);
  return db;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const localStore = {
  mode: "local" as const,

  async getProfile(): Promise<Profile> {
    return clone(load().profile);
  },
  async saveProfile(profile: Profile): Promise<void> {
    mutate((db) => {
      db.profile = profile;
    });
  },

  async getTransactions(): Promise<Transaction[]> {
    return clone(load().transactions);
  },
  async addTransactions(txs: Transaction[]): Promise<void> {
    mutate((db) => {
      db.transactions = [...db.transactions, ...txs];
    });
  },
  async updateTransaction(tx: Transaction): Promise<void> {
    mutate((db) => {
      db.transactions = db.transactions.map((t) => (t.id === tx.id ? tx : t));
    });
  },
  async deleteTransactions(ids: string[]): Promise<void> {
    mutate((db) => {
      db.transactions = db.transactions.filter((t) => !ids.includes(t.id));
    });
  },

  async getInvoices(): Promise<Invoice[]> {
    return clone(load().invoices);
  },
  async addInvoices(invs: Invoice[]): Promise<void> {
    mutate((db) => {
      db.invoices = [...db.invoices, ...invs];
    });
  },
  async updateInvoice(inv: Invoice): Promise<void> {
    mutate((db) => {
      db.invoices = db.invoices.map((i) => (i.id === inv.id ? inv : i));
    });
  },
  async deleteInvoices(ids: string[]): Promise<void> {
    mutate((db) => {
      db.invoices = db.invoices.filter((i) => !ids.includes(i.id));
    });
  },

  async getBudgets(): Promise<Budget[]> {
    return clone(load().budgets);
  },
  async upsertBudgets(budgets: Budget[]): Promise<void> {
    mutate((db) => {
      for (const b of budgets) {
        const idx = db.budgets.findIndex((x) => x.id === b.id);
        if (idx >= 0) db.budgets[idx] = b;
        else db.budgets.push(b);
      }
    });
  },
  async deleteBudgets(ids: string[]): Promise<void> {
    mutate((db) => {
      db.budgets = db.budgets.filter((b) => !ids.includes(b.id));
    });
  },

  async getSchedules(): Promise<ReportSchedule[]> {
    return clone(load().schedules);
  },
  async upsertSchedule(s: ReportSchedule): Promise<void> {
    mutate((db) => {
      const idx = db.schedules.findIndex((x) => x.id === s.id);
      if (idx >= 0) db.schedules[idx] = s;
      else db.schedules.push(s);
    });
  },
  async deleteSchedule(id: string): Promise<void> {
    mutate((db) => {
      db.schedules = db.schedules.filter((s) => s.id !== id);
    });
  },

  async getRates(): Promise<CachedRates | null> {
    return clone(load().rates);
  },
  async saveRates(r: CachedRates): Promise<void> {
    mutate((db) => {
      db.rates = r;
    });
  },

  /** Reset the local dataset back to the demo dataset. */
  async resetToDemo(): Promise<void> {
    const demo = generateDemoData();
    cache = {
      profile: demo.profile,
      transactions: demo.transactions,
      invoices: demo.invoices,
      budgets: demo.budgets,
      schedules: demo.schedules,
      rates: demo.rates,
    };
    persist(cache);
  },
};
