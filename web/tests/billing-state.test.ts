import { describe, it, expect } from "vitest";
import { resolveProState, decideBillingEmail, type BillingData } from "../lib/billing-state";

// epoch seconds -> ISO, the same transform the module uses (deterministic, UTC).
const PERIOD_END = 1751328000; // a fixed future-ish period end
const ISO = new Date(PERIOD_END * 1000).toISOString();

// A subscriptionItem.* payload: the data IS the item.
const item = (over: Partial<BillingData> = {}): BillingData => ({
  id: "sub_1",
  status: "active",
  plan: { slug: "pro", name: "AssetFrame Pro" },
  period_end: PERIOD_END,
  payer: { user_id: "user_1" },
  ...over,
});

describe("resolveProState", () => {
  it("grants Pro on an active item (subscriptionItem.active)", () => {
    const s = resolveProState("subscriptionItem.active", item());
    expect(s).toMatchObject({ subscribed: true, subStatus: "active", planName: "AssetFrame Pro", renewsAt: ISO });
    expect(s?.endsAt).toBeUndefined();
  });

  it("grants Pro on a subscription.active event via items[]", () => {
    const data: BillingData = {
      id: "sub_2",
      status: "active",
      payer: { user_id: "user_1" },
      items: [{ status: "active", plan: { slug: "pro", name: "AssetFrame Pro" }, period_end: PERIOD_END }],
    };
    expect(resolveProState("subscription.active", data)).toMatchObject({ subscribed: true, subStatus: "active" });
  });

  it("marks cancel-at-period-end as cancelling but KEEPS access (subscriptionItem.updated + canceled_at)", () => {
    const s = resolveProState("subscriptionItem.updated", item({ canceled_at: PERIOD_END - 100 }));
    expect(s).toMatchObject({ subscribed: true, subStatus: "cancelled", endsAt: ISO });
    expect(s?.renewsAt).toBeUndefined(); // it won't renew
  });

  it("revokes on a terminal event (subscriptionItem.canceled)", () => {
    expect(resolveProState("subscriptionItem.canceled", item({ status: "canceled" }))).toMatchObject({
      subscribed: false,
      subStatus: "ended",
    });
  });

  it("revokes on a terminal status regardless of event (ended/expired)", () => {
    expect(resolveProState("subscriptionItem.updated", item({ status: "ended" }))?.subscribed).toBe(false);
    expect(resolveProState("subscriptionItem.updated", item({ status: "expired" }))?.subscribed).toBe(false);
  });

  it("keeps access during past_due (grace) and flags it", () => {
    expect(resolveProState("subscriptionItem.pastDue", item({ status: "past_due" }))).toMatchObject({
      subscribed: true,
      subStatus: "past_due",
    });
  });

  it("treats freeTrialEnding as a trialing grant with a trial end date", () => {
    const s = resolveProState("subscriptionItem.freeTrialEnding", item());
    expect(s).toMatchObject({ subscribed: true, subStatus: "trialing", trialEndsAt: ISO });
  });

  it("ignores a non-pro plan item (returns null — flag untouched)", () => {
    expect(resolveProState("subscriptionItem.active", item({ plan: { slug: "other" } }))).toBeNull();
  });

  it("ignores non-actionable statuses (upcoming / incomplete)", () => {
    expect(resolveProState("subscriptionItem.upcoming", item({ status: "upcoming" }))).toBeNull();
    expect(resolveProState("subscriptionItem.incomplete", item({ status: "incomplete" }))).toBeNull();
  });
});

describe("decideBillingEmail", () => {
  const activeState = { subscribed: true, subStatus: "active" as const, renewsAt: ISO };

  it("sends a welcome on the first grant (was not subscribed before)", () => {
    const d = decideBillingEmail({ subscribed: false }, "subscriptionItem.active", item(), activeState);
    expect(d).toEqual({ kind: "welcome", key: "sub_1" });
  });

  it("does NOT re-welcome an already-subscribed user (e.g. a renewal)", () => {
    expect(decideBillingEmail({ subscribed: true }, "subscriptionItem.active", item(), activeState)).toBeNull();
  });

  it("sends the trial-ending reminder on freeTrialEnding", () => {
    const state = { subscribed: true, subStatus: "trialing" as const, trialEndsAt: ISO };
    const d = decideBillingEmail({ subscribed: true }, "subscriptionItem.freeTrialEnding", item(), state);
    expect(d?.kind).toBe("trial_ending");
  });

  it("sends a dunning email on past_due and a cancellation email on cancel", () => {
    const pastDue = decideBillingEmail({ subscribed: true }, "subscriptionItem.pastDue", item(), {
      subscribed: true,
      subStatus: "past_due",
      renewsAt: ISO,
    });
    expect(pastDue?.kind).toBe("payment_failed");

    const cancelled = decideBillingEmail({ subscribed: true }, "subscriptionItem.updated", item(), {
      subscribed: true,
      subStatus: "cancelled",
      endsAt: ISO,
    });
    expect(cancelled?.kind).toBe("cancelled");
  });

  it("is idempotent — does not resend when notified[kind] already matches the key", () => {
    const d = decideBillingEmail(
      { subscribed: false, notified: { welcome: "sub_1" } },
      "subscriptionItem.active",
      item(),
      activeState
    );
    expect(d).toBeNull();
  });
});
