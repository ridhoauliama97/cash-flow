import { DepartmentManager } from "@/components/shared/department-manager";
import { listDepartments } from "@/lib/actions/departments";
import { listDivisions } from "@/lib/actions/divisions";

export const metadata = {
  title: "Departemen — Cash Flow",
};

export default async function DepartmentsPage() {
  const [departmentsRes, divisionsRes] = await Promise.all([
    listDepartments(),
    listDivisions(),
  ]);
  if (!departmentsRes.ok)
    throw new Error(`Gagal memuat departemen: ${departmentsRes.error}`);
  if (!divisionsRes.ok)
    throw new Error(`Gagal memuat divisi: ${divisionsRes.error}`);

  return (
    <DepartmentManager
      rows={departmentsRes.data ?? []}
      divisions={divisionsRes.data ?? []}
    />
  );
}
