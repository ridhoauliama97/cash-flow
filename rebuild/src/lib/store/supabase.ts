import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Supabase-backed store (mode cloud). Rows scoped ke authenticated user
 * (RLS). Skeleton — CRUD per entity menyusul di task 05/06/11–16.
 * Adaptasi pola lama: src/lib/store/supabase.ts (app Vite).
 */
export async function createSupabaseStore() {
  const client = await createServerClient();

  const userId = async (): Promise<string> => {
    const { data } = await client.auth.getUser();
    if (!data.user?.id) throw new Error("Not authenticated");
    return data.user.id;
  };

  return { client, userId };
}

export type SupabaseStore = Awaited<ReturnType<typeof createSupabaseStore>>;
