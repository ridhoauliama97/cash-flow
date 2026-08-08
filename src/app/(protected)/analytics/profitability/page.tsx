import { MonthlyTable } from "@/components/analytics/monthly-table";
import { getMonthlySummary } from "@/lib/actions/analytics";

export const metadata = { title: "Profitability — Cash Flow" };

export default async function ProfitabilityPage() {
  const res = await getMonthlySummary();
  if (!res.ok) throw new Error(`Gagal memuat analitik: ${res.error}`);
  return <MonthlyTable mode="profitability" data={res.data!} />;
}
