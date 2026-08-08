import { UsersManager } from "@/components/shared/users-manager";
import { listUsers } from "@/lib/actions/users";
import { listRoles } from "@/lib/actions/roles";
import { getSuperAdminUserIds } from "@/lib/rbac";

export const metadata = {
  title: "Users — Cash Flow",
};

export default async function UsersPage() {
  const [usersRes, rolesRes, superAdminIds] = await Promise.all([
    listUsers(),
    listRoles(),
    getSuperAdminUserIds(),
  ]);
  if (!usersRes.ok) throw new Error(`Gagal memuat user: ${usersRes.error}`);
  if (!rolesRes.ok) throw new Error(`Gagal memuat role: ${rolesRes.error}`);

  return (
    <UsersManager
      rows={usersRes.data ?? []}
      roles={rolesRes.data ?? []}
      superAdminIds={[...superAdminIds]}
    />
  );
}
