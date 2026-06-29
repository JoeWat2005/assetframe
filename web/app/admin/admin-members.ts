"use server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "./admin-auth";

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
