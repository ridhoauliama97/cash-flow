import { GlReportClient } from "@/components/shared/gl-table";
import {
  getGeneralLedger,
  listAccountingPeriods,
} from "@/lib/actions/general-ledger";

export const metadata = {
  title: "Buku Besar — Cash Flow",
};

const firstParam = (v: string | string[] | undefined): string | null =>
  typeof v === "string" && v !== "" ? v : null;

/**
 * Halaman laporan Buku Besar (server component). Filtering SERVER-side:
 * baca searchParams, ambil data via server action, lalu render client wrapper
 * yang hanya navigasi (router.push) saat filter diubah. Client di-remount
 * via `key` agar state lokal sinkron dengan searchParams.
 */
export default async function GeneralLedgerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const period = firstParam(params.period);
  const from = firstParam(params.from);
  const to = firstParam(params.to);

  const [ledger, periods] = await Promise.all([
    getGeneralLedger(period, from, to),
    listAccountingPeriods(),
  ]);
  if (!ledger.ok) {
    throw new Error(`Gagal memuat buku besar: ${ledger.error}`);
  }
  if (!periods.ok) {
    throw new Error(`Gagal memuat periode: ${periods.error}`);
  }

  const filterKey = [period ?? "", from ?? "", to ?? ""].join("|");
  return (
    <GlReportClient
      key={filterKey}
      periods={periods.data ?? []}
      rows={ledger.data?.rows ?? []}
      totals={ledger.data?.totals ?? { debit: 0, credit: 0 }}
      initialParams={{
        period: period ?? "",
        from: from ?? "",
        to: to ?? "",
      }}
    />
  );
}
