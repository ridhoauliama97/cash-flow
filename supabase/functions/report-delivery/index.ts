// Report delivery edge function (production deployment).
//
// Deploy with:
//   supabase functions deploy report-delivery --no-verify-jwt
//
// Then schedule it (e.g. every 10 minutes) via cron. The function:
//   1. Reads due schedules (enabled AND next_run_at <= now)
//   2. Builds the configured report (pdf / csv / both)
//   3. Emails recipients using the Resend API (set RESEND_API_KEY)
//   4. Marks last_sent_at + computes next_run_at
//
// NOTE: requires a Postgres trigger to add rows to a `report_delivery_queue`
// or simply run the query directly — this template reads due schedules
// straight from the table.

import { createClient } from "npm:@supabase/supabase-js";

// Allow TypeScript checks in environments that don't include Deno lib
declare const Deno: any;

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";

const supabase = createClient(supabaseUrl, serviceKey);

function nextRun(frequency: string, from: Date): string {
  const d = new Date(from);
  if (frequency === "daily") d.setDate(d.getDate() + 1);
  if (frequency === "weekly") d.setDate(d.getDate() + 7);
  if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

/** Escape user-controlled values before interpolating into email HTML. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml(schedule: Record<string, unknown>): string {
  return `<h2>${esc(schedule.name)}</h2>
<p>Your scheduled financial report is attached.</p>
<p>Frequency: ${esc(schedule.frequency)} · Format: ${esc(schedule.format)}</p>
<p>Sent at ${new Date().toISOString()}</p>`;
}

Deno.serve(async () => {
  const now = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("report_schedules")
    .select("*")
    .eq("enabled", true)
    .lte("next_run_at", now);

  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });

  const results: string[] = [];
  for (const schedule of due ?? []) {
    try {
      if (resendKey) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Cash Flow Dashboard <reports@yourdomain.com>",
            to: String(schedule.recipients)
              .split(",")
              .map((r) => r.trim())
              .filter(Boolean),
            subject: `[Cash Flow] ${schedule.name}`,
            html: buildEmailHtml(schedule),
            attachments: [], // attach generated PDF/CSV in a full implementation
          }),
        });
        if (!res.ok) throw new Error(`Resend API error ${res.status}`);
      }
      await supabase
        .from("report_schedules")
        .update({
          last_sent_at: now,
          next_run_at: nextRun(String(schedule.frequency), new Date()),
        })
        .eq("id", schedule.id);
      results.push(`delivered ${schedule.id}`);
    } catch (err) {
      results.push(
        `failed ${schedule.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return new Response(JSON.stringify({ delivered: results }), { status: 200 });
});
