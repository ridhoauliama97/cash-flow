import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/rbac";
import { AppShell } from "@/components/layout/app-shell";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  const permissions = await getEffectivePermissions(user.id);
  return (
    <AppShell
      user={{ name: user.name ?? null, email: user.email }}
      allowed={[...permissions]}
    >
      {children}
    </AppShell>
  );
}
