import { unsubscribeByToken } from "@/lib/social";
import { htmlPage } from "@/lib/http";

export const dynamic = "force-dynamic";

// One-click unsubscribe target (linked from every alert email's footer).
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const ok = await unsubscribeByToken(token);
  return ok
    ? htmlPage("Unsubscribed", "You won't receive any more AssetFrame emails. You can re-subscribe anytime.")
    : htmlPage("Link not found", "We couldn't find that subscription. It may already be removed.");
}
