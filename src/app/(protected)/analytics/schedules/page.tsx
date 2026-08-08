import { AccessDenied } from "@/components/shared/access-denied";
import { ScheduleManager } from "@/components/shared/schedule-manager";
import { hasPageAccess } from "@/lib/rbac";
import { requireUser } from "@/lib/auth";
import { listSchedules } from "@/lib/actions/schedules";

export const metadata = { title: "Schedules — Cash Flow" };

export default async function SchedulesPage() {
  if (!(await hasPageAccess("schedule"))) return <AccessDenied />;

  const user = await requireUser();
  const result = await listSchedules();

  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Schedules
        </h1>
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    );
  }

  return <ScheduleManager schedules={result.data!} userId={user.id} />;
}
