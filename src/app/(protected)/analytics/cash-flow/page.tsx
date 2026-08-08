import { AccessDenied } from "@/components/shared/access-denied";
import { MonthlyTable } from "@/components/analytics/monthly-table";
import { getMonthlySummary } from "@/lib/actions/analytics";
import { hasPageAccess } from "@/lib/rbac";

export const metadata = { title: "Cash Flow — Cash Flow" };

export default async function CashFlowPage() {
  if (!(await hasPageAccess("analytics"))) return <AccessDenied />;
  const res = await getMonthlySummary();
  if (!res.ok) throw new Error(`Gagal memuat analitik: ${res.error}`);
  return <MonthlyTable mode="cash-flow" data={res.data!} />;
}
