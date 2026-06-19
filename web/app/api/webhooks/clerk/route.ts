import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { verifyClerkWebhook } from "@/lib/clerk-webhook";
import { sql } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendEmail, emailConfigured } from "@/lib/email";
import { buildBillingEmail } from "@/lib/billing-emails";
import {
  resolveProState,
  decideBillingEmail,
  PRO_PLAN_SLUG,
  type BillingData,
} from "@/lib/billing-state";
import { SITE } from "@/site.config";

export const dynamic = "force-dynamic";

// Clerk webhook. Two responsibilities, both verified with the same svix signature
// (CLERK_WEBHOOK_SECRET). Configure in Clerk Dashboard -> Webhooks: endpoint
// /api/webhooks/clerk. The events that DO something here:
//   - user.deleted                     -> cascade-delete the user's data in our DB
//   - subscriptionItem.active          -> grant Pro (new sub, trial start, renewal)
//   - subscriptionItem.updated         -> detect cancel-at-period-end ("cancelling" state)
//   - subscriptionItem.canceled/.ended -> revoke Pro when the term fully ends
//   - subscriptionItem.pastDue         -> keep access in grace + send a dunning email
//   - subscriptionItem.freeTrialEnding -> send the trial-ending reminder email
//   - subscription.active              -> belt-and-braces grant (subscription-level)
// Other billing events (paymentAttempt.*, subscription.created/updated/pastDue,
// subscriptionItem.abandoned/incomplete/upcoming) are harmless no-ops. Clerk Billing is the
// source of truth for Pro; this webhook mirrors a paid 'pro' subscription onto
// publicMetadata.subscribed (+ display fields), which lib/access.ts derives access from.
// Clerk Billing tears the subscription down itself on user deletion, so user.deleted no longer
// touches billing.

type ClerkEvent = {
  type?: string;
  data?: {
    id?: string;
    email_addresses?: Array<{ email_address?: string }>;
  } & BillingData;
};

const isBillingEvent = (type: string) =>
  type.startsWith("subscription") || type.startsWith("subscriptionItem");

// publicMetadata view used here. Spread untyped so we never clobber keys we don't own
// (adminTier, role, comp, …). `notified` tracks which lifecycle emails we've already sent.
type Meta = Record<string, unknown> & {
  subscribed?: boolean;
  subStatus?: string;
  notified?: Record<string, string>;
};

async function handleBilling(event: ClerkEvent): Promise<NextResponse> {
  const type = event.type || "";
  const data = (event.data || {}) as BillingData;
  const userId = data.payer?.user_id;
  // B2C only — we never grant Pro to an organization payer here.
  if (!userId) return NextResponse.json({ ok: true, ignored: true, reason: "no-user-payer" });

  const state = resolveProState(type, data);
  if (!state) return NextResponse.json({ ok: true, ignored: true, reason: "not-actionable" });

  try {
    const cc = await clerkClient();
    const user = await cc.users.getUser(userId).catch(() => null);
    if (!user) return NextResponse.json({ ok: true, ignored: true, reason: "no-account" });

    const prev = (user.publicMetadata || {}) as Meta;

    // MERGE — never clobber other publicMetadata keys. On grant, mirror the lifecycle display
    // fields; on revoke, clear them all (and `notified`, so a future resubscribe re-welcomes).
    const next: Meta = { ...prev, subscribed: state.subscribed };
    if (state.subscribed) {
      next.subStatus = state.subStatus;
      if (state.planName) next.planName = state.planName;
      next.renewsAt = state.renewsAt; // undefined clears the key on serialization
      next.endsAt = state.endsAt;
      next.trialEndsAt = state.trialEndsAt;
      if (data.id) next.subscriptionId = data.id;
    } else {
      next.subStatus = undefined;
      next.planName = undefined;
      next.renewsAt = undefined;
      next.endsAt = undefined;
      next.trialEndsAt = undefined;
      next.subscriptionId = undefined;
      next.notified = undefined;
    }

    // Lifecycle email — idempotent across re-deliveries (see decideBillingEmail). Sent best-effort;
    // a send failure never fails the webhook, and `notified` only advances on a successful send so
    // a redelivery retries. No-ops entirely until Resend is configured.
    const to = user.primaryEmailAddress?.emailAddress;
    const decision = decideBillingEmail(
      { subscribed: prev.subscribed, subStatus: prev.subStatus, notified: prev.notified },
      type,
      data,
      state
    );
    if (decision && to && emailConfigured) {
      const date =
        decision.kind === "cancelled"
          ? state.endsAt
          : decision.kind === "trial_ending"
            ? state.trialEndsAt
            : state.renewsAt;
      const { subject, html } = buildBillingEmail(decision.kind, {
        date: date ? date.slice(0, 10) : undefined,
        price: SITE.proPrice,
      });
      try {
        const r = await sendEmail({ to, subject, html });
        if (r.ok) next.notified = { ...(prev.notified || {}), [decision.kind]: decision.key };
      } catch {
        /* never fail the webhook on an email error */
      }
    }

    await cc.users.updateUserMetadata(userId, { publicMetadata: next });

    await logAudit({
      actor: "clerk-billing",
      action: state.subscribed ? "billing_grant" : "billing_revoke",
      target: user.primaryEmailAddress?.emailAddress ?? userId,
      detail: `${type} plan=${PRO_PLAN_SLUG} status=${(data.status || "").toString()} subStatus=${state.subStatus ?? ""} sub=${data.id ?? ""}${decision ? ` email=${decision.kind}` : ""}`,
    });
    return NextResponse.json({ ok: true, updated: 1, subscribed: state.subscribed });
  } catch {
    return new NextResponse("Update failed", { status: 500 });
  }
}

async function handleUserDeleted(event: ClerkEvent): Promise<NextResponse> {
  const userId = event.data?.id;
  if (!userId || !sql) return NextResponse.json({ ok: true, ignored: true });

  try {
    // Resolve any emails tied to this user so we can also purge email-keyed rows (newsletter
    // sign-ups with no clerk_user_id, and the Pro download log). The user.deleted payload may
    // carry email_addresses; we also pull any email stored against the clerk_user_id.
    const emails = new Set<string>();
    for (const ea of event.data?.email_addresses ?? []) {
      const e = ea?.email_address?.trim().toLowerCase();
      if (e) emails.add(e);
    }
    try {
      const erows = (await sql.query(
        `SELECT email FROM subscribers WHERE clerk_user_id = $1 AND email IS NOT NULL`,
        [userId]
      )) as Record<string, unknown>[];
      for (const r of erows) { const e = String(r.email).trim().toLowerCase(); if (e) emails.add(e); }
    } catch { /* table absent — ignore */ }

    // Cascade-delete the user's own data on account deletion. The Clerk user lives outside our
    // DB, so there is no FK to cascade from — we purge their rows here. api_keys is included so a
    // deleted account's API key can no longer authenticate. The track record (scored_results /
    // open_calls) is keyed by report, not user, so it is untouched; admin_audit_log is preserved.
    // Clerk Billing handles subscription teardown itself, so there is no LS sub to cancel here.
    for (const t of ["watchlists", "push_subscriptions", "subscribers", "feedback", "api_keys"]) {
      try { await sql.query(`DELETE FROM ${t} WHERE clerk_user_id = $1`, [userId]); }
      catch { /* table absent on an un-migrated DB — ignore */ }
    }
    // Email-keyed rows: newsletter sign-ups with no clerk_user_id, and the Pro download log.
    for (const email of emails) {
      try { await sql.query(`DELETE FROM subscribers WHERE email = $1`, [email]); } catch { /* ignore */ }
      try { await sql.query(`DELETE FROM download_log WHERE user_id = $1`, [email]); } catch { /* ignore */ }
    }

    // Record every account deletion (incl. admins) so removals are auditable. Admin access
    // via ADMIN_EMAILS survives deletion: re-signing-up with the same email restores it, so
    // deleting an admin account never permanently locks you out of the dashboard.
    await logAudit({
      actor: "clerk",
      action: "user_deleted",
      target: userId,
      detail: `account deleted; data purged (incl. api_keys${emails.size ? `, ${emails.size} email(s)` : ""})`,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return new NextResponse("Cleanup failed", { status: 500 });
  }
}

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

  let event: ClerkEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad payload", { status: 400 });
  }

  const type = event.type || "";
  if (isBillingEvent(type)) return handleBilling(event);
  if (type === "user.deleted") return handleUserDeleted(event);
  return NextResponse.json({ ok: true, ignored: true });
}
