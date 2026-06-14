import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { computeEntitlement, SIGNED_OUT, type Entitlement, type PublicMeta } from "./access";

export type { Entitlement } from "./access";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Single source of truth for access. Subscription + admin role live in Clerk
 * user publicMetadata (set by the Lemon Squeezy webhook / Clerk dashboard).
 * Admins implicitly get subscriber access. Falls back to an env email allowlist
 * so you can grant yourself admin before wiring metadata. Pure derivation lives in
 * lib/access.ts (computeEntitlement) so the business logic is unit-tested.
 */
export async function getEntitlement(): Promise<Entitlement> {
  const user = await currentUser();
  if (!user) return SIGNED_OUT;
  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
  return computeEntitlement((user.publicMetadata || {}) as PublicMeta, email, ADMIN_EMAILS);
}
