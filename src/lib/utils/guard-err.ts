import { PermissionError } from "@/lib/rbac";

export function guardErr(e: unknown): string {
  if (e instanceof PermissionError) return e.message;
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null) {
    const obj = e as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.error === "object" && obj.error !== null) {
      const err = obj.error as Record<string, unknown>;
      if (typeof err.message === "string") return err.message;
    }
  }
  return String(e);
}
