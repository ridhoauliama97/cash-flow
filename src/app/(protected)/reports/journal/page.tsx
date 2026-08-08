import { hasPageAccess } from "@/lib/rbac";
import { listCoa } from "@/lib/actions/coa";
import { AccessDenied } from "@/components/shared/access-denied";
import { JournalPageClient } from "@/components/shared/journal-page-client";

export const metadata = { title: "Journal / General Ledger — Cash Flow" };

export default async function JournalPage() {
  if (!(await hasPageAccess("ledger", "read"))) return <AccessDenied />;

  const coaRes = await listCoa();
  if (!coaRes.ok) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Journal / General Ledger
        </h1>
        <p className="text-sm text-destructive">{coaRes.error}</p>
      </div>
    );
  }

  return <JournalPageClient coaRows={coaRes.data!} />;
}
