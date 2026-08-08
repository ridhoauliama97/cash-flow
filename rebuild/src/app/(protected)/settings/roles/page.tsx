import { RolesManager } from "@/components/shared/roles-manager";
import { listRoles, listDivisions } from "@/lib/actions/roles";

export const metadata = {
  title: "Roles — Cash Flow",
};

export default async function RolesPage() {
  const [rolesRes, divisionsRes] = await Promise.all([listRoles(), listDivisions()]);
  if (!rolesRes.ok) throw new Error(`Gagal memuat role: ${rolesRes.error}`);
  if (!divisionsRes.ok) throw new Error(`Gagal memuat divisi: ${divisionsRes.error}`);

  return <RolesManager rows={rolesRes.data ?? []} divisions={divisionsRes.data ?? []} />;
}
