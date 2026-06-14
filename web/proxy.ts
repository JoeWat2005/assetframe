// Next.js 16 renamed the `middleware` convention to `proxy`. Clerk attaches its
// auth context here so server components / route handlers can call auth()/currentUser().
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (auth, req) => {
  // Free Snapshot files are static under /r/... (public/). Reading any report needs an
  // account, so gate these here. Compared case-insensitively so /R/... can't slip past
  // (the static layer may be case-insensitive). The reader PAGE stays public (teaser +
  // sign-in prompt); only the files are gated.
  if (req.nextUrl.pathname.toLowerCase().startsWith("/r/")) {
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
  // the /r report files (both cases) so auth can gate the free Snapshots. The default
  // pattern excludes anything with a file extension, so /r files are listed explicitly.
  matcher: [
    "/((?!_next|.*\\.[^/]+$).*)",
    "/(api|trpc)(.*)",
    "/r/(.*)",
    "/R/(.*)",
  ],
};
