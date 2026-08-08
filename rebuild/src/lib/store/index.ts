import { createBrowserClient } from "@supabase/ssr";

export type StoreMode = "local" | "supabase";

/**
 * Mode dipilih SEKALI saat module load (pola repo lama):
 * - "supabase": NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY ter-set
 * - "local": fallback demo data di localStorage
 */
export function resolveStoreMode(): StoreMode {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? "supabase" : "local";
}

let browserClientSingleton: ReturnType<typeof createBrowserClient> | null = null;

/** Browser Supabase client (auth, RLS-scoped rows). null di mode local. */
export function getSupabaseBrowserClient() {
  if (resolveStoreMode() !== "supabase") return null;
  if (!browserClientSingleton) {
    browserClientSingleton = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClientSingleton;
}
