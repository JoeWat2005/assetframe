"use server";
import { revalidateTag } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { getEntitlement } from "@/lib/entitlements";

// Every action re-checks admin server-side — never trust the client to gate this.
async function assertAdmin() {
  const ent = await getEntitlement();
  if (!ent.admin) throw new Error("Not authorized");
}

// Grant or revoke Pro for a member by email. Writes Clerk publicMetadata.subscribed
// (the same flag the Lemon Squeezy webhook sets), then busts the cached stats.
export async function setPro(
  email: string,
  subscribed: boolean
): Promise<{ ok: boolean; message: string }> {
  await assertAdmin();
  const cleaned = (email || "").trim().toLowerCase();
  if (!cleaned || !cleaned.includes("@")) return { ok: false, message: "Enter a valid email." };
  try {
    const cc = await clerkClient();
    const list = await cc.users.getUserList({ emailAddress: [cleaned], limit: 1 });
    const user = list.data[0];
    if (!user) return { ok: false, message: `No member found for ${cleaned}.` };
    await cc.users.updateUserMetadata(user.id, {
      publicMetadata: { ...(user.publicMetadata || {}), subscribed },
    });
    revalidateTag("content", "max");
    return { ok: true, message: `${subscribed ? "Granted" : "Revoked"} Pro for ${cleaned}.` };
  } catch {
    return { ok: false, message: "Clerk request failed — is Clerk configured?" };
  }
}

// Force-refresh the content cache (catalog, track record, admin stats) — handy right
// after publishing a new edition or syncing the DB.
export async function revalidateContent(): Promise<{ ok: boolean; message: string }> {
  await assertAdmin();
  revalidateTag("content", "max");
  return { ok: true, message: "Cleared the content cache — stats, catalog and track record will refresh." };
}
