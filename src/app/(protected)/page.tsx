import { MonthlyTable } from "@/components/analytics/monthly-table";
import { getMonthlySummary } from "@/lib/actions/analytics";

export const metadata = { title: "Overview — Cash Flow" };

export default async function DashboardPage() {
  const res = await getMonthlySummary();
  if (!res.ok) return <DefaultDashboard />;
  return <MonthlyTable mode="profitability" data={res.data!} />;
}

function DefaultDashboard() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Selamat datang di Cash Flow — sistem akuntansi.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
        Belum ada transaksi — buat transaksi pertama di menu <strong>Transaksi</strong> untuk
        melihat ringkasan analitik di sini.
      </div>
    </div>
  );
}
