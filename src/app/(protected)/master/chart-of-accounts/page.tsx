import { CoaManager } from "@/components/shared/coa-manager";
import { listCoa } from "@/lib/actions/coa";

export const metadata = {
  title: "Chart of Accounts — Cash Flow",
};

export default async function ChartOfAccountsPage() {
  const res = await listCoa();
  if (!res.ok) {
    throw new Error(`Gagal memuat akun: ${res.error}`);
  }
  return <CoaManager rows={res.data ?? []} />;
}
