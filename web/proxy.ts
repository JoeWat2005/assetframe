// Next.js 16 renamed the `middleware` convention to `proxy`. Clerk attaches its
// auth context here so server components / route handlers can call auth()/currentUser().
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Report files require an account. Free Snapshots are static files under /r/...,
// Pro reports stream through /api/pro/... (gated in that route handler). The reader
// PAGE itself stays public so signed-out visitors still see a teaser + a sign-in
// prompt — but the underlying files are gated here so they can't be opened directly.
const isGatedFile = createRouteMatcher(["/r/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isGatedFile(req)) {
    const { userId } = await auth();
    if (!userId) {
      const url = new URL("/sign-in", req.url);
      url.searchParams.set("redirect_url", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }
});

export const config = {
  // Run on everything except static files and Next internals; include API routes AND
  // the /r report files (the default pattern excludes them by extension, so list them
  // explicitly so auth can gate the free Snapshots).
  matcher: [
    "/((?!_next|.*\\.[^/]+$).*)",
    "/(api|trpc)(.*)",
    "/r/(.*)",
  ],
};
