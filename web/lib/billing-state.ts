// Pure billing-state resolution for the Clerk Billing webhook — NO "server-only", NO Clerk
// import — so it can be unit tested. The webhook route (app/api/webhooks/clerk/route.ts) wraps
// this with the Clerk user lookup, the metadata write and the transactional emails.
//
// Clerk Billing is the source of truth for Pro. This module turns a raw billing webhook event
// into (a) the access flag + display fields we mirror onto publicMetadata, and (b) which
// lifecycle email (if any) to send. Status strings are snake_case (e.g. `past_due`) even though
// the event names are camelCase; a free trial reports as `active` (Clerk's status enum has no
// `trialing`), so the trial is only ever signalled explicitly by `subscriptionItem.freeTrialEnding`.

// The Plan whose active subscription grants Pro. Matches the Clerk Billing plan slug.
export const PRO_PLAN_SLUG = "pro";

// ---- Raw billing payload shapes (Clerk sends snake_case in webhook bodies) ----
export type BillingPlan = { id?: string; slug?: string; name?: string };
export type BillingPayer = { user_id?: string; organization_id?: string; email?: string };
export type BillingItem = {
  status?: string;
  plan?: BillingPlan;
  period_end?: number | null;
  canceled_at?: number | null;
  past_due_at?: number | null;
};
export type BillingData = {
  id?: string;
  status?: string;
  payer?: BillingPayer;
  items?: BillingItem[]; // present on subscription.* events
  plan?: BillingPlan; // present on subscriptionItem.* events (the data IS the item)
  period_end?: number | null;
  canceled_at?: number | null;
  past_due_at?: number | null;
};

// Normalised lifecycle status we expose to the UI. "cancelled" (British spelling) = cancel
// scheduled at period end, access still on; "ended" = fully revoked.
export type SubStatus = "active" | "trialing" | "past_due" | "cancelled" | "ended";

export type ProState = {
  subscribed: boolean; // grants Pro access
  subStatus?: SubStatus;
  planName?: string;
  renewsAt?: string; // ISO — next charge date (period_end) while active/trialing
  endsAt?: string; // ISO — when access ends, while cancel-at-period-end is pending
  trialEndsAt?: string; // ISO — when a free trial converts to paid
};

// Statuses that mean the term is over → revoke. Both spellings of cancel for safety.
const TERMINAL = new Set(["ended", "expired", "abandoned", "canceled", "cancelled"]);
// Statuses that mean paid-and-current (a trial reports as `active`).
const ACTIVE = new Set(["active", "trialing", "trial"]);

const toIso = (epochSeconds?: number | null): string | undefined =>
  epochSeconds != null ? new Date(epochSeconds * 1000).toISOString() : undefined;

// Find the 'pro' item on the event. subscription.* events carry items[]; subscriptionItem.*
// events ARE the item (plan at data.plan). Falls back to the top-level data so a subscription
// event with no plan info can still revoke on a terminal status.
function pickProItem(data: BillingData): BillingItem | undefined {
  if (Array.isArray(data.items)) return data.items.find((i) => i.plan?.slug === PRO_PLAN_SLUG);
  if (data.plan?.slug !== undefined) return data.plan.slug === PRO_PLAN_SLUG ? data : undefined;
  return data; // no plan info — use the subscription-level status (revoke path only)
}

/**
 * Resolve, from a billing event, whether the user should have Pro plus the display fields.
 * Returns null when the event doesn't concern the 'pro' plan, or is a non-actionable status
 * (upcoming / incomplete / unknown) — callers leave the existing flag untouched.
 */
export function resolveProState(type: string, data: BillingData): ProState | null {
  const item = pickProItem(data);
  if (!item) return null;

  const status = (item.status || data.status || "").toLowerCase();
  const periodEndIso = toIso(item.period_end ?? data.period_end);
  const canceledAt = item.canceled_at ?? data.canceled_at ?? null;
  const planName = item.plan?.name;

  // A *.canceled / *.ended / *.expired event type is authoritative for revocation even if the
  // status string lags behind.
  const terminalEvent =
    type === "subscriptionItem.canceled" ||
    type === "subscriptionItem.ended" ||
    type === "subscriptionItem.expired" ||
    type === "subscription.canceled"; // defensive; Clerk has no such event today

  // REVOKE — the subscription has fully ended.
  if (terminalEvent || TERMINAL.has(status)) {
    return { subscribed: false, subStatus: "ended" };
  }
  // PAST DUE — payment failed; keep access through the grace period but flag it.
  if (status === "past_due") {
    return { subscribed: true, subStatus: "past_due", planName, renewsAt: periodEndIso };
  }
  // TRIAL ENDING — explicit heads-up; the trial is still active and converts at period end.
  if (type === "subscriptionItem.freeTrialEnding") {
    return { subscribed: true, subStatus: "trialing", planName, trialEndsAt: periodEndIso, renewsAt: periodEndIso };
  }
  // ACTIVE (a trial also reports as active here).
  if (ACTIVE.has(status)) {
    if (canceledAt != null) {
      // Cancel-at-period-end: access stays on until period end, then a terminal event flips it
      // off. This is the state the account UI shows as "cancelling".
      return { subscribed: true, subStatus: "cancelled", planName, endsAt: periodEndIso };
    }
    return { subscribed: true, subStatus: "active", planName, renewsAt: periodEndIso };
  }
  // upcoming / incomplete / unknown / empty — non-actionable; leave the flag unchanged.
  return null;
}

// ---- Lifecycle email decision (idempotent across webhook re-deliveries) ----
export type BillingEmailKind = "welcome" | "trial_ending" | "payment_failed" | "cancelled";

export type PrevBillingMeta = {
  subscribed?: boolean;
  subStatus?: string;
  notified?: Record<string, string>;
};

/**
 * Decide which transactional email (if any) this event should trigger, plus a dedupe `key`.
 * The caller stores `notified[kind] = key` only after a successful send, so a redelivered or
 * repeated event with the same key sends nothing — while a genuinely new occurrence (new
 * subscription id or billing period) produces a new key and re-notifies.
 */
export function decideBillingEmail(
  prev: PrevBillingMeta,
  type: string,
  data: BillingData,
  state: ProState
): { kind: BillingEmailKind; key: string } | null {
  const subId = data.id ?? "";
  const notified = prev.notified || {};
  const once = (kind: BillingEmailKind, key: string) =>
    notified[kind] === key ? null : { kind, key };

  // Trial ending reminder — the load-bearing industry-standard touch.
  if (type === "subscriptionItem.freeTrialEnding") {
    return once("trial_ending", `${subId}:${state.trialEndsAt ?? ""}`);
  }
  // Payment failed — dunning.
  if (state.subStatus === "past_due") {
    return once("payment_failed", `${subId}:${state.renewsAt ?? ""}`);
  }
  // Cancellation scheduled (cancel-at-period-end).
  if (state.subStatus === "cancelled") {
    return once("cancelled", `${subId}:${state.endsAt ?? ""}`);
  }
  // Welcome — first time we grant access (every new subscription starts with the 3-day trial).
  if (state.subscribed && state.subStatus === "active" && prev.subscribed !== true) {
    return once("welcome", subId || "welcome");
  }
  return null;
}
