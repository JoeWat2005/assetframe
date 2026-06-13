import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { verifyLemonSignature, subscriptionStateFromEvent } from "@/lib/lemonsqueezy";

export const dynamic = "force-dynamic";

/**
 * Lemon Squeezy subscription webhook. We:
 *  1. read the RAW body and verify the HMAC signature (reject forgeries),
 *  2. map the event to a subscribed boolean,
 *  3. find the Clerk user by email and set publicMetadata.subscribed.
 * Always returns 200 for accepted-but-irrelevant events so LS doesn't retry forever.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("X-Signature");
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";

  if (!verifyLemonSignature(raw, signature, secret)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let event: {
    meta?: { event_name?: string };
    data?: { attributes?: { user_email?: string; status?: string } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad payload", { status: 400 });
  }

  const eventName = event.meta?.event_name ?? "";
  const attrs = event.data?.attributes ?? {};
  const email = attrs.user_email?.toLowerCase();
  const subscribed = subscriptionStateFromEvent(eventName, attrs.status);

  if (!email || subscribed === null) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const cc = await clerkClient();
    const { data: users } = await cc.users.getUserList({ emailAddress: [email] });
    for (const u of users) {
      await cc.users.updateUserMetadata(u.id, {
        publicMetadata: { ...u.publicMetadata, subscribed },
      });
    }
    return NextResponse.json({ ok: true, updated: users.length, subscribed });
  } catch {
    // Don't leak internals; signal a retry to Lemon Squeezy.
    return new NextResponse("Update failed", { status: 500 });
  }
}
