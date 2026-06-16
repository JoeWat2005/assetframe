import { NextRequest, NextResponse } from "next/server";
import { verifyClerkWebhook } from "@/lib/clerk-webhook";
import { sql } from "@/lib/db";
import { cancelLemonSubscription } from "@/lib/lemonsqueezy";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Clerk webhook. When a user deletes their account, cancel any Lemon Squeezy subscription
// bound to them (via the billing_subscriptions mapping) so they stop being billed, then
// clean up the mapping. Configure in Clerk Dashboard -> Webhooks: endpoint /api/webhooks/clerk,
// event "user.deleted", and set CLERK_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.CLERK_WEBHOOK_SECRET || "";
  const ok = verifyClerkWebhook(
    raw,
    {
      id: req.headers.get("svix-id"),
      timestamp: req.headers.get("svix-timestamp"),
      signature: req.headers.get("svix-signature"),
    },
    secret
  );
  if (!ok) return new NextResponse("Invalid signature", { status: 401 });

  let event: { type?: string; data?: { id?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad payload", { status: 400 });
  }

  if (event.type !== "user.deleted") return NextResponse.json({ ok: true, ignored: true });

  const userId = event.data?.id;
  if (!userId || !sql) return NextResponse.json({ ok: true, ignored: true });

  try {
    const rows = (await sql.query(
      `SELECT subscription_id FROM billing_subscriptions WHERE clerk_user_id = $1`,
      [userId]
    )) as Record<string, unknown>[];

    let cancelled = 0;
    let failed = 0;
    for (const r of rows) {
      const subId = String(r.subscription_id);
      const res = await cancelLemonSubscription(subId); // cancel at period end; stops future billing
      await logAudit({
        actor: "clerk",
        action: "billing_cancel_on_delete",
        target: subId,
        detail: res.ok
          ? `cancelled (${res.status})`
          : `cancel FAILED: ${res.reason} — cancel manually in Lemon Squeezy`,
      });
      if (res.ok) {
        cancelled++;
        // Drop the mapping only once the LS sub is actually cancelled, so a failed cancel
        // (e.g. missing API key) isn't silently lost — the row stays, flagged in the audit
        // log, so it can't quietly keep billing a user who deleted their account.
        await sql.query(`DELETE FROM billing_subscriptions WHERE subscription_id = $1`, [subId]);
      } else {
        failed++;
      }
    }

    // Cascade-delete the user's own data on account deletion. The Clerk user lives outside our
    // DB, so there is no FK to cascade from — we purge their rows here. The track record
    // (scored_results / open_calls) is keyed by report, not user, so it is untouched.
    for (const t of ["watchlists", "push_subscriptions", "subscribers", "feedback"]) {
      try { await sql.query(`DELETE FROM ${t} WHERE clerk_user_id = $1`, [userId]); }
      catch { /* table absent on an un-migrated DB — ignore */ }
    }

    // Record every account deletion (incl. admins) so removals are auditable. Admin access
    // via ADMIN_EMAILS survives deletion: re-signing-up with the same email restores it, so
    // deleting an admin account never permanently locks you out of the dashboard.
    await logAudit({
      actor: "clerk",
      action: "user_deleted",
      target: userId,
      detail: `account deleted; ${cancelled} subscription(s) cancelled${failed ? `, ${failed} FAILED — manual cancel needed` : ""}`,
    });
    return NextResponse.json({ ok: true, cancelled, failed });
  } catch {
    return new NextResponse("Cleanup failed", { status: 500 });
  }
}
