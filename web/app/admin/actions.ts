"use server";
import { revalidateTag } from "next/cache";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { getEntitlement } from "@/lib/entitlements";
import { logAudit } from "@/lib/audit";
import { cancelLemonSubscription } from "@/lib/lemonsqueezy";
import { sql } from "@/lib/db";

type Result = { ok: boolean; message: string };

// Every action re-checks admin server-side — never trust the client to gate this.
async function requireAdmin() {
  const ent = await getEntitlement();
  if (!ent.admin) throw new Error("Not authorized");
  return ent;
}

// Grant or revoke Pro for a member by email. Revoking a real subscriber ALSO cancels their
// Lemon Squeezy subscription (stops billing); revoking a comp just clears the flag.
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
    const subscriptionId = (m as { subscriptionId?: string }).subscriptionId;

    if (!subscribed && subscriptionId) {
      // Revoking a paying subscriber → cancel the LS subscription so billing stops. Access
      // continues to period end via the normal lifecycle (status → cancelled).
      const res = await cancelLemonSubscription(subscriptionId);
      await cc.users.updateUserMetadata(user.id, {
        publicMetadata: { ...m, subStatus: res.ok ? "cancelled" : (m as { subStatus?: string }).subStatus },
      });
      await logAudit({
        actor: ent.email, action: "revoke_pro", target: cleaned,
        detail: res.ok ? `cancelled LS subscription (${res.status})` : `LS cancel failed: ${res.reason}`,
      });
      revalidateTag("content", "max");
      return res.ok
        ? { ok: true, message: `Cancelled ${cleaned}'s subscription — Pro ends at period end.` }
        : { ok: false, message: `Couldn't cancel via Lemon Squeezy (${res.reason}). Check LEMONSQUEEZY_API_KEY.` };
    }

    // Grant a comp, or revoke a comp (no LS subscription) — just flip the flag.
    await cc.users.updateUserMetadata(user.id, { publicMetadata: { ...m, subscribed } });
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

// Unpublish (hide) or restore an edition. Hidden editions disappear from the public site,
// sitemap and reader, but stay in the DB. The report files in R2 are untouched.
export async function setEditionHidden(id: string, hidden: boolean): Promise<Result> {
  const ent = await requireAdmin();
  if (!sql) return { ok: false, message: "Database not configured." };
  if (!/^\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_-]+$/.test(id)) return { ok: false, message: "Bad edition id." };
  try {
    await sql.query(`UPDATE editions SET hidden = $2 WHERE id = $1`, [id, hidden]);
    await logAudit({
      actor: ent.email, action: hidden ? "unpublish_report" : "publish_report",
      target: id, detail: hidden ? "hidden from the public site" : "restored",
    });
    revalidateTag("content", "max");
    return { ok: true, message: hidden ? `Unpublished ${id}.` : `Restored ${id}.` };
  } catch {
    return { ok: false, message: "Database update failed." };
  }
}

// Force-refresh the content cache (catalog, track record, admin stats).
export async function revalidateContent(): Promise<Result> {
  const ent = await requireAdmin();
  revalidateTag("content", "max");
  await logAudit({ actor: ent.email, action: "revalidate", target: "content", detail: "manual cache bust" });
  return { ok: true, message: "Cleared the content cache — stats, catalog and track record will refresh." };
}

// Move a feedback submission through its lifecycle (new → triaged → planned → done/declined).
const FEEDBACK_STATUSES = ["new", "triaged", "planned", "done", "declined"];
export async function setFeedbackStatus(id: string, status: string): Promise<Result> {
  const ent = await requireAdmin();
  if (!sql) return { ok: false, message: "Database not configured." };
  if (!FEEDBACK_STATUSES.includes(status)) return { ok: false, message: "Bad status." };
  if (!/^\d+$/.test(id)) return { ok: false, message: "Bad feedback id." };
  try {
    await sql.query(`UPDATE feedback SET status = $2 WHERE id = $1`, [id, status]);
    await logAudit({ actor: ent.email, action: "feedback_status", target: `feedback#${id}`, detail: `→ ${status}` });
    return { ok: true, message: `Marked ${status}.` };
  } catch {
    return { ok: false, message: "Update failed." };
  }
}

// Search members by email or name (Clerk query). Returns up to 20 with their Pro status.
export async function searchMembers(
  query: string
): Promise<{ ok: boolean; members?: { id: string; email: string; subscribed: boolean }[]; message?: string }> {
  await requireAdmin();
  const q = (query || "").trim();
  if (!q) return { ok: true, members: [] };
  try {
    const cc = await clerkClient();
    const { data } = await cc.users.getUserList({ query: q, limit: 20 });
    return {
      ok: true,
      members: data.map((u) => ({
        id: u.id,
        email: u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ?? u.id,
        subscribed: (u.publicMetadata as { subscribed?: boolean })?.subscribed === true,
      })),
    };
  } catch {
    return { ok: false, message: "Clerk search failed — is Clerk configured?" };
  }
}
