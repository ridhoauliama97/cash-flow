import { TransactionManager } from "@/components/shared/transaction-manager";
import { listTransactions } from "@/lib/actions/transactions";
import { listCostCenters } from "@/lib/actions/cost-centers";

export const metadata = {
  title: "Transaksi — Cash Flow",
};

export default async function TransactionsPage() {
  const [txns, costCenters] = await Promise.all([
    listTransactions(),
    listCostCenters(),
  ]);
  if (!txns.ok) {
    throw new Error(`Gagal memuat transaksi: ${txns.error}`);
  }
  if (!costCenters.ok) {
    throw new Error(`Gagal memuat cost center: ${costCenters.error}`);
  }
  return (
    <TransactionManager
      rows={txns.data ?? []}
      costCenters={costCenters.data ?? []}
    />
  );
}
