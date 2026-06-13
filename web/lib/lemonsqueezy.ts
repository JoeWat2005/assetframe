import crypto from "node:crypto";

/**
 * Verify a Lemon Squeezy webhook came from Lemon Squeezy (HMAC-SHA256 of the raw
 * body with your signing secret), using a timing-safe comparison. Reject anything
 * that doesn't match — never trust an unsigned/forged webhook to grant access.
 */
export function verifyLemonSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Webhook events we act on. Anything else (orders, refunds without a sub status, etc.) is ignored.
const SUBSCRIPTION_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_resumed",
  "subscription_unpaused",
  "subscription_paused",
  "subscription_cancelled",
  "subscription_expired",
  "subscription_payment_success",
  "subscription_payment_failed",
  "subscription_payment_recovered",
  "subscription_plan_changed",
]);

// Access is decided by the subscription STATUS, which Lemon Squeezy sends on every
// subscription event — more reliable than guessing from the event name.
//  - active / on_trial         → paying or trialing: access
//  - cancelled                 → cancelled but NOT yet expired: keep access until period end
//  - past_due                  → payment retrying (dunning): keep access during the grace window
//  - expired / unpaid / paused → no access
const ACTIVE_STATUSES = new Set(["active", "on_trial", "cancelled", "past_due"]);
const INACTIVE_STATUSES = new Set(["expired", "unpaid", "paused"]);

/**
 * Map a webhook (event name + subscription status) to a subscribed boolean, or
 * null when the event/status is irrelevant and access should be left unchanged.
 */
export function subscriptionStateFromEvent(
  eventName: string,
  status: string | undefined
): boolean | null {
  if (!SUBSCRIPTION_EVENTS.has(eventName)) return null;
  if (status && ACTIVE_STATUSES.has(status)) return true;
  if (status && INACTIVE_STATUSES.has(status)) return false;
  return null;
}
