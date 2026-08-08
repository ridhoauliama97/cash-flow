import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-4 p-6 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border bg-card">
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
