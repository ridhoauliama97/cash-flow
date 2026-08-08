import { MonthlyTable } from "@/components/analytics/monthly-table";
import { getMonthlySummary } from "@/lib/actions/analytics";

export const metadata = { title: "Revenue — Cash Flow" };

export default async function RevenuePage() {
  const res = await getMonthlySummary();
  if (!res.ok) throw new Error(`Gagal memuat analitik: ${res.error}`);
  return <MonthlyTable mode="revenue" data={res.data!} />;
}
