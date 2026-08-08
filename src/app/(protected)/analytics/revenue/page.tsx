import { AccessDenied } from "@/components/shared/access-denied";
import { MonthlyTable } from "@/components/analytics/monthly-table";
import { getMonthlySummary } from "@/lib/actions/analytics";
import { hasPageAccess } from "@/lib/rbac";

export const metadata = { title: "Revenue — Cash Flow" };

export default async function RevenuePage() {
  if (!(await hasPageAccess("analytics"))) return <AccessDenied />;
  const res = await getMonthlySummary();
  if (!res.ok) throw new Error(`Gagal memuat analitik: ${res.error}`);
  return <MonthlyTable mode="revenue" data={res.data!} />;
}
