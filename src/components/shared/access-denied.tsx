import { ShieldAlert } from "lucide-react";

export function AccessDenied({
  title = "Akses ditolak",
  description = "Anda tidak memiliki hak akses untuk menu ini. Hubungi administrator untuk meminta akses.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
        <ShieldAlert className="size-8 text-destructive" />
        <p>403 — permission tidak tersedia untuk akun Anda.</p>
      </div>
    </div>
  );
}
