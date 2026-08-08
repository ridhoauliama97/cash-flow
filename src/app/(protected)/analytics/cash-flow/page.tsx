import { MonthlyTable } from "@/components/analytics/monthly-table";
import { getMonthlySummary } from "@/lib/actions/analytics";

export const metadata = { title: "Cash Flow — Cash Flow" };

export default async function CashFlowPage() {
  const res = await getMonthlySummary();
  if (!res.ok) throw new Error(`Gagal memuat analitik: ${res.error}`);
  return <MonthlyTable mode="cash-flow" data={res.data!} />;
}
