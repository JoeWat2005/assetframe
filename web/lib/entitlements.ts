import "server-only";
import { currentUser } from "@clerk/nextjs/server";

export type Entitlement = {
  signedIn: boolean;
  subscribed: boolean;
  admin: boolean;
  email?: string;
};

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Single source of truth for access. Subscription + admin role live in Clerk
 * user publicMetadata (set by the Lemon Squeezy webhook / Clerk dashboard).
 * Admins implicitly get subscriber access. Falls back to an env email allowlist
 * so you can grant yourself admin before wiring metadata.
 */
export async function getEntitlement(): Promise<Entitlement> {
  const user = await currentUser();
  if (!user) return { signedIn: false, subscribed: false, admin: false };

  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
  const meta = (user.publicMetadata || {}) as { subscribed?: boolean; role?: string };
  const admin = meta.role === "admin" || (!!email && ADMIN_EMAILS.includes(email));
  const subscribed = meta.subscribed === true || admin;

  return { signedIn: true, subscribed, admin, email };
}
