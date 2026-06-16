import { describe, it, expect } from "vitest";
import { computeEntitlement } from "../lib/access";

const ADMINS = ["admin@assetframe.co.uk"];

describe("computeEntitlement (access business logic)", () => {
  it("free signed-in user: no Pro, no billing, not admin", () => {
    const e = computeEntitlement({}, "user@example.com", ADMINS);
    expect(e).toMatchObject({ signedIn: true, subscribed: false, billingActive: false, admin: false });
  });

  it("paid subscriber: subscribed AND billingActive, with details mirrored", () => {
    const e = computeEntitlement({ subscribed: true, subscriptionId: "123" }, "user@example.com", ADMINS);
    expect(e.subscribed).toBe(true);
    expect(e.billingActive).toBe(true);
    expect(e.subscriptionId).toBe("123");
    expect(e.admin).toBe(false);
  });

  it("admin by email: comped Pro WITHOUT a paid subscription", () => {
    const e = computeEntitlement({}, "admin@assetframe.co.uk", ADMINS);
    expect(e.admin).toBe(true);
    expect(e.subscribed).toBe(true); // complimentary Pro
    expect(e.billingActive).toBe(false); // but not a paying subscriber → no billing UI
  });

  it("admin by Clerk role: comped Pro", () => {
    const e = computeEntitlement({ role: "admin" }, "someone@else.com", ADMINS);
    expect(e.admin).toBe(true);
    expect(e.subscribed).toBe(true);
    expect(e.billingActive).toBe(false);
  });

  it("admin previewing the free tier: keeps admin, loses Pro access", () => {
    const e = computeEntitlement({ role: "admin", adminTier: "free" }, "a@b.com", ADMINS);
    expect(e.admin).toBe(true);
    expect(e.subscribed).toBe(false); // previewing what a free user sees
    expect(e.billingActive).toBe(false);
  });

  it("admin preview-free ALWAYS wins, even with a legacy paid flag (admins decoupled from billing)", () => {
    const e = computeEntitlement(
      { role: "admin", adminTier: "free", subscribed: true },
      "a@b.com",
      ADMINS
    );
    expect(e.admin).toBe(true);
    expect(e.billingActive).toBe(true); // the flag still reflects that a stale LS sub exists
    expect(e.subscribed).toBe(false); // but the preview tier governs admin Pro, never billing
  });

  it("non-admin can never self-grant via adminTier metadata", () => {
    const e = computeEntitlement({ adminTier: "pro" }, "user@example.com", ADMINS);
    expect(e.admin).toBe(false);
    expect(e.subscribed).toBe(false); // adminTier is inert without admin
  });

  it("normalises an empty renewsAt to undefined and passes cancellation state through", () => {
    const e = computeEntitlement(
      { subscribed: true, subStatus: "cancelled", endsAt: "2026-07-01T00:00:00Z", planName: "Pro", renewsAt: "" },
      "u@x.com",
      ADMINS
    );
    expect(e.subStatus).toBe("cancelled");
    expect(e.endsAt).toBe("2026-07-01T00:00:00Z");
    expect(e.planName).toBe("Pro");
    expect(e.renewsAt).toBeUndefined();
  });
});
