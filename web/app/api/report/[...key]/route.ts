import { NextRequest, NextResponse } from "next/server";
import { getEntitlement } from "@/lib/entitlements";
import { signedReportUrl } from "@/lib/r2";
import { classifyReportKey } from "@/lib/report-key";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// All report files live in private Cloudflare R2 and are served only through this gated
// handler. Tiers: preview.png is PUBLIC (a marketing thumbnail, cacheable); free.* needs
// an account; pro.* needs a subscription. The handler validates the key against a strict
// allow-list, checks entitlement server-side, then 302-redirects to a short-lived signed
// R2 URL (bytes render on the R2 origin). Credentials never leave the server.
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ key: string[] }> }
) {
  const { key } = await ctx.params;
  const objectKey = (key ?? []).join("/");
  const tier = classifyReportKey(objectKey);
  if (!tier) return new NextResponse("Bad request", { status: 400 });

  if (tier !== "public") {
    const ent = await getEntitlement();
    if (!ent.signedIn) {
      const url = new URL("/sign-in", req.url);
      url.searchParams.set("redirect_url", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    if (tier === "pro" && !ent.subscribed) {
      return NextResponse.redirect(new URL("/pricing", req.url));
    }

    // Best-effort Pro-download logging, deduped per (user, report, kind) per hour so a
    // logged-in caller can't inflate the table / KPIs by hammering the route.
    if (tier === "pro" && sql) {
      const reportId = objectKey.split("/").slice(0, 2).join("/");
      const kind = objectKey.endsWith(".pdf") ? "pdf" : "html";
      try {
        await sql.query(
          `INSERT INTO download_log (report_id, kind, user_id)
           SELECT $1,$2,$3
           WHERE NOT EXISTS (
             SELECT 1 FROM download_log
             WHERE report_id = $1 AND kind = $2 AND user_id IS NOT DISTINCT FROM $3
               AND ts > now() - interval '1 hour'
           )`,
          [reportId, kind, ent.email ?? null]
        );
      } catch {
        /* logging is optional — a failure must not break the download */
      }
    }
  }

  // Public previews get a longer-lived signed URL + a cacheable redirect (they're just
  // thumbnails); gated files get a short URL and an uncacheable redirect.
  const signed = await signedReportUrl(objectKey, tier === "public" ? 600 : 120);
  if (!signed) {
    return new NextResponse("Report storage is not configured yet.", { status: 503 });
  }

  const res = NextResponse.redirect(signed, 302);
  res.headers.set(
    "Cache-Control",
    tier === "public" ? "public, max-age=300, s-maxage=300" : "private, no-store, max-age=0"
  );
  return res;
}
