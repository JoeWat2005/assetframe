"use server";
import { revalidateTag } from "next/cache";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "./admin-auth";
import type { Result } from "@/lib/admin-types";

// Grant or revoke a COMP (complimentary Pro) for a member by email — just flips the
// publicMetadata.subscribed flag. This is for comps only: a real *paid* Clerk Billing
// subscriber should be refunded/cancelled in the Clerk dashboard (Clerk Billing owns the
// subscription lifecycle and will reconcile the flag back via the billing webhook). Clearing
// the flag here would only be overwritten on the subscriber's next billing event.
export async function setPro(email: string, subscribed: boolean): Promise<Result> {
  const ent = await requireAdmin();
  const cleaned = (email || "").trim().toLowerCase();
  if (!cleaned || !cleaned.includes("@")) return { ok: false, message: "Enter a valid email." };
  try {
    const cc = await clerkClient();
    const list = await cc.users.getUserList({ emailAddress: [cleaned], limit: 1 });
    const user = list.data[0];
    if (!user) return { ok: false, message: `No member found for ${cleaned}.` };
    const m = user.publicMetadata || {};

    // Comp toggle — flip the flag, merging the rest of publicMetadata. On revoke we also clear
    // the billing display fields (subStatus / planName / renews / ends / trial / notified) so a
    // stale paid flag left over from the Lemon Squeezy era is fully wiped, not just hidden. A
    // real *paid* Clerk Billing subscriber should be cancelled in the Clerk dashboard instead —
    // their next billing event would re-set these anyway.
    const next: Record<string, unknown> = { ...m, subscribed };
    if (!subscribed) {
      for (const k of ["subStatus", "planName", "renewsAt", "endsAt", "trialEndsAt", "subscriptionId", "notified", "lsCustomerId", "portalUrl"]) {
        next[k] = undefined;
      }
    }
    await cc.users.updateUserMetadata(user.id, { publicMetadata: next });
    await logAudit({
      actor: ent.email, action: subscribed ? "grant_pro" : "revoke_pro",
      target: cleaned, detail: subscribed ? "comp Pro (no charge)" : "removed Pro",
    });
    revalidateTag("content", "max");
    return { ok: true, message: `${subscribed ? "Granted" : "Revoked"} Pro for ${cleaned}.` };
  } catch {
    return { ok: false, message: "Clerk request failed — is Clerk configured?" };
  }
}

// Let an admin preview the product as Pro or Free without paying (admins get Pro by default).
export async function setMyAdminTier(tier: "pro" | "free"): Promise<Result> {
  const ent = await requireAdmin();
  try {
    const user = await currentUser();
    if (!user) return { ok: false, message: "Not signed in." };
    const cc = await clerkClient();
    await cc.users.updateUserMetadata(user.id, {
      publicMetadata: { ...(user.publicMetadata || {}), adminTier: tier },
    });
    await logAudit({ actor: ent.email, action: "admin_tier", target: ent.email ?? user.id, detail: `preview as ${tier}` });
    return { ok: true, message: `Now previewing the ${tier === "free" ? "Free" : "Pro"} tier.` };
  } catch {
    return { ok: false, message: "Couldn't update — is Clerk configured?" };
  }
}
