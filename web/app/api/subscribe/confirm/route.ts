import { confirmByToken } from "@/lib/social";
import { htmlPage } from "@/lib/http";

export const dynamic = "force-dynamic";

// Double opt-in confirmation link target (from the subscribe email).
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const ok = await confirmByToken(token);
  return ok
    ? htmlPage("Subscription confirmed", "You're all set — we'll email you when new editions publish.")
    : htmlPage("Link expired", "That confirmation link is invalid or already used. Please subscribe again.");
}
