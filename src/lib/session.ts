import type { User } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

/**
 * Pure helper (unit-testable di node env tanpa next/headers):
 * ekstrak AuthUser dari Supabase User (hasil auth.getUser()).
 */
export function getUserFromSession(user: User | null): AuthUser | null {
  if (!user?.id) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    name:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined),
  };
}
