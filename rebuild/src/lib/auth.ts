import { createClient } from "@/lib/supabase/server";
import { getUserFromSession, type AuthUser } from "@/lib/session";

/** Current user (server-side, via cookie session). null kalau belum login. */
export async function getUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return getUserFromSession(data.user ?? null);
}

/**
 * Wajib login: throw kalau tidak ada session.
 * Dipakai di layout route (protected) — layout memanggil redirect ke /login.
 */
export async function requireUser(): Promise<AuthUser> {
  const user = await getUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}
