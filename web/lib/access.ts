// Pure access/entitlement logic — NO "server-only", NO Clerk import — so it can be unit
// tested and reused. lib/entitlements.ts wraps this with the Clerk currentUser() lookup.

export type Entitlement = {
  signedIn: boolean;
  subscribed: boolean; // has Pro access (real subscription OR admin comp)
  billingActive: boolean; // has a real, paid Lemon Squeezy subscription (not admin comp)
  admin: boolean;
  email?: string;
  // Admins implicitly get Pro; "free" lets an admin preview the free tier without paying.
  adminTier?: "pro" | "free";
  // Billing details mirrored from Lemon Squeezy by the webhook (all public-safe).
  subscriptionId?: string;
  lsCustomerId?: string;
  portalUrl?: string;
  subStatus?: string;
  planName?: string;
  renewsAt?: string;
  endsAt?: string;
};

export type PublicMeta = {
  subscribed?: boolean;
  role?: string;
  adminTier?: "pro" | "free";
  subscriptionId?: string;
  lsCustomerId?: string;
  portalUrl?: string;
  subStatus?: string;
  planName?: string;
  renewsAt?: string;
  endsAt?: string;
};

export const SIGNED_OUT: Entitlement = {
  signedIn: false,
  subscribed: false,
  billingActive: false,
  admin: false,
};

/**
 * Derive a signed-in user's entitlement from their Clerk publicMetadata.
 * - admin: Clerk role === "admin" OR their email is in the allowlist.
 * - billingActive: a real, paid Lemon Squeezy subscription (webhook sets meta.subscribed).
 * - subscribed (Pro access): billingActive OR an admin who hasn't toggled to the free preview.
 * `adminEmails` must already be lowercased; `email` should be lowercased too.
 */
export function computeEntitlement(
  meta: PublicMeta,
  email: string | undefined,
  adminEmails: string[]
): Entitlement {
  const admin = meta.role === "admin" || (!!email && adminEmails.includes(email));
  const billingActive = meta.subscribed === true;
  // Admin Pro access is governed PURELY by the preview tier (adminTier) and is fully decoupled
  // from Lemon Squeezy — a legacy/lingering paid flag never overrides the Free/Pro toggle, so
  // the toggle always works. A non-admin's Pro is their real paid subscription.
  const subscribed = admin ? meta.adminTier !== "free" : billingActive;

  return {
    signedIn: true,
    subscribed,
    billingActive,
    admin,
    email,
    adminTier: meta.adminTier,
    subscriptionId: meta.subscriptionId,
    lsCustomerId: meta.lsCustomerId,
    portalUrl: meta.portalUrl,
    subStatus: meta.subStatus,
    planName: meta.planName,
    renewsAt: meta.renewsAt || undefined,
    endsAt: meta.endsAt || undefined,
  };
}
