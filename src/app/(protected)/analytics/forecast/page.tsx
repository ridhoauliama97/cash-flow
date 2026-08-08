import { AccessDenied } from "@/components/shared/access-denied";
import { ForecastManager } from "@/components/shared/forecast-manager";
import { listForecasts } from "@/lib/actions/forecasts";
import { hasPageAccess } from "@/lib/rbac";

export const metadata = { title: "Forecast — Cash Flow" };

export default async function ForecastPage() {
  if (!(await hasPageAccess("analytics"))) return <AccessDenied />;
  const res = await listForecasts();
  if (!res.ok) throw new Error(`Gagal memuat forecast: ${res.error}`);
  return <ForecastManager forecasts={res.data ?? []} />;
}
