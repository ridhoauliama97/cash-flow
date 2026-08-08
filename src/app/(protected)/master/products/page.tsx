import { ProductManager } from "@/components/shared/product-manager";
import { listProducts } from "@/lib/actions/products";
import { AccessDenied } from "@/components/shared/access-denied";
import { hasPageAccess } from "@/lib/rbac";

export const metadata = {
  title: "Produk — Cash Flow",
};

export default async function ProductsPage() {
  const allowed = await hasPageAccess("master-data", "read");
  if (!allowed) return <AccessDenied />;

  const res = await listProducts();
  if (!res.ok) {
    throw new Error(`Gagal memuat produk: ${res.error}`);
  }
  return <ProductManager rows={res.data ?? []} />;
}
