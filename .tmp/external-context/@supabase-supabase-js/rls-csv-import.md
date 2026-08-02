---
source: Context7 API + supabase.com docs
library: Supabase
package: @supabase/supabase-js
topic: rls-csv-import
fetched: 2026-08-02T00:00:00Z
official_docs: https://supabase.com/docs/guides/database/import-data
---

# Supabase — Row Level Security (RLS) + CSV/CSV data import

## RLS basics

RLS is enforced at the database level. The anon key is safe to expose in the browser ONLY if RLS is enabled and policies are correct.

### Enable RLS + user-scoped policies (canonical pattern)

```sql
-- 1. Add a user_id column referencing auth.users
ALTER TABLE public.transactions ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 2. Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3. Policies scoped to the authenticated user
CREATE POLICY "own transactions read" ON public.transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "own transactions insert" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own transactions update" ON public.transactions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own transactions delete" ON public.transactions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

Key points:
- `auth.uid()` returns the signed-in user's UUID; `auth.jwt() -> 'sub'` is the equivalent for JWT claims.
- SELECT/UPDATE/DELETE use `USING`; INSERT and UPDATE use `WITH CHECK`.
- RLS applies per-request with the anon key. The service_role key bypasses RLS (server-side only — never expose it).
- `ENABLE ROW LEVEL SECURITY` alone blocks everything (default deny) — you must add policies.
- When using the JS client with RLS, the authenticated session is sent automatically (Authorization: Bearer).

## Importing CSV data into tables

Four options (from official docs):

### 1. Dashboard CSV import (small datasets, quick)
- Supabase Dashboard → Table Editor → `+ New table` (new) or `Insert` (existing table) → "Import Data from CSV".
- Size limit ~100MB, best for small/dev datasets.
- Runs as the `postgres` role → **bypasses RLS**.

### 2. JS client bulk insert (programmatic, small-to-medium)
There is no `insertMany` method — `.insert()` accepts an **array of rows**:

```ts
const rows = csvRows.map(r => ({ user_id: userId, amount: Number(r.amount), category: r.category }))

// For > ~500–1000 rows, batch to avoid request payload limits/timeouts:
const batchSize = 500
for (let i = 0; i < rows.length; i += batchSize) {
  const { error } = await supabase.from('transactions').insert(rows.slice(i, i + batchSize))
  if (error) { console.error(`Batch ${i / batchSize} failed:`, error); break }
}
```

Best practices:
- Batch sizes of 500–1,000 rows per request.
- Use `.upsert(rows, { onConflict: 'id' })` to make imports **idempotent** (re-runnable without duplicates).
- RLS applies to these inserts — the signed-in user needs INSERT policy; use the service role key in server-side scripts to bypass.
- Note: official docs advise AGAINST large bulk imports through the REST API (latency/disruption); prefer psql COPY for big datasets.

### 3. psql `COPY` (large datasets — recommended for production scale)
Fastest path, streams directly into Postgres, bypasses RLS (connects as postgres role):

```bash
psql "postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres" \
  -c "\COPY public.transactions (user_id, amount, category) FROM './data.csv' WITH (FORMAT csv, HEADER true)"
```

### 4. Supabase API (same as #2 — `insert([...])` arrays)
Fine-grained control; batch and use upsert for idempotency.

### Import gotchas
- Dashboard CSV runs as postgres role (bypasses RLS); JS client inserts respect RLS (need policies).
- Re-running imports: use `upsert` with `onConflict` to avoid duplicates.
- Verify with a `COUNT(*)` after importing; check NULLs in required columns.
- For 10,000+ rows, psql COPY is orders of magnitude faster than the REST API.
