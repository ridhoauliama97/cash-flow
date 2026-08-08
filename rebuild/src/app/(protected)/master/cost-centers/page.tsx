import { CostCenterManager } from "@/components/shared/cost-center-manager";
import { listCostCenters, listDivisions } from "@/lib/actions/cost-centers";

export const metadata = {
  title: "Cost Centers — Cash Flow",
};

export default async function CostCentersPage() {
  const [costCentersRes, divisionsRes] = await Promise.all([
    listCostCenters(),
    listDivisions(),
  ]);
  if (!costCentersRes.ok) {
    throw new Error(`Gagal memuat cost center: ${costCentersRes.error}`);
  }
  if (!divisionsRes.ok) {
    throw new Error(`Gagal memuat divisi: ${divisionsRes.error}`);
  }
  return (
    <CostCenterManager
      rows={costCentersRes.data ?? []}
      divisions={divisionsRes.data ?? []}
    />
  );
}
