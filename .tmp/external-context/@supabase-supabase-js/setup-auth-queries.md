---
source: Context7 API + official repo docs
library: Supabase
package: @supabase/supabase-js
topic: setup-auth-queries
fetched: 2026-08-02T00:00:00Z
official_docs: https://supabase.com/docs
---

# Supabase (supabase-js v2) — Setup, Auth, Queries

Current stable line: **v2.x** (latest seen 2.108.2, 2026-06-15). Do NOT use v1 APIs (`supabase.auth.signIn` with callbacks).

## Install

```bash
bun add @supabase/supabase-js
```

## Client setup with Vite/React

Create `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default supabase
```

`.env` (Vite requires `VITE_` prefix to expose to client code):

```
VITE_SUPABASE_URL=https://xyzcompany.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Gotchas:
- The anon key is safe for browsers (RLS protects data). The service_role key must NEVER be used client-side.
- `createClient(url, key)` — create a single client and reuse it (the "single supabase client" pattern).
- New (2025+) API: `client.auth.dispose()` tears down background processes (auto-refresh, BroadcastChannel, onAuthStateChange subscriptions). Idempotent — use it for cleanup in React StrictMode/HMR.

## Auth patterns

All auth methods resolve `{ data, error }` instead of throwing for auth errors (non-auth errors are re-thrown):

```ts
// Sign up (email). Returns session if email confirmation is disabled.
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
    data: { full_name: 'Jane Doe' }, // stored in user_metadata
  },
})
// data: { user, session }  — session may be null when confirmation required

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
})
// data: { user, session, weakPassword? }

// Sign out (clears local session + broadcasts SIGNED_OUT to other tabs)
const { error } = await supabase.auth.signOut()

// Listen to auth state — fires INITIAL_SESSION immediately with current session
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  // events: INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, MFA_CHALLENGE_VERIFIED...
  console.log(event, session?.user)
})
// cleanup: subscription.unsubscribe()

// Read current session/user
const { data: { session } } = await supabase.auth.getSession() // reads localStorage ('supabase-auth' key)
const { data: { user } } = await supabase.auth.getUser()      // verifies token with server — prefer this
```

React hook pattern:

```tsx
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    setUser(session?.user ?? null)
  })
  return () => subscription.unsubscribe()
}, [])
```

Auth gotchas (from auth-js source):
- Session persists in browser localStorage automatically (`persistSession: true` default).
- Calling `getUser()`/`getSession()` inside an `onAuthStateChange` callback is now safe (deadlock fixed in lockless auth). One residual hazard: calling `refreshSession` from inside a `TOKEN_REFRESHED` handler still deadlocks — avoid.

## Queries: select / insert / update / delete

All DB methods resolve `{ data, error }` — always check `error` first:

```ts
// SELECT with filters
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId)          // equality
  .gte('amount', 100)             // >=
  .lte('amount', 1000)            // <=
  .in('category', ['rent', 'food']) // IN list
  .ilike('description', '%coffee%') // case-insensitive LIKE
  .order('created_at', { ascending: false })
  .order('id', { ascending: true }) // secondary sort — chain order() for multi-column
  .limit(50)

// INSERT single row (returns inserted rows when using .select())
const { data, error } = await supabase
  .from('transactions')
  .insert({ user_id: userId, amount: 42.5, category: 'food' })
  .select()

// INSERT multiple rows (bulk) — pass an array of objects
const { error } = await supabase
  .from('transactions')
  .insert([
    { id: 1, user_id: userId, amount: 10 },
    { id: 2, user_id: userId, amount: 20 },
  ])

// UPDATE
const { data, error } = await supabase
  .from('transactions')
  .update({ category: 'groceries' })
  .eq('id', 123)
  .select()

// DELETE with .in() filter
const { error } = await supabase
  .from('transactions')
  .delete()
  .in('id', [1, 2, 3])

// UPSERT — server-side conflict resolution, NOT optimistic
const { data, error } = await supabase
  .from('transactions')
  .upsert(
    [{ id: 1, amount: 15 }, { id: 2, amount: 25 }],
    { onConflict: 'id', ignoreDuplicates: false } // Prefer: resolution=merge-duplicates
  )
// options: onConflict (column), ignoreDuplicates, count, defaultToNull
// Gotcha: upsert sends Prefer: resolution=merge/ignore-duplicates — conflict logic is entirely Postgres-side.
```

Error handling pattern:

```ts
const { data, error } = await supabase.from('transactions').select('*')
if (error) {
  console.error('Query failed:', error.message)
  // show error UI; data is null
  return
}
// use data
```

Realtime subscription (optional, for live dashboards):

```ts
const channel = supabase.channel('db-changes')
channel.on(
  'postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'transactions', filter: 'user_id=eq.' + userId },
  (payload) => { /* payload.new is the inserted row */ }
).subscribe()
```
