import { EmployeeManager } from "@/components/shared/employee-manager";
import { listEmployees } from "@/lib/actions/employees";
import { listDivisions } from "@/lib/actions/divisions";
import { listDepartments } from "@/lib/actions/departments";
import { AccessDenied } from "@/components/shared/access-denied";
import { hasPageAccess } from "@/lib/rbac";

export const metadata = {
  title: "Karyawan — Master Data",
};

export default async function EmployeesPage() {
  const allowed = await hasPageAccess("master-data", "read");
  if (!allowed) return <AccessDenied />;

  const [employeesRes, divisionsRes, departmentsRes] = await Promise.all([
    listEmployees(),
    listDivisions(),
    listDepartments(),
  ]);
  if (!employeesRes.ok)
    throw new Error(`Gagal memuat karyawan: ${employeesRes.error}`);
  if (!divisionsRes.ok)
    throw new Error(`Gagal memuat divisi: ${divisionsRes.error}`);
  if (!departmentsRes.ok)
    throw new Error(`Gagal memuat departemen: ${departmentsRes.error}`);

  return (
    <EmployeeManager
      rows={employeesRes.data ?? []}
      divisions={divisionsRes.data ?? []}
      departments={departmentsRes.data ?? []}
    />
  );
}
