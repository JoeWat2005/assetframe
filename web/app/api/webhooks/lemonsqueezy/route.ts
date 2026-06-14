import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { verifyLemonSignature, subscriptionStateFromEvent } from "@/lib/lemonsqueezy";

export const dynamic = "force-dynamic";

type Attrs = {
  user_email?: string;
  status?: string;
  variant_name?: string;
  product_name?: string;
  customer_id?: string | number;
  updated_at?: string;
  renews_at?: string | null;
  ends_at?: string | null;
  urls?: { customer_portal?: string; update_payment_method?: string };
};
type ClerkUser = Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUser"]>>;

// The account we credit must be the VERIFIED paying customer — never raw checkout
// custom_data. Only a Clerk user whose *verified primary* email equals the Lemon
// Squeezy customer email (from the signature-verified payload) may be granted Pro.
// This blocks granting Pro to an arbitrary/victim account by injecting their user_id.
function isVerifiedPayer(u: ClerkUser, email: string): boolean {
  const primary = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId);
  return (
    !!primary &&
    primary.emailAddress.toLowerCase() === email &&
    primary.verification?.status === "verified"
  );
}

/**
 * Lemon Squeezy subscription webhook. We:
 *  1. read the RAW body and verify the HMAC signature (reject forgeries),
 *  2. map the event to a subscribed boolean,
 *  3. credit ONLY the Clerk account whose verified primary email matches the payer,
 *  4. drop stale/replayed events (not newer than the last one applied for that sub).
 * Returns 200 for accepted-but-irrelevant events so LS doesn't retry forever.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("X-Signature");
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";

  if (!verifyLemonSignature(raw, signature, secret)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let event: {
    meta?: { event_name?: string; custom_data?: { user_id?: string } };
    data?: { id?: string | number; attributes?: Attrs };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad payload", { status: 400 });
  }

  const eventName = event.meta?.event_name ?? "";
  const attrs = event.data?.attributes ?? {};
  const email = attrs.user_email?.toLowerCase();
  const hintUserId = event.meta?.custom_data?.user_id; // a hint only — must match the payer email
  const subscribed = subscriptionStateFromEvent(eventName, attrs.status);

  // Need a real state and the verified payer email to bind to (id alone is not trusted).
  if (subscribed === null || !email) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const subscriptionId = event.data?.id != null ? String(event.data.id) : undefined;
  const eventAt = attrs.updated_at ?? ""; // ISO timestamp; used to drop stale/replayed events

  // Details the billing page needs (id to cancel, portal URL, human-readable status). All public-safe.
  const patch: Record<string, unknown> = { subscribed };
  if (subscriptionId) patch.subscriptionId = subscriptionId;
  if (attrs.customer_id != null) patch.lsCustomerId = String(attrs.customer_id);
  if (attrs.urls?.customer_portal) patch.portalUrl = attrs.urls.customer_portal;
  if (attrs.status) patch.subStatus = attrs.status;
  if (attrs.variant_name || attrs.product_name) patch.planName = attrs.variant_name || attrs.product_name;
  if (attrs.renews_at !== undefined) patch.renewsAt = attrs.renews_at;
  if (attrs.ends_at !== undefined) patch.endsAt = attrs.ends_at;
  if (eventAt) patch.subUpdatedAt = eventAt;

  try {
    const cc = await clerkClient();

    // Resolve the account: trust the user_id hint only when its verified primary email
    // matches the payer; otherwise look the payer up by verified email. Never fan out.
    const candidates: ClerkUser[] = [];
    if (hintUserId) {
      const u = await cc.users.getUser(hintUserId).catch(() => null);
      if (u && isVerifiedPayer(u, email)) candidates.push(u);
    }
    if (candidates.length === 0) {
      const { data: users } = await cc.users.getUserList({ emailAddress: [email] });
      for (const u of users) if (isVerifiedPayer(u, email)) candidates.push(u);
    }
    if (candidates.length === 0) {
      return NextResponse.json({ ok: true, ignored: true, reason: "no-verified-payer" });
    }

    let updated = 0;
    for (const u of candidates) {
      const meta = (u.publicMetadata || {}) as { subscriptionId?: string; subUpdatedAt?: string };
      // Idempotency / out-of-order guard: skip events that aren't newer than the last one
      // applied for this same subscription (drops replays and stale deliveries).
      if (
        eventAt && subscriptionId &&
        meta.subscriptionId === subscriptionId && meta.subUpdatedAt && eventAt <= meta.subUpdatedAt
      ) {
        continue;
      }
      await cc.users.updateUserMetadata(u.id, { publicMetadata: { ...u.publicMetadata, ...patch } });
      updated += 1;
    }
    return NextResponse.json({ ok: true, updated, subscribed });
  } catch {
    // Don't leak internals; signal a retry to Lemon Squeezy.
    return new NextResponse("Update failed", { status: 500 });
  }
}
