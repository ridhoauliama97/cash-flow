import { CustomerManager } from "@/components/shared/customer-manager";
import { listCustomers } from "@/lib/actions/customers";

export const metadata = {
  title: "Customers — Cash Flow",
};

export default async function CustomersPage() {
  const res = await listCustomers();
  if (!res.ok) {
    throw new Error(`Gagal memuat customer: ${res.error}`);
  }
  return <CustomerManager rows={res.data ?? []} />;
}
