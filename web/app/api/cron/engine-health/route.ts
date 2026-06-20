import { isAuthorizedCron } from "@/lib/cron";
import { sql } from "@/lib/db";
import { getEngineState, getEngineRuns } from "@/lib/engine";
import { sendEmail, emailShell, emailButton } from "@/lib/email";
import { SITE } from "@/site.config";

// Engine health watchdog. Vercel cron hits this on a schedule (see vercel.json). It alerts the
// admin when the engine goes OFFLINE (heartbeat stale) or when the latest run FAILED, so a silent
// overnight failure doesn't slip past. Alerting is:
//  - edge-triggered + idempotent via notification_log: the offline alert is sent ONCE per outage
//    (the claim row is cleared when the engine comes back online, so the next outage re-alerts);
//    a failed-run alert is sent once per run id.
//  - email via Resend (a no-op until RESEND_API_KEY/RESEND_FROM are set — then it just works).
// Auth: the Vercel cron secret (isAuthorizedCron); returns 401 otherwise.

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim().toLowerCase() || "";
const BASE = SITE.url.replace(/\/$/, "");

async function claim(ref: string): Promise<boolean> {
  if (!sql) return false;
  const rows = (await sql
    .query(
      `INSERT INTO notification_log (ref, recipient, channel) VALUES ($1, $2, 'email_admin')
       ON CONFLICT DO NOTHING RETURNING ref`,
      [ref, ADMIN_EMAIL || "admin"]
    )
    .catch(() => [])) as Record<string, unknown>[];
  return rows.length > 0;
}

async function release(ref: string): Promise<void> {
  if (!sql) return;
  await sql
    .query(`DELETE FROM notification_log WHERE ref = $1 AND channel = 'email_admin'`, [ref])
    .catch(() => {});
}

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new Response("Unauthorized", { status: 401 });
  if (!sql) return Response.json({ ok: false, reason: "no-db" });

  try {
    const [state, runs] = await Promise.all([getEngineState(), getEngineRuns(1)]);
    const engineOffline = !state.online;
    const last = runs[0];
    const lastRunFailed = !!last && last.status === "failed";
    let alertsSent = 0;

    // --- Engine offline (edge-triggered) ---
    if (engineOffline) {
      if (await claim("alert:engine:offline")) {
        const r = await sendEmail({
          to: ADMIN_EMAIL || "",
          subject: "⚠️ AssetFrame engine is OFFLINE",
          html: emailShell({
            heading: "The engine has stopped reporting",
            bodyHtml:
              `<p>No heartbeat in the last few minutes — scheduled and manual runs won't execute until it's back. ` +
              `Last seen: <b>${state.lastHeartbeatAt || "never"}</b> (UTC).</p>` +
              `<p style="margin:16px 0">${emailButton(`${BASE}/admin`, "Open the admin console")}</p>`,
          }),
        });
        if (r.ok) alertsSent++;
        else await release("alert:engine:offline"); // let the next tick retry
      }
    } else {
      // Recovered — clear the claim so a future outage alerts again.
      await release("alert:engine:offline");
    }

    // --- Latest run failed (one alert per run id) ---
    if (lastRunFailed) {
      const ref = `alert:engine:run-failed:${last.id}`;
      if (await claim(ref)) {
        const detail = [last.errors, last.logExcerpt].filter(Boolean).join("\n\n").slice(0, 1500);
        const r = await sendEmail({
          to: ADMIN_EMAIL || "",
          subject: `⚠️ AssetFrame run failed: ${last.id}`,
          html: emailShell({
            heading: `Run ${last.id} failed`,
            bodyHtml:
              `<p>The latest engine run finished with status <b>failed</b>.</p>` +
              (detail ? `<pre style="white-space:pre-wrap;font-size:12px;background:#f5f6f8;padding:12px;border-radius:8px;overflow:auto">${detail.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string))}</pre>` : "") +
              `<p style="margin:16px 0">${emailButton(`${BASE}/admin`, "View the engine console")}</p>`,
          }),
        });
        if (r.ok) alertsSent++;
        else await release(ref);
      }
    }

    return Response.json({
      ok: true,
      engineOffline,
      lastRunFailed,
      lastRunId: last?.id ?? null,
      lastHeartbeat: state.lastHeartbeatAt,
      adminEmailSet: Boolean(ADMIN_EMAIL),
      alertsSent,
    });
  } catch {
    return Response.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
