import { DivisionManager } from "@/components/shared/division-manager";
import { listDivisions } from "@/lib/actions/divisions";

export const metadata = {
  title: "Divisi — Master Data",
};

export default async function DivisionsPage() {
  const divisionsRes = await listDivisions();
  if (!divisionsRes.ok)
    throw new Error(`Gagal memuat divisi: ${divisionsRes.error}`);

  return <DivisionManager rows={divisionsRes.data ?? []} />;
}
