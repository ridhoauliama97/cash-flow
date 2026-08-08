import { getDefaultCompany } from "@/lib/actions/companies";
import { listUsers } from "@/lib/actions/users";
import { listDivisions } from "@/lib/actions/divisions";
import { listProducts } from "@/lib/actions/products";
import { hasPageAccess } from "@/lib/rbac";
import { AccessDenied } from "@/components/shared/access-denied";
import { Building2, Users, Layers, Package } from "lucide-react";

export const metadata = {
  title: "Pengaturan Umum — Cash Flow",
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold leading-none">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default async function GeneralSettingsPage() {
  const allowed = await hasPageAccess("user", "read");
  if (!allowed) return <AccessDenied />;

  const [companyRes, usersRes, divisionsRes, productsRes] = await Promise.all([
    getDefaultCompany(),
    listUsers(),
    listDivisions(),
    listProducts(),
  ]);

  const company = companyRes.ok ? companyRes.data : null;
  const totalUsers = usersRes.ok ? (usersRes.data ?? []).length : 0;
  const totalDivisions = divisionsRes.ok ? (divisionsRes.data ?? []).length : 0;
  const totalProducts = productsRes.ok ? (productsRes.data ?? []).length : 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Pengaturan Umum
        </h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan pengaturan sistem dan informasi perusahaan default.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Users"
          value={totalUsers}
          icon={Users}
        />
        <StatCard
          label="Total Divisi"
          value={totalDivisions}
          icon={Layers}
        />
        <StatCard
          label="Total Produk"
          value={totalProducts}
          icon={Package}
        />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Building2 className="size-5" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold leading-none">
              Perusahaan Default
            </h2>
            <p className="text-sm text-muted-foreground">
              Informasi perusahaan utama yang digunakan di seluruh sistem.
            </p>
          </div>
        </div>

        {company ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Nama</dt>
              <dd className="mt-1 font-medium">{company.name}</dd>
            </div>
            {company.address && (
              <div>
                <dt className="text-sm text-muted-foreground">Alamat</dt>
                <dd className="mt-1">{company.address}</dd>
              </div>
            )}
            {company.phone && (
              <div>
                <dt className="text-sm text-muted-foreground">Telepon</dt>
                <dd className="mt-1">{company.phone}</dd>
              </div>
            )}
            {company.email && (
              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="mt-1 font-mono text-sm">{company.email}</dd>
              </div>
            )}
            {company.website && (
              <div>
                <dt className="text-sm text-muted-foreground">Website</dt>
                <dd className="mt-1">
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {company.website}
                  </a>
                </dd>
              </div>
            )}
            {company.taxNumber && (
              <div>
                <dt className="text-sm text-muted-foreground">NPWP</dt>
                <dd className="mt-1 font-mono text-sm">{company.taxNumber}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            Belum ada perusahaan default yang ditetapkan.
          </p>
        )}
      </div>
    </div>
  );
}
