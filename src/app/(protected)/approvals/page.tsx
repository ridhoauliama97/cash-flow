import { hasPageAccess } from "@/lib/rbac";
import { listPendingApprovals } from "@/lib/actions/approvals";
import { AccessDenied } from "@/components/shared/access-denied";
import { ApprovalManager } from "@/components/shared/approval-manager";

export const metadata = { title: "Approval — Cash Flow" };

export default async function ApprovalsPage() {
  if (!(await hasPageAccess("transaction", "approve"))) {
    return <AccessDenied />;
  }

  const res = await listPendingApprovals();
  if (!res.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Approval
        </h1>
        <p className="text-sm text-destructive">{res.error}</p>
      </div>
    );
  }

  return <ApprovalManager rows={res.data!} />;
}
