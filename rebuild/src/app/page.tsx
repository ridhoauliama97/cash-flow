import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Cash Flow & Accounting — Rebuild Scaffold
      </h1>
      <p className="max-w-md text-center text-lg text-zinc-600 dark:text-zinc-400">
        Next.js + Supabase + Prisma + shadcn/ui. Subtask 01 — Fase 1 MVP.
      </p>
      <div className="flex gap-4">
        <Button>Primary button</Button>
        <Button variant="outline">Outline button</Button>
      </div>
    </main>
  );
}
