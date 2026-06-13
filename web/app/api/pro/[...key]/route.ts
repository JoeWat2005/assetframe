import { NextRequest, NextResponse } from "next/server";
import { getEntitlement } from "@/lib/entitlements";
import { signedProUrl } from "@/lib/r2";
import { isValidProKey } from "@/lib/pro-key";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ key: string[] }> }
) {
  const ent = await getEntitlement();
  if (!ent.signedIn) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
  if (!ent.subscribed) {
    return NextResponse.redirect(new URL("/pricing", req.url));
  }

  const { key } = await ctx.params;
  const objectKey = (key ?? []).join("/");
  if (!isValidProKey(objectKey)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const url = await signedProUrl(objectKey);
  if (!url) {
    return new NextResponse("Pro storage is not configured yet.", { status: 503 });
  }
  // Redirect to a short-lived signed R2 URL. Never expose bucket credentials.
  return NextResponse.redirect(url, 302);
}
