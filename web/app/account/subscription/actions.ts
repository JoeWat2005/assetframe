"use server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { cancelLemonSubscription, resumeLemonSubscription, type CancelResult } from "@/lib/lemonsqueezy";

// Apply a billing action to the signed-in user's OWN subscription only (id read from their
// Clerk metadata — never from input), then optimistically mirror the new status. The webhook
// reconciles authoritatively a moment later.
async function applyToOwnSubscription(fn: (id: string) => Promise<CancelResult>): Promise<CancelResult> {
  const user = await currentUser();
  if (!user) return { ok: false, reason: "no-subscription" };
  const subscriptionId = (user.publicMetadata as { subscriptionId?: string })?.subscriptionId;
  if (!subscriptionId) return { ok: false, reason: "no-subscription" };

  const result = await fn(subscriptionId);
  if (result.ok) {
    try {
      const cc = await clerkClient();
      await cc.users.updateUserMetadata(user.id, {
        publicMetadata: { ...user.publicMetadata, subStatus: result.status },
      });
    } catch {
      /* the webhook will reconcile status shortly */
    }
    revalidatePath("/account/subscription");
  }
  return result;
}

export async function cancelMySubscription(): Promise<CancelResult> {
  return applyToOwnSubscription(cancelLemonSubscription);
}

export async function resumeMySubscription(): Promise<CancelResult> {
  return applyToOwnSubscription(resumeLemonSubscription);
}
