import { PermissionMatrixView } from "@/components/shared/permission-matrix";
import { getPermissionMatrix } from "@/lib/actions/permissions";

export const metadata = {
  title: "Permissions — Cash Flow",
};

export default async function PermissionsPage() {
  const res = await getPermissionMatrix();
  if (!res.ok) throw new Error(`Gagal memuat matriks permission: ${res.error}`);
  return <PermissionMatrixView data={res.data!} />;
}
