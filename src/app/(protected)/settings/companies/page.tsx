import { CompanyManager } from "@/components/shared/company-manager";
import { listCompanies } from "@/lib/actions/companies";
import { hasPageAccess } from "@/lib/rbac";
import { AccessDenied } from "@/components/shared/access-denied";

export const metadata = {
  title: "Perusahaan — Cash Flow",
};

export default async function CompaniesPage() {
  const allowed = await hasPageAccess("user", "read");
  if (!allowed) return <AccessDenied />;

  const companiesRes = await listCompanies();
  if (!companiesRes.ok)
    throw new Error(`Gagal memuat perusahaan: ${companiesRes.error}`);

  return <CompanyManager rows={companiesRes.data ?? []} />;
}
