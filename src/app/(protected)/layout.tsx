import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  return (
    <AppShell user={{ name: user.name ?? null, email: user.email }}>
      {children}
    </AppShell>
  );
}
