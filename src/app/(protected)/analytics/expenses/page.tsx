import { MonthlyTable } from "@/components/analytics/monthly-table";
import { getMonthlySummary } from "@/lib/actions/analytics";

export const metadata = { title: "Expenses — Cash Flow" };

export default async function ExpensesPage() {
  const res = await getMonthlySummary();
  if (!res.ok) throw new Error(`Gagal memuat analitik: ${res.error}`);
  return <MonthlyTable mode="expenses" data={res.data!} />;
}
