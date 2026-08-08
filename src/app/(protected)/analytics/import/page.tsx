import { ImportManager } from "@/components/shared/import-manager";
import { AccessDenied } from "@/components/shared/access-denied";
import { listImportBatches } from "@/lib/actions/import";
import { hasPageAccess } from "@/lib/rbac";

export const metadata = { title: "Import Data — Cash Flow" };

export default async function ImportPage() {
  if (!(await hasPageAccess("import"))) return <AccessDenied />;
  const res = await listImportBatches();
  if (!res.ok) {
    throw new Error(`Gagal memuat batch import: ${res.error}`);
  }
  return <ImportManager batches={res.data ?? []} />;
}
