import { hasPageAccess } from "@/lib/rbac";
import { listPeriods } from "@/lib/actions/periods";
import { AccessDenied } from "@/components/shared/access-denied";
import { PeriodManager } from "@/components/shared/period-manager";

export const metadata = { title: "Periode Akuntansi — Cash Flow" };

export default async function PeriodsPage() {
  if (!(await hasPageAccess("period"))) return <AccessDenied />;

  const periodsRes = await listPeriods();
  if (!periodsRes.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Periode Akuntansi
        </h1>
        <p className="text-sm text-destructive">{periodsRes.error}</p>
      </div>
    );
  }

  return <PeriodManager periods={periodsRes.data!} />;
}
