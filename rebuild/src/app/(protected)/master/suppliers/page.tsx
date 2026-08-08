import { SupplierManager } from "@/components/shared/supplier-manager";
import { listSuppliers } from "@/lib/actions/suppliers";

export const metadata = {
  title: "Supplier — Cash Flow",
};

export default async function SuppliersPage() {
  const res = await listSuppliers();
  if (!res.ok) {
    throw new Error(`Gagal memuat supplier: ${res.error}`);
  }
  return <SupplierManager rows={res.data ?? []} />;
}
