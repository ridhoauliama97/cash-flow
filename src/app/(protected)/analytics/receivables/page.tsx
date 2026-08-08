import { AccessDenied } from "@/components/shared/access-denied";
import { InvoiceManager } from "@/components/shared/invoice-manager";
import { listInvoices } from "@/lib/actions/invoices";
import { listCustomers } from "@/lib/actions/customers";
import { listSuppliers } from "@/lib/actions/suppliers";
import { hasPageAccess } from "@/lib/rbac";

export const metadata = { title: "Receivable & Payable — Cash Flow" };

export default async function ReceivablesPage() {
  if (!(await hasPageAccess("analytics"))) return <AccessDenied />;

  const [invoiceRes, customerRes, supplierRes] = await Promise.all([
    listInvoices(),
    listCustomers(),
    listSuppliers(),
  ]);

  const invoices = invoiceRes.ok ? invoiceRes.data ?? [] : [];
  const customers = customerRes.ok ? customerRes.data ?? [] : [];
  const suppliers = supplierRes.ok ? supplierRes.data ?? [] : [];

  return (
    <InvoiceManager
      invoices={invoices}
      customers={customers}
      suppliers={suppliers}
    />
  );
}
