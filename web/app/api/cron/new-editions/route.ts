import { isAuthorizedCron } from "@/lib/cron";
import { sql } from "@/lib/db";
import { clerkClient } from "@clerk/nextjs/server";
import { sendEmail, emailShell } from "@/lib/email";
import { SITE } from "@/site.config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE = SITE.url.replace(/\/$/, "");
const li = (e: { id: string; instrument: string; status: string }) =>
  `<li style="margin-bottom:6px;"><a href="${BASE}/reports/${e.id}" style="color:#0b2545;font-weight:600;">${e.instrument}</a> — ${e.status}</li>`;

// Daily digest of the day's new editions: a newsletter blast to confirmed subscribers, plus
// targeted alerts to users who follow a specific instrument that published today.
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new Response("Unauthorized", { status: 401 });
  if (!sql) return Response.json({ ok: false, reason: "no-db" });
  try {
    const eds = (await sql.query(
      `SELECT e.id, e.slug, e.instrument, e.status
         FROM editions e
        WHERE coalesce(e.hidden, false) = false AND e.report_date = CURRENT_DATE
        ORDER BY e.instrument`
    )) as Record<string, unknown>[];
    if (eds.length === 0) return Response.json({ ok: true, editions: 0, digests: 0, alerts: 0 });

    const list = eds.map((e) => ({ id: String(e.id), slug: String(e.slug), instrument: String(e.instrument), status: String(e.status) }));
    const itemsHtml = list.map(li).join("");

    // 1) Newsletter digest to confirmed subscribers on the 'digest' topic.
    const subs = (await sql.query(
      `SELECT email, unsub_token FROM subscribers WHERE status = 'confirmed' AND 'digest' = ANY(topics)`
    )) as Record<string, unknown>[];
    let digests = 0;
    for (const s of subs) {
      const r = await sendEmail({
        to: String(s.email),
        subject: `New AssetFrame editions — ${list.length} today`,
        html: emailShell({
          heading: "New editions are live",
          bodyHtml:
            `<p style="font-size:14px;">Today&rsquo;s published editions:</p>` +
            `<ul style="padding-left:18px;font-size:14px;">${itemsHtml}</ul>` +
            `<p style="margin-top:12px;font-size:14px;"><a href="${BASE}/reports" style="color:#0b2545;font-weight:600;">Browse all reports →</a></p>`,
          footerNote: `You subscribed to AssetFrame alerts. <a href="${BASE}/api/unsubscribe?token=${String(s.unsub_token)}">Unsubscribe</a>.`,
        }),
      });
      if (r.ok) digests++;
    }

    // 2) Per-instrument alerts to followers (emails resolved via Clerk).
    let alerts = 0;
    const followers = (await sql.query(
      `SELECT clerk_user_id, array_agg(symbol) AS symbols FROM watchlists WHERE symbol = ANY($1) GROUP BY clerk_user_id`,
      [list.map((e) => e.slug)]
    )) as Record<string, unknown>[];
    if (followers.length) {
      let cc: Awaited<ReturnType<typeof clerkClient>> | null = null;
      try { cc = await clerkClient(); } catch { cc = null; }
      if (cc) {
        for (const f of followers) {
          const syms = Array.isArray(f.symbols) ? (f.symbols as string[]) : [];
          const matched = list.filter((e) => syms.includes(e.slug));
          if (!matched.length) continue;
          try {
            const u = await cc.users.getUser(String(f.clerk_user_id));
            const email = u.primaryEmailAddress?.emailAddress;
            if (!email) continue;
            const r = await sendEmail({
              to: email,
              subject: `New edition${matched.length > 1 ? "s" : ""} for instruments you follow`,
              html: emailShell({
                heading: "An instrument you follow has a new edition",
                bodyHtml:
                  `<ul style="padding-left:18px;font-size:14px;">${matched.map(li).join("")}</ul>` +
                  `<p style="margin-top:12px;font-size:14px;"><a href="${BASE}/account" style="color:#0b2545;font-weight:600;">Manage what you follow →</a></p>`,
              }),
            });
            if (r.ok) alerts++;
          } catch {
            /* skip this follower */
          }
        }
      }
    }

    return Response.json({ ok: true, editions: list.length, digests, alerts });
  } catch {
    return Response.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
